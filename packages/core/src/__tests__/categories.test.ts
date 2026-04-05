import { describe, it, expect } from 'vitest';
import {
  CATEGORIES,
  CATEGORY_CONFIGS,
  SOURCE_CONFIGS,
  CATEGORY_CONFIG_MAP,
  CATEGORY_BY_ID,
  getCategoriesForSource,
  createCategory,
  createSource,
  mergeCategories,
  buildCategoryMap,
} from '../categories';

describe('CATEGORIES', () => {
  it('contains expected categories', () => {
    expect(CATEGORIES).toContain('launches');
    expect(CATEGORIES).toContain('trades');
    expect(CATEGORIES).toContain('ethSwaps');
    expect(CATEGORIES).toContain('agentDeploys');
    expect(CATEGORIES).toContain('erc8004Mints');
    expect(CATEGORIES).toContain('cexSpotTrades');
  });
});

describe('SOURCE_CONFIGS', () => {
  it('includes all built-in sources', () => {
    const ids = SOURCE_CONFIGS.map((s) => s.id);
    expect(ids).toContain('pumpfun');
    expect(ids).toContain('ethereum');
    expect(ids).toContain('base');
    expect(ids).toContain('agents');
    expect(ids).toContain('erc8004');
    expect(ids).toContain('cex');
  });

  it('has required fields on each source', () => {
    for (const source of SOURCE_CONFIGS) {
      expect(source.id).toBeTruthy();
      expect(source.label).toBeTruthy();
      expect(source.color).toBeTruthy();
      expect(source.icon).toBeTruthy();
    }
  });
});

describe('getCategoriesForSource', () => {
  it('returns pumpfun categories', () => {
    const cats = getCategoriesForSource('pumpfun');
    expect(cats.length).toBeGreaterThan(0);
    expect(cats.every((c) => c.sourceId === 'pumpfun')).toBe(true);
  });

  it('returns ethereum categories', () => {
    const cats = getCategoriesForSource('ethereum');
    expect(cats).toHaveLength(3);
  });

  it('returns empty for unknown source', () => {
    expect(getCategoriesForSource('unknown')).toHaveLength(0);
  });
});

describe('CATEGORY_CONFIG_MAP', () => {
  it('maps composite keys (sourceId:categoryId)', () => {
    expect(CATEGORY_CONFIG_MAP['pumpfun:launches']).toBeDefined();
    expect(CATEGORY_CONFIG_MAP['pumpfun:launches'].label).toBe('Launches');
    expect(CATEGORY_CONFIG_MAP['ethereum:ethSwaps']).toBeDefined();
  });
});

describe('CATEGORY_BY_ID', () => {
  it('maps by category id', () => {
    expect(CATEGORY_BY_ID['launches']).toBeDefined();
    expect(CATEGORY_BY_ID['ethSwaps']).toBeDefined();
    expect(CATEGORY_BY_ID['agentDeploys']).toBeDefined();
  });
});

describe('createCategory', () => {
  it('returns the config unchanged', () => {
    const config = { id: 'test', label: 'Test', icon: '!', color: '#fff' };
    expect(createCategory(config)).toEqual(config);
  });
});

describe('createSource', () => {
  it('returns the source config unchanged', () => {
    const config = { id: 'test', label: 'Test', color: '#fff', icon: '!' };
    expect(createSource(config)).toEqual(config);
  });
});

describe('mergeCategories', () => {
  const defaults = CATEGORY_CONFIGS;

  it('adds new categories', () => {
    const custom = [{ id: 'custom', label: 'Custom', icon: '?', color: '#000' }];
    const merged = mergeCategories(defaults, custom);
    expect(merged.length).toBe(defaults.length + 1);
    expect(merged.find((c) => c.id === 'custom')).toBeDefined();
  });

  it('overrides existing categories', () => {
    const custom = [{ id: 'launches', label: 'Custom Launches', icon: '!', color: '#f00', sourceId: 'pumpfun' }];
    const merged = mergeCategories(defaults, custom);
    expect(merged.length).toBe(defaults.length);
    const launches = merged.find((c) => c.id === 'launches' && c.sourceId === 'pumpfun');
    expect(launches?.label).toBe('Custom Launches');
  });

  it('does not mutate defaults', () => {
    const originalLength = defaults.length;
    mergeCategories(defaults, [{ id: 'new', label: 'New', icon: '!', color: '#000' }]);
    expect(defaults.length).toBe(originalLength);
  });
});

describe('buildCategoryMap', () => {
  it('builds a map from categories', () => {
    const categories = [
      { id: 'a', label: 'A', icon: '1', color: '#111', sourceId: 'src' },
      { id: 'b', label: 'B', icon: '2', color: '#222' },
    ];
    const map = buildCategoryMap(categories);
    expect(map['src:a']).toBeDefined();
    expect(map['b']).toBeDefined();
    expect(map['src:a'].label).toBe('A');
  });
});
