// ============================================================================
// Agent Force Graph — Constants
// ============================================================================

export const AGENT_COLOR_PALETTE = [
  '#c084fc', // Purple (primary agent color)
  '#60a5fa', // Blue
  '#f472b6', // Pink
  '#34d399', // Green
  '#fbbf24', // Amber
  '#fb923c', // Orange
  '#a78bfa', // Violet
  '#22d3ee', // Cyan
] as const;

export const AGENT_COLORS = {
  default: '#1a1a2e',
  highlight: '#c084fc',
  agentDefault: '#2a2d3e',
  taskActive: '#60a5fa',
  taskComplete: '#34d399',
  taskFailed: '#f87171',
  taskPlanning: '#fbbf24',
  taskWaiting: '#9ca3af',
  toolParticle: '#818cf8',
  reasoning: '#c084fc40',
  heartbeatHealthy: '#34d399',
  heartbeatWarning: '#fbbf24',
  heartbeatDead: '#f87171',
} as const;

export const TOOL_CLUSTER_POSITIONS: Record<string, [number, number]> = {
  filesystem: [-20, 15],
  search: [20, 15],
  terminal: [-20, -15],
  network: [20, -15],
  code: [0, 20],
  reasoning: [0, -20],
};

export const TOOL_CLUSTER_ICONS: Record<string, string> = {
  filesystem: '📁',
  search: '🔍',
  terminal: '>_',
  network: '🌐',
  code: '⟨/⟩',
  reasoning: '◎',
};

export const AGENT_GRAPH_CONFIG = {
  maxTaskNodes: 200,
  maxToolParticles: 200,
  toolParticleSpeed: 0.02,
  toolParticleLifespan: 120,
  taskOrbitRadius: 4,
  taskOrbitSpeed: 0.001,
  breathingAmplitude: 0.05,
  breathingPeriod: 3000,
  pulseExpandScale: 3,
  pulseDuration: 1000,
  hubBaseRadius: 1.2,
  hubMaxRadius: 3.0,
} as const;
