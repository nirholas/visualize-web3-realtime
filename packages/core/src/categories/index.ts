// ============================================================================
// @web3viz/core — Category System
//
// Protocol/event categories with colors, icons, and labels.
// Fully extensible — consumers can add their own categories.
// ============================================================================

// ---------------------------------------------------------------------------
// Built-in category IDs
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  'launches',
  'agentLaunches',
  'trades',
  'claimsWallet',
  'claimsGithub',
  'claimsFirst',
] as const;

export type BuiltInCategory = (typeof CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Category configuration
// ---------------------------------------------------------------------------

export interface CategoryConfig {
  id: string;
  label: string;
  /** Monospace-safe icon character */
  icon: string;
  color: string;
}

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  { id: 'launches', label: 'Launches', icon: '\u26A1', color: '#a78bfa' },
  { id: 'agentLaunches', label: 'Agent Launches', icon: '\u2B23', color: '#f472b6' },
  { id: 'trades', label: 'Trades', icon: '\u25B2', color: '#60a5fa' },
  { id: 'claimsWallet', label: 'Wallet Claims', icon: '\u25C6', color: '#fbbf24' },
  { id: 'claimsGithub', label: 'GitHub Claims', icon: '\u2B22', color: '#34d399' },
  { id: 'claimsFirst', label: 'First Claims', icon: '\u2605', color: '#f87171' },
];

export const CATEGORY_CONFIG_MAP = Object.fromEntries(
  CATEGORY_CONFIGS.map((c) => [c.id, c]),
) as Record<string, CategoryConfig>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a custom category config */
export function createCategory(config: CategoryConfig): CategoryConfig {
  return config;
}

/** Merge custom categories with defaults */
export function mergeCategories(
  defaults: CategoryConfig[],
  custom: CategoryConfig[],
): CategoryConfig[] {
  const merged = [...defaults];
  const existingIds = new Set(defaults.map((c) => c.id));
  for (const c of custom) {
    if (existingIds.has(c.id)) {
      const idx = merged.findIndex((m) => m.id === c.id);
      if (idx >= 0) merged[idx] = c;
    } else {
      merged.push(c);
    }
  }
  return merged;
}

/** Build a lookup map from an array of categories */
export function buildCategoryMap(
  categories: CategoryConfig[],
): Record<string, CategoryConfig> {
  return Object.fromEntries(categories.map((c) => [c.id, c]));
}
