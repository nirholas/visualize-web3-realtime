/**
 * Agent Force Graph Color Palette & Configuration
 *
 * Visual constants for agent visualization: colors, timing, positions,
 * and performance tuning parameters.
 */

// ---------------------------------------------------------------------------
// Color Palette
// ---------------------------------------------------------------------------

export const AGENT_COLOR_PALETTE = [
  '#c084fc',  // Purple (primary agent color)
  '#60a5fa',  // Blue
  '#f472b6',  // Pink
  '#34d399',  // Green
  '#fbbf24',  // Amber
  '#fb923c',  // Orange
  '#a78bfa',  // Violet
  '#22d3ee',  // Cyan
];

export const AGENT_COLORS = {
  // Node backgrounds
  default: '#1a1a2e',
  agentDefault: '#2a2d3e',
  highlight: '#c084fc',

  // Task statuses
  taskActive: '#60a5fa',
  taskComplete: '#34d399',
  taskFailed: '#f87171',
  taskPlanning: '#fbbf24',
  taskWaiting: '#9ca3af',

  // Tool and animation
  toolParticle: '#818cf8',
  reasoning: '#c084fc40',  // Semi-transparent purple for halo

  // Heartbeat health indicators
  heartbeatHealthy: '#34d399',
  heartbeatWarning: '#fbbf24',
  heartbeatDead: '#f87171',

  // Edges
  edgeDefault: '#555555',
  edgeHighlight: '#60a5fa',
  edgeSubAgent: '#c084fc80',
};

// ---------------------------------------------------------------------------
// Tool Cluster Positions (2D space around the graph center)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Animation & Performance Configuration
// ---------------------------------------------------------------------------

export const AGENT_GRAPH_CONFIG = {
  // Node limits
  maxTaskNodes: 200,
  maxToolParticles: 200,

  // Tool particle animation
  toolParticleSpeed: 0.02,   // units per frame
  toolParticleLifespan: 120, // frames (~2s at 60fps)

  // Task orbit
  taskOrbitRadius: 4,
  taskOrbitSpeed: 0.001,     // radians per frame

  // Breathing animation (idle agents)
  breathingAmplitude: 0.05,  // scale units
  breathingPeriod: 3000,     // ms

  // Pulse rings
  pulseExpandScale: 3,       // how much the pulse ring expands
  pulseDuration: 1000,       // ms

  // Thinking halo
  haloExpandSpeed: 0.05,     // scale per frame during thinking
  haloMaxScale: 2.0,

  // Sub-agent edge animation
  edgePulseSpeed: 2,         // Hz (full cycles per second)

  // Camera animation
  cameraAnimationDuration: 1200, // ms

  // Force simulation (same as ForceGraphSimulation for consistency)
  hubBaseRadius: 0.8,
  hubMaxRadius: 3.0,
  taskNodeRadius: 0.15,

  // Rendering
  particlePoolSize: 200,
  taskNodeGeometrySegments: 8,    // low-poly for performance
  taskNodeMaterialSamples: 2,     // multisampling

  // Spawn animation
  spawnDurationMs: 500,
  spawnParticleCount: 10,
  spawnParticleSpeed: 0.08,
  spawnParticleLifespan: 40, // frames

  // Task completion celebration
  completionRingExpandScale: 3,
  completionRingDurationMs: 800,
  completionFadeDurationMs: 300,
  completionScoreFloatSpeed: 0.02,
  completionScoreLifespan: 60, // frames

  // Tool call trail
  trailGhostCount: 3,
  trailGhostOpacities: [0.8, 0.4, 0.1] as readonly number[],
  trailReturnCurveJitter: 2, // px randomness on return path

  // Error shake
  errorShakeDurationMs: 300,
  errorShakeCycles: 3,
  errorShakeAmplitude: 0.15, // world units

  // Idle breathing (extended)
  idleColorPulseAmount: 0.08, // how much lighter on peak

  // Fade-out timing
  taskFadeOutDelayMs: 5000, // remove completed task nodes after 5s

  // Event caps
  maxEventsPerAgent: 500,
  maxEventsTotal: 2000,

  // Debug
  debugVisualize: false,  // Show tool cluster nodes and guides
};

// ---------------------------------------------------------------------------
// Task Status Configuration
// ---------------------------------------------------------------------------

export const TASK_STATUS_COLORS: Record<string, string> = {
  queued: AGENT_COLORS.taskWaiting,
  planning: AGENT_COLORS.taskPlanning,
  'in-progress': AGENT_COLORS.taskActive,
  waiting: AGENT_COLORS.taskWaiting,
  completed: AGENT_COLORS.taskComplete,
  failed: AGENT_COLORS.taskFailed,
  cancelled: AGENT_COLORS.edgeDefault,
};

// ---------------------------------------------------------------------------
// Tool Category to Cluster Mapping
// ---------------------------------------------------------------------------

export const TOOL_CATEGORY_CLUSTER: Record<string, string> = {
  filesystem: 'filesystem',
  search: 'search',
  terminal: 'terminal',
  network: 'network',
  code: 'code',
  reasoning: 'reasoning',
  other: 'code',  // fallback
};
