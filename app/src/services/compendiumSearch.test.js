import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock stopwords returns a Set with common Spanish stop words
vi.mock('../i18n/stopwords', () => ({
  getSearchStopWords: vi.fn(() => new Set(['el', 'la', 'los', 'las', 'de', 'del', 'y', 'a', 'en', 'un', 'una', 'que', 'es', 'por', 'lo', 'con', 'para', 'su', 'al', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'este', 'entre', 'porque', 'ese', 'todo', 'sin', 'ella', 'ella', 'cuando', 'muy', 'sin', 'sobre', 'también', 'mente', 'hasta', 'donde', 'quien', 'aunque', 'cual', 'allí', 'durante', 'antes', 'si', 'no', 'me', 'te', 'se', 'nos', 'os', 'lo', 'le'])),
}));

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

import {
  extractKeywords,
  formatSearchResults,
  searchCompendium,
  fetchDetectedEntityData,
  createDebouncedSearch,
} from './compendiumSearch';

// ─── extractKeywords ────────────────────────────────────────────────────────────

describe('extractKeywords', () => {
  it('extracts meaningful keywords from text', () => {
    const result = extractKeywords('El valle verde y la montaña');
    expect(result).toContain('valle');
    expect(result).toContain('verde');
    expect(result).toContain('montaña');
    // Stop words 'el', 'y', 'la' should be excluded
    expect(result).not.toContain('el');
    expect(result).not.toContain('y');
  });

  it('returns empty array for null/undefined', () => {
    expect(extractKeywords(null)).toEqual([]);
    expect(extractKeywords(undefined)).toEqual([]);
  });

  it('excludes tokens shorter than 3 characters', () => {
    const result = extractKeywords('un perro y un gato');
    expect(result).toContain('perro');
    expect(result).toContain('gato');
    expect(result).not.toContain('un'); // too short AND stop word
    expect(result).not.toContain('y');  // too short AND stop word
  });

  it('removes duplicates', () => {
    const result = extractKeywords('casa casa casa');
    expect(result).toEqual(['casa']);
  });

  it('handles mixed punctuation', () => {
    const result = extractKeywords('¡Hola, mundo! ¿Cómo estás?');
    expect(result).toContain('hola');
    expect(result).toContain('mundo');
    expect(result).toContain('cómo');
    expect(result).toContain('estás');
  });
});

// ─── formatSearchResults ────────────────────────────────────────────────────────

describe('formatSearchResults', () => {
  it('formats results correctly with category and description', () => {
    const results = [
      { category: 'PERSONAJE', name: 'Ana', description: 'Brave heroine' },
      { category: 'LOCALIZACIÓN', name: 'Valle Verde', description: 'Temperate valley' },
    ];
    const formatted = formatSearchResults(results);
    expect(formatted).toContain('[PERSONAJE]: Ana - Brave heroine');
    expect(formatted).toContain('[LOCALIZACIÓN]: Valle Verde - Temperate valley');
  });

  it('returns empty string for empty/null results', () => {
    expect(formatSearchResults([])).toBe('');
    expect(formatSearchResults(null)).toBe('');
    expect(formatSearchResults(undefined)).toBe('');
  });
});

// ─── searchCompendium (with mocked db) ──────────────────────────────────────────

describe('searchCompendium', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array for no keywords', async () => {
    expect(await searchCompendium([], 1)).toEqual([]);
    expect(await searchCompendium(null, 1)).toEqual([]);
    expect(await searchCompendium(['test'], null)).toEqual([]);
    expect(await searchCompendium(['test'], undefined)).toEqual([]);
  });

  it('scores and sorts results', async () => {
    // Override mock for this test
    const { db } = await import('../db/database');
    db.characters.where.mockReturnValue({
      equals: vi.fn(() => ({
        toArray: vi.fn(() => Promise.resolve([
          { name: 'Ana', role: 'heroine', description: 'A brave heroine', traits: ['brave'] },
          { name: 'Carlos', role: 'villain', description: 'An evil villain' },
        ])),
      })),
    });

    const results = await searchCompendium(['heroine'], 1);
    expect(results.length).toBeGreaterThanOrEqual(1);
    // Ana should match "heroine" in role and "heroine" in description
    expect(results[0].name).toBe('Ana');
    expect(results[0].table).toBe('characters');
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('searches across multiple tables', async () => {
    const { db } = await import('../db/database');

    db.characters.where.mockReturnValue({
      equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })),
    });
    db.locations.where.mockReturnValue({
      equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([
        { name: 'Valle Verde', type: 'valle', climate: 'temperate' },
      ])) })),
    });
    db.objects.where.mockReturnValue({
      equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })),
    });
    db.lore.where.mockReturnValue({
      equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })),
    });
    db.resources.where.mockReturnValue({
      equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })),
    });

    const results = await searchCompendium(['valle'], 1);
    expect(results).toHaveLength(1);
    expect(results[0].table).toBe('locations');
    expect(results[0].name).toBe('Valle Verde');
  });
});

// ─── fetchDetectedEntityData ───────────────────────────────────────────────────

describe('fetchDetectedEntityData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty string for empty detected entities', async () => {
    expect(await fetchDetectedEntityData([], 1)).toBe('');
    expect(await fetchDetectedEntityData(null, 1)).toBe('');
    expect(await fetchDetectedEntityData([{ type: 'characters', name: 'Ana' }], null)).toBe('');
  });

  it('fetches matching entity details', async () => {
    const { db } = await import('../db/database');
    db.characters.where.mockReturnValue({
      equals: vi.fn(() => ({
        toArray: vi.fn(() => Promise.resolve([
          { name: 'Ana', role: 'heroine', description: 'A brave heroine', traits: ['brave'] },
        ])),
      })),
    });

    const result = await fetchDetectedEntityData(
      [{ type: 'characters', name: 'Ana' }],
      1,
    );
    expect(result).toContain('Ana');
    expect(result).toContain('heroine');
  });

  it('skips entity types that have no config', async () => {
    const result = await fetchDetectedEntityData(
      [{ type: 'nonexistent', name: 'Test' }],
      1,
    );
    expect(result).toBe('');
  });
});

// ─── createDebouncedSearch ──────────────────────────────────────────────────────

describe('createDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a debounced search function with cancel', () => {
    const debounced = createDebouncedSearch(400);
    expect(typeof debounced).toBe('function');
    expect(typeof debounced.cancel).toBe('function');
  });

  it('cancels a pending search', async () => {
    const debounced = createDebouncedSearch(400);
    const promise = debounced('test text', 1);

    debounced.cancel();

    await expect(promise).rejects.toThrow('Search cancelled');
  });

  it('resolves after the delay', async () => {
    const debounced = createDebouncedSearch(100);
    const promise = debounced('test text', 1);

    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result).toBeDefined();
    expect(result.keywords).toBeDefined();
    expect(result.results).toBeDefined();
    expect(result.formatted).toBeDefined();
  });
});
