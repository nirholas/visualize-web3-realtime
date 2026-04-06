/**
 * Protocol color palette and graph configuration constants.
 */

export const COLOR_PALETTE = [
  '#818cf8', // Blue
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
  highlight: '#818cf8',
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
  MAX_EDGES: 20000,
  HUB_RADIUS: 3.0,
  AGENT_RADIUS: 0.06,
  LINE_OPACITY: 0.06,
  HUB_BASE_RADIUS: 1.5,
  HUB_MAX_RADIUS: 5.0,
  EDGE_HIGHLIGHT_R: 0.48,
  EDGE_HIGHLIGHT_G: 0.78,
  EDGE_HIGHLIGHT_B: 2.0,
  IDLE_NODE_COUNT: 40,
  IDLE_SPEED: 0.08,
  IDLE_RADIUS_MIN: 0.15,
  IDLE_RADIUS_MAX: 0.5,
  IDLE_SPREAD: 30,
  PARTICLE_COUNT: 150,
  PARTICLE_SPEED: 2.5,
} as const;
