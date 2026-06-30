import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────────

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

// Mock html-to-docx
vi.mock('html-to-docx', () => ({
  default: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
}));

// Mock pako — must provide `default` because import pako from 'pako' expects it
const { mockGzip, mockUngzip } = vi.hoisted(() => ({
  mockGzip: vi.fn((data) => {
    // Prefix with 4-byte fake GZIP header so ungzip can strip it
    return new Uint8Array([71, 90, 73, 80, ...data]);
  }),
  mockUngzip: vi.fn((bytes) => bytes.slice(4)),
}));

vi.mock('pako', () => ({
  default: { gzip: mockGzip, ungzip: mockUngzip },
  gzip: mockGzip,
  ungzip: mockUngzip,
}));

// Mock Dexie db
const { mockRestoreTables } = vi.hoisted(() => ({
  mockRestoreTables: vi.fn(),
}));
vi.mock('../db/database', () => ({
  db: {
    tables: [
      { name: 'novels', toArray: vi.fn(() => Promise.resolve([{ title: 'Test Novel' }])), clear: vi.fn(), bulkAdd: vi.fn() },
      { name: 'scenes', toArray: vi.fn(() => Promise.resolve([{ id: 1, title: 'Scene 1' }])), clear: vi.fn(), bulkAdd: vi.fn() },
      { name: 'editorPrefs', toArray: vi.fn(() => Promise.resolve([{ theme: 'dark' }])), clear: vi.fn(), bulkAdd: vi.fn() },
    ],
    transaction: vi.fn((mode, tables, callback) => callback()),
  },
  restoreTables: mockRestoreTables,
}));

import { compressToJson, decodeFromLwrt, encryptPayload, decryptPayload, ExportService } from './exportService';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const sampleData = { name: 'Test', items: [1, 2, 3] };
const sampleJson = JSON.stringify(sampleData);

describe('compressToJson', () => {
  it('returns a string starting with LWRT_V1', async () => {
    const result = await compressToJson(sampleData);
    expect(result).toBeTypeOf('string');
    expect(result.startsWith('LWRT_V1')).toBe(true);
  });

  it('produces different output for different inputs', async () => {
    const a = await compressToJson({ x: 1 });
    const b = await compressToJson({ x: 2 });
    expect(a).not.toBe(b);
  });
});

describe('decodeFromLwrt', () => {
  it('roundtrips with compressToJson', async () => {
    const compressed = await compressToJson(sampleData);
    const decoded = await decodeFromLwrt(compressed);
    expect(decoded).toEqual(sampleData);
  });

  it('handles plain JSON', async () => {
    const decoded = await decodeFromLwrt(sampleJson);
    expect(decoded).toEqual(sampleData);
  });

  it('throws ENCRYPTED when encrypted file has no password', async () => {
    await expect(decodeFromLwrt('LWRT_V1_ENCxxxx')).rejects.toThrow('ENCRYPTED');
  });

  it('throws WRONG_PASSWORD on bad decryption', async () => {
    // Mock crypto.subtle to throw on decrypt
    const originalDecrypt = window.crypto.subtle.decrypt;
    window.crypto.subtle.decrypt = vi.fn(() => Promise.reject(new Error()));

    // We need to provide a valid-looking encrypted payload structure
    const fakeEncrypted = 'LWRT_V1_ENC' + btoa('x'.repeat(16 + 12 + 16)); // salt + iv + ciphertext

    await expect(decodeFromLwrt(fakeEncrypted, 'wrong-password')).rejects.toThrow('WRONG_PASSWORD');

    window.crypto.subtle.decrypt = originalDecrypt;
  });
});

describe('encryptPayload / decryptPayload', () => {
  const PASSWORD = 'my-secret-password';
  const PLAINTEXT = JSON.stringify({ name: 'Known Answer Test', value: 42 });

  it('roundtrips encrypt then decrypt', async () => {
    const encrypted = await encryptPayload(PLAINTEXT, PASSWORD);
    expect(encrypted).toMatch(/^LWRT_V1_ENC/);

    const decrypted = await decryptPayload(encrypted, PASSWORD);
    expect(decrypted).toBe(PLAINTEXT);
  });

  it('produces different ciphertexts on each call (random salt/iv)', async () => {
    const a = await encryptPayload(PLAINTEXT, PASSWORD);
    const b = await encryptPayload(PLAINTEXT, PASSWORD);
    expect(a).not.toBe(b);
  });

  it('throws WRONG_PASSWORD with incorrect password', async () => {
    const encrypted = await encryptPayload(PLAINTEXT, PASSWORD);
    await expect(decryptPayload(encrypted, 'wrong-password')).rejects.toThrow('WRONG_PASSWORD');
  });

  it('throws WRONG_PASSWORD on corrupted ciphertext', async () => {
    const encrypted = await encryptPayload(PLAINTEXT, PASSWORD);
    const corrupted = encrypted.slice(0, -4); // truncate last 4 bytes (auth tag)
    await expect(decryptPayload(corrupted, PASSWORD)).rejects.toThrow('WRONG_PASSWORD');
  });

  it('handles empty string as plaintext', async () => {
    const encrypted = await encryptPayload('', PASSWORD);
    const decrypted = await decryptPayload(encrypted, PASSWORD);
    expect(decrypted).toBe('');
  });

  it('handles empty password', async () => {
    const encrypted = await encryptPayload(PLAINTEXT, '');
    const decrypted = await decryptPayload(encrypted, '');
    expect(decrypted).toBe(PLAINTEXT);
  });
});

describe('ExportService.exportToWord', () => {
  it('returns true on success', async () => {
    const result = await ExportService.exportToWord('Test', '<p>Hello</p>', 'Empty');
    expect(result).toBe(true);
  });

  it('throws for empty content', async () => {
    await expect(ExportService.exportToWord('Test', '<p></p>', 'Empty')).rejects.toThrow('SCENE_EMPTY');
    await expect(ExportService.exportToWord('Test', '', 'Empty')).rejects.toThrow('SCENE_EMPTY');
    await expect(ExportService.exportToWord('Test', '   ', 'Empty')).rejects.toThrow('SCENE_EMPTY');
  });
});

describe('ExportService.exportFullNovel', () => {
  it('returns true on success', async () => {
    const novel = { title: 'My Novel', author: 'Me' };
    const acts = [
      {
        title: 'Act 1',
        chapters: [
          {
            number: 1,
            title: 'Chapter 1',
            scenes: [{ title: 'Scene 1', content: '<p>Text</p>', pov: 'Hero' }],
          },
        ],
      },
    ];
    const result = await ExportService.exportFullNovel(novel, acts, {});
    expect(result).toBe(true);
  });

  it('throws when no novel is provided', async () => {
    await expect(ExportService.exportFullNovel(null, [], {})).rejects.toThrow('NO_ACTIVE_NOVEL');
  });
});

describe('ExportService.exportProject', () => {
  it('returns true and compresses project data', async () => {
    const result = await ExportService.exportProject();
    expect(result).toBe(true);
  });

  it('excludes device-only tables', async () => {
    const { db } = await import('../db/database');
    const result = await ExportService.exportProject();
    // Should not include editorPrefs in the export payload
    expect(db.tables[2].toArray).not.toHaveBeenCalled(); // editorPrefs is excluded
    expect(result).toBe(true);
  });

  it('accepts optional password', async () => {
    const result = await ExportService.exportProject('secret');
    expect(result).toBe(true);
  });
});

describe('ExportService.importProject', () => {
  it('rejects file with valid JSON but missing tables field', async () => {
    const file = new File([JSON.stringify({ version: 1 })], 'test.lwrt');
    await expect(ExportService.importProject(file)).rejects.toThrow('INVALID_FORMAT');
  });

  it('rejects invalid JSON content', async () => {
    const file = new File(['not-valid-json'], 'test.lwrt');
    await expect(ExportService.importProject(file)).rejects.toThrow();
  });

  it('imports a valid .lwrt file', async () => {
    // Create a compressed payload with proper structure
    const compressed = await compressToJson({
      version: 1,
      tables: { novels: [{ id: 1, title: 'Imported' }] },
    });
    const file = new File([compressed], 'test.lwrt');
    const result = await ExportService.importProject(file);
    expect(result).toBe(true);
  });
});
