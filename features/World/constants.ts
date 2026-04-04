/**
 * Protocol color palette and graph configuration constants.
 */

export const COLOR_PALETTE = [
  '#3d63ff', // Blue
  '#b6509e', // Purple
  '#00d395', // Green
  '#00b88d', // Teal
  '#00b3ff', // Cyan
  '#2f6bff', // Royal blue
  '#ff6b35', // Orange
  '#e84393', // Pink
] as const;

export const PROTOCOL_COLORS = {
  default: '#a0c4ff',
  highlight: '#3d63ff',
  agentDefault: '#7dd3fc',
} as const;

export const CHAIN_COLORS: Record<string, string> = {
  solana: '#9945FF',
  ethereum: '#627EEA',
  base: '#0052FF',
  cex: '#FFB300',
  unknown: '#666666',
};

export const GRAPH_CONFIG = {
  MAX_HUBS: 8,
  MAX_AGENTS: 5000,
  MAX_LINES: 5000,
  HUB_RADIUS: 1.5,
  AGENT_RADIUS: 0.08,
  LINE_OPACITY: 0.12,
} as const;
