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
  // Solana / PumpFun
  'launches',
  'agentLaunches',
  'trades',
  'bondingCurve',
  'whales',
  'snipers',
  'claimsWallet',
  'claimsGithub',
  'claimsFirst',
  // Ethereum
  'ethSwaps',
  'ethTransfers',
  'ethMints',
  // Base
  'baseSwaps',
  'baseTransfers',
  'baseMints',
  // AI Agents
  'agentDeploys',
  'agentInteractions',
  'agentSpawn',
  'agentTask',
  'toolCall',
  'subagentSpawn',
  'reasoning',
  'taskComplete',
  'taskFailed',
  // ERC-8004
  'erc8004Mints',
  'erc8004Transfers',
  'erc8004Updates',
  // CEX
  'cexSpotTrades',
  'cexLiquidations',
] as const;

export type BuiltInCategory = (typeof CATEGORIES)[number];

/** Alias for use in consumer code — same as BuiltInCategory but can be extended */
export type CategoryId = BuiltInCategory | (string & {});

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
  { id: 'bondingCurve', label: 'Bonding Curve', icon: '\u2197', color: '#c084fc', sourceId: 'pumpfun' },
  { id: 'whales', label: 'Whale Trades', icon: '\u{1F40B}', color: '#38bdf8', sourceId: 'pumpfun' },
  { id: 'snipers', label: 'Sniper Buys', icon: '\u{1F3AF}', color: '#f97316', sourceId: 'pumpfun' },
  // Ethereum categories
  { id: 'ethSwaps', label: 'ETH Swaps', icon: '\u21C4', color: '#627EEA', sourceId: 'ethereum' },
  { id: 'ethTransfers', label: 'ETH Transfers', icon: '\u2192', color: '#8799EE', sourceId: 'ethereum' },
  { id: 'ethMints', label: 'ETH Mints', icon: '\u2726', color: '#4B6AE5', sourceId: 'ethereum' },
  // Base categories
  { id: 'baseSwaps', label: 'Base Swaps', icon: '\u21C4', color: '#0052FF', sourceId: 'base' },
  { id: 'baseTransfers', label: 'Base Transfers', icon: '\u2192', color: '#3377FF', sourceId: 'base' },
  { id: 'baseMints', label: 'Base Mints', icon: '\u2726', color: '#668FFF', sourceId: 'base' },
  // Agent categories
  { id: 'agentDeploys', label: 'Agent Deploys', icon: '\u2B23', color: '#ec4899', sourceId: 'agents' },
  { id: 'agentInteractions', label: 'Agent Interactions', icon: '\u2B22', color: '#f472b6', sourceId: 'agents' },
  { id: 'agentSpawn', label: 'Agent Spawns', icon: '\u2B21', color: '#c084fc', sourceId: 'agents' },
  { id: 'agentTask', label: 'Tasks', icon: '\u25B6', color: '#a78bfa', sourceId: 'agents' },
  { id: 'toolCall', label: 'Tool Calls', icon: '\u26A1', color: '#60a5fa', sourceId: 'agents' },
  { id: 'subagentSpawn', label: 'Sub-agents', icon: '\u25C6', color: '#f472b6', sourceId: 'agents' },
  { id: 'reasoning', label: 'Reasoning', icon: '\u25CE', color: '#fbbf24', sourceId: 'agents' },
  { id: 'taskComplete', label: 'Completions', icon: '\u2713', color: '#34d399', sourceId: 'agents' },
  { id: 'taskFailed', label: 'Failures', icon: '\u2717', color: '#f87171', sourceId: 'agents' },
  // ERC-8004 categories
  { id: 'erc8004Mints', label: 'Asset Mints', icon: '\u25C8', color: '#00BCD4', sourceId: 'erc8004' },
  { id: 'erc8004Transfers', label: 'Asset Transfers', icon: '\u25C7', color: '#26C6DA', sourceId: 'erc8004' },
  { id: 'erc8004Updates', label: 'Metadata Updates', icon: '\u21BB', color: '#00ACC1', sourceId: 'erc8004' },
  // CEX categories
  { id: 'cexSpotTrades', label: 'CEX Spot Trades', icon: '\u25CF', color: '#fbbf24', sourceId: 'cex' },
  { id: 'cexLiquidations', label: 'CEX Liquidations', icon: '\u2716', color: '#f59e0b', sourceId: 'cex' },
];

export const CATEGORY_CONFIG_MAP = Object.fromEntries(
  CATEGORY_CONFIGS.map((c) => [c.sourceId ? `${c.sourceId}:${c.id}` : c.id, c]),
) as Record<string, CategoryConfig>;

/** Simple lookup by category id only (first match wins) */
export const CATEGORY_BY_ID = Object.fromEntries(
  [...CATEGORY_CONFIGS].reverse().map((c) => [c.id, c]),
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
