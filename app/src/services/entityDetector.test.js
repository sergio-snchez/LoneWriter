import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Dexie db
vi.mock('../db/database', () => ({
  db: {
    characters: { where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })) },
    locations: { where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })) },
    objects: { where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })) },
    lore: { where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })) },
    resources: { where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })) },
  },
}));

// Mock stopwords
vi.mock('../i18n/stopwords', () => ({
  getEntityStopWordsWithCustom: vi.fn(() => Promise.resolve(new Set())),
  getEntityStopWords: vi.fn(() => Promise.resolve(new Set())),
}));

// Import only the pure functions we can test directly
import {
  detectEntitiesInText,
  parseOracleResponse,
  findSimilarEntities,
} from './entityDetector';

// ─── detectEntitiesInText ──────────────────────────────────────────────────────

describe('detectEntitiesInText', () => {
  const entityData = {
    characters: [
      { name: 'Ana', role: 'protagonist', description: 'Brave girl' },
      { name: 'Carlos', role: 'antagonist', traits: ['evil', 'powerful'] },
    ],
    locations: [
      { name: 'Valle Verde', type: 'rural', climate: 'temperate' },
    ],
  };

  it('detects a character by critical field name', () => {
    const result = detectEntitiesInText('Ana walked through the forest', entityData);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Ana');
    expect(result[0].type).toBe('characters');
    expect(result[0].severity).toBe('critical');
  });

  it('detects by critical field (role, trait)', () => {
    const result = detectEntitiesInText('protagonist', entityData);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Ana');
    expect(result[0].severity).toBe('critical');
  });

  it('detects by trait word', () => {
    const result = detectEntitiesInText('evil', entityData);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Carlos');
  });

  it('matches multi-word entity names', () => {
    const result = detectEntitiesInText('valle verde', entityData);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valle Verde');
  });

  it('returns empty array for null/undefined text', () => {
    expect(detectEntitiesInText(null, entityData)).toEqual([]);
    expect(detectEntitiesInText(undefined, entityData)).toEqual([]);
    expect(detectEntitiesInText('', entityData)).toEqual([]);
  });

  it('returns empty array for null entityData', () => {
    expect(detectEntitiesInText('some text', null)).toEqual([]);
  });

  it('returns empty when nothing matches', () => {
    const result = detectEntitiesInText('nothing matches here', entityData);
    expect(result).toEqual([]);
  });

  it('respects custom stop words', () => {
    const stopWords = new Set(['ana']);
    const result = detectEntitiesInText('Ana is here', entityData, stopWords);
    expect(result).toHaveLength(0); // 'ana' is filtered out by stopWords
  });

  it('does not duplicate detections', () => {
    const result = detectEntitiesInText('Ana and Carlos and Ana again', entityData);
    expect(result).toHaveLength(2);
  });
});

// ─── parseOracleResponse ───────────────────────────────────────────────────────

describe('parseOracleResponse', () => {
  it('parses valid JSON with contradiction', () => {
    const result = parseOracleResponse('{"hasContradiction": true, "message": "Found issue"}');
    expect(result.hasContradiction).toBe(true);
    expect(result.message).toBe('Found issue');
  });

  it('parses valid JSON without contradiction', () => {
    const result = parseOracleResponse('{"hasContradiction": false}');
    expect(result.hasContradiction).toBe(false);
  });

  it('falls back to keyword detection for non-JSON text', () => {
    const result = parseOracleResponse('Hay una contradicción en el texto');
    expect(result.hasContradiction).toBe(true);
  });

  it('returns false for benign text', () => {
    const result = parseOracleResponse('Todo está correcto');
    expect(result.hasContradiction).toBe(false);
    expect(result.message).toBe('Todo está correcto');
  });

  it('handles null/empty input', () => {
    expect(parseOracleResponse(null)).toEqual({ hasContradiction: false, message: '' });
    expect(parseOracleResponse('')).toEqual({ hasContradiction: false, message: '' });
  });

  it('extracts JSON from markdown-wrapped response', () => {
    const result = parseOracleResponse('Some text\n{"hasContradiction": true}\nmore text');
    expect(result.hasContradiction).toBe(true);
  });
});

// ─── findSimilarEntities ────────────────────────────────────────────────────────

describe('findSimilarEntities', () => {
  const items = [
    { name: 'Ana López', description: 'Heroine' },
    { name: 'Ana Lopez', description: 'Heroine duplicate' },
    { name: 'Carlos Ruiz', description: 'Villain' },
    { name: 'Maria', description: 'Support' },
  ];

  it('finds similar pairs above threshold', async () => {
    const result = await findSimilarEntities(items, 0.5);
    expect(result.pairs.length).toBeGreaterThanOrEqual(1);
    // Ana López and Ana Lopez should be highly similar
    const anaPair = result.pairs.find(p => p.name1.includes('Ana') && p.name2.includes('Ana'));
    expect(anaPair).toBeDefined();
    expect(anaPair.similarity).toBeGreaterThan(0.5);
  });

  it('returns empty for <2 items', async () => {
    expect(await findSimilarEntities([])).toEqual([]);
    expect(await findSimilarEntities([{ name: 'Solo' }])).toEqual([]);
    expect(await findSimilarEntities(null)).toEqual([]);
  });

  it('returns groups of similar entities', async () => {
    const result = await findSimilarEntities(items, 0.5);
    expect(result.groups).toBeDefined();
  });

  it('returns empty results for very high threshold', async () => {
    const result = await findSimilarEntities(items, 0.99);
    // When no pairs found, returns [] directly (not {pairs, groups})
    expect(result).toEqual([]);
  });
});
