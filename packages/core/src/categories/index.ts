// ============================================================================
// @web3viz/core — Category System
//
// Protocol/event categories with colors, icons, and labels.
// Fully extensible — consumers can add their own categories.
// ============================================================================

// ---------------------------------------------------------------------------
// Source configuration (each data provider/plugin)
// ---------------------------------------------------------------------------

export interface SourceConfig {
  id: string;
  label: string;
  /** Brand color for this source */
  color: string;
  /** Monospace-safe icon character */
  icon: string;
  /** Short description shown in UI */
  description?: string;
}

/** Built-in data sources */
export const SOURCE_CONFIGS: SourceConfig[] = [
  { id: 'pumpfun', label: 'PumpFun', color: '#a78bfa', icon: '\u26A1', description: 'Solana token launches & trades' },
  { id: 'ethereum', label: 'Ethereum', color: '#60a5fa', icon: '\u25C6', description: 'Ethereum mainnet activity' },
  { id: 'base', label: 'Base', color: '#3b82f6', icon: '\u25B2', description: 'Base L2 transactions' },
  { id: 'agents', label: 'AI Agents', color: '#f472b6', icon: '\u2B23', description: 'Autonomous AI agent activity' },
  { id: 'erc8004', label: 'ERC-8004', color: '#34d399', icon: '\u2B22', description: 'ERC-8004 native asset issuance' },
  { id: 'cex', label: 'CEX Volume', color: '#fbbf24', icon: '\u25CF', description: 'Centralized exchange volume' },
];

export const SOURCE_CONFIG_MAP = Object.fromEntries(
  SOURCE_CONFIGS.map((s) => [s.id, s]),
) as Record<string, SourceConfig>;

// ---------------------------------------------------------------------------
// Built-in category IDs (per-source event types)
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  'launches',
  'agentLaunches',
  'trades',
  'swaps',
  'transfers',
  'mints',
  'burns',
  'volume',
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
  /** Optional: restrict this category to a specific source */
  sourceId?: string;
}

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  // PumpFun categories
  { id: 'launches', label: 'Launches', icon: '\u26A1', color: '#a78bfa', sourceId: 'pumpfun' },
  { id: 'agentLaunches', label: 'Agent Launches', icon: '\u2B23', color: '#f472b6', sourceId: 'pumpfun' },
  { id: 'trades', label: 'Trades', icon: '\u25B2', color: '#60a5fa', sourceId: 'pumpfun' },
  { id: 'claimsWallet', label: 'Wallet Claims', icon: '\u25C6', color: '#fbbf24', sourceId: 'pumpfun' },
  { id: 'claimsGithub', label: 'GitHub Claims', icon: '\u2B22', color: '#34d399', sourceId: 'pumpfun' },
  { id: 'claimsFirst', label: 'First Claims', icon: '\u2605', color: '#f87171', sourceId: 'pumpfun' },
  // Ethereum categories
  { id: 'swaps', label: 'Swaps', icon: '\u21C4', color: '#60a5fa', sourceId: 'ethereum' },
  { id: 'transfers', label: 'Transfers', icon: '\u2192', color: '#818cf8', sourceId: 'ethereum' },
  // Base categories
  { id: 'swaps', label: 'Swaps', icon: '\u21C4', color: '#3b82f6', sourceId: 'base' },
  { id: 'mints', label: 'Mints', icon: '\u2726', color: '#22d3ee', sourceId: 'base' },
  // Agent categories
  { id: 'trades', label: 'Agent Trades', icon: '\u2B23', color: '#f472b6', sourceId: 'agents' },
  // ERC-8004 categories
  { id: 'mints', label: 'Issuance', icon: '\u2B22', color: '#34d399', sourceId: 'erc8004' },
  { id: 'burns', label: 'Burns', icon: '\u2716', color: '#f87171', sourceId: 'erc8004' },
  // CEX categories
  { id: 'volume', label: 'Volume', icon: '\u25CF', color: '#fbbf24', sourceId: 'cex' },
];

export const CATEGORY_CONFIG_MAP = Object.fromEntries(
  CATEGORY_CONFIGS.map((c) => [c.sourceId ? `${c.sourceId}:${c.id}` : c.id, c]),
) as Record<string, CategoryConfig>;

/** Get categories for a specific source */
export function getCategoriesForSource(sourceId: string): CategoryConfig[] {
  return CATEGORY_CONFIGS.filter((c) => c.sourceId === sourceId);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a custom category config */
export function createCategory(config: CategoryConfig): CategoryConfig {
  return config;
}

/** Create a custom source config */
export function createSource(config: SourceConfig): SourceConfig {
  return config;
}

/** Merge custom categories with defaults */
export function mergeCategories(
  defaults: CategoryConfig[],
  custom: CategoryConfig[],
): CategoryConfig[] {
  const merged = [...defaults];
  const existingIds = new Set(defaults.map((c) => c.sourceId ? `${c.sourceId}:${c.id}` : c.id));
  for (const c of custom) {
    const key = c.sourceId ? `${c.sourceId}:${c.id}` : c.id;
    if (existingIds.has(key)) {
      const idx = merged.findIndex((m) => (m.sourceId ? `${m.sourceId}:${m.id}` : m.id) === key);
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
  return Object.fromEntries(
    categories.map((c) => [c.sourceId ? `${c.sourceId}:${c.id}` : c.id, c]),
  );
}
