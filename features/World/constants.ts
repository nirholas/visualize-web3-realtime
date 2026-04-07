/**
 * Protocol color palette and graph configuration constants.
 *
 * Cyberpunk Neural Network aesthetic: pure-white glowing nodes on pitch-black
 * background with colored particle swarms attacking toward the nodes.
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
  default: '#ffffff',
  highlight: '#ffffff',
  agentDefault: '#ffffff',
} as const;

export const CHAIN_COLORS: Record<string, string> = {
  solana: '#9945FF',
  ethereum: '#627EEA',
  base: '#0052FF',
  cex: '#FFB300',
  unknown: '#666666',
};

/** Particle swarm color palette — colors represent transaction/data types */
export const SWARM_COLORS = {
  whale: '#7c3aed',   // Purple
  buy: '#3b82f6',     // Blue
  sell: '#ef4444',     // Red
  create: '#facc15',   // Yellow
  default: '#22c55e',  // Green
} as const;

export const GRAPH_CONFIG = {
  MAX_HUBS: 6,
  MAX_AGENTS: 5000,
  MAX_LINES: 5000,
  MAX_EDGES: 20000,
  HUB_RADIUS: 3.0,
  AGENT_RADIUS: 0.04,
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
  /** Total swarm particles rendered via THREE.Points */
  PARTICLE_COUNT: 12000,
  PARTICLE_SPEED: 3.5,
  /** Curl noise frequency — controls tightness of spiral */
  SWARM_NOISE_FREQ: 0.35,
  /** Curl noise amplitude — controls swirl intensity */
  SWARM_NOISE_AMP: 8.0,
  /** Attraction strength toward target node */
  SWARM_ATTRACTION: 2.5,
  /** Spawn radius — particles spawn on a sphere of this radius */
  SWARM_SPAWN_RADIUS: 60,
  /** Auto-rotation speed (radians/sec) */
  AUTO_ROTATE_SPEED: 0.06,
  /** Seconds of user inactivity before auto-rotation resumes */
  AUTO_ROTATE_IDLE_DELAY: 3.0,
} as const;
