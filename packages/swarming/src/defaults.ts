// ============================================================================
// swarming — Default configuration
//
// Sensible defaults for physics, themes, and data mapping that produce
// a beautiful visualization out of the box.
// ============================================================================

// ---------------------------------------------------------------------------
// Physics defaults
// ---------------------------------------------------------------------------

export interface PhysicsConfig {
  /** Repulsion force for hub nodes (negative = repel). Default: -200 */
  charge?: number;
  /** Distance between hub-to-hub links. Default: 25 */
  linkDistance?: number;
  /** Velocity decay (0–1, higher = more friction). Default: 0.4 */
  damping?: number;
  /** Maximum agent (non-hub) nodes. Default: 5000 */
  maxNodes?: number;
  /** Hub base radius. Default: 0.8 */
  hubBaseRadius?: number;
  /** Hub max radius. Default: 3.0 */
  hubMaxRadius?: number;
  /** Agent node radius. Default: 0.06 */
  agentRadius?: number;
  /** Agent-to-hub link distance base. Default: 5 */
  agentLinkDistance?: number;
  /** Alpha decay rate. Default: 0.01 */
  alphaDecay?: number;
}

export const DEFAULT_PHYSICS: Required<PhysicsConfig> = {
  charge: -200,
  linkDistance: 25,
  damping: 0.4,
  maxNodes: 5000,
  hubBaseRadius: 0.8,
  hubMaxRadius: 3.0,
  agentRadius: 0.06,
  agentLinkDistance: 5,
  alphaDecay: 0.01,
};

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export interface SwarmingTheme {
  /** Canvas background color */
  background: string;
  /** Hub node colors (cycled). At least 1 required. */
  hubColors: string[];
  /** Agent node color */
  agentColor: string;
  /** Edge color for hub-to-hub links */
  hubEdgeColor: string;
  /** Edge color for agent-to-hub links */
  agentEdgeColor: string;
  /** Label text color */
  labelColor: string;
  /** Label background color */
  labelBackground: string;
  /** Loading indicator color */
  loadingColor: string;
  /** Error text color */
  errorColor: string;
}

export const THEME_DARK: SwarmingTheme = {
  background: '#0a0a1a',
  hubColors: [
    '#6366f1', '#8b5cf6', '#a78bfa', '#818cf8',
    '#7c3aed', '#6d28d9', '#5b21b6', '#4f46e5',
  ],
  agentColor: '#555566',
  hubEdgeColor: 'rgba(120, 120, 180, 0.45)',
  agentEdgeColor: 'rgba(100, 100, 140, 0.3)',
  labelColor: '#e2e8f0',
  labelBackground: 'rgba(15, 15, 30, 0.85)',
  loadingColor: '#6366f1',
  errorColor: '#ef4444',
};

export const THEME_LIGHT: SwarmingTheme = {
  background: '#ffffff',
  hubColors: [
    '#1a1a2e', '#16213e', '#0f3460', '#2c2c54',
    '#1b1b2f', '#3d3d6b', '#2a2d3e', '#1e3163',
  ],
  agentColor: '#555566',
  hubEdgeColor: 'rgba(80, 80, 120, 0.45)',
  agentEdgeColor: 'rgba(120, 120, 140, 0.3)',
  labelColor: '#1a1a2e',
  labelBackground: 'rgba(255, 255, 255, 0.85)',
  loadingColor: '#4f46e5',
  errorColor: '#dc2626',
};

export type ThemePreset = 'dark' | 'light';

export function resolveTheme(theme: ThemePreset | SwarmingTheme | undefined): SwarmingTheme {
  if (!theme || theme === 'dark') return THEME_DARK;
  if (theme === 'light') return THEME_LIGHT;
  return theme;
}

// ---------------------------------------------------------------------------
// Camera defaults
// ---------------------------------------------------------------------------

export interface CameraConfig {
  /** Camera position [x, y, z]. Default: [0, 55, 12] */
  position?: [number, number, number];
  /** Field of view in degrees. Default: 45 */
  fov?: number;
}

export const DEFAULT_CAMERA: Required<CameraConfig> = {
  position: [0, 55, 12],
  fov: 45,
};

// ---------------------------------------------------------------------------
// Data mapping
// ---------------------------------------------------------------------------

/** Shape of a node after user mapping */
export interface MappedNode {
  id: string;
  label?: string;
  group?: string;
  value?: number;
}

/** Shape of a mapped edge */
export interface MappedEdge {
  source: string;
  target: string;
}

/** Static graph data for non-streaming use cases */
export interface StaticGraphData {
  nodes: MappedNode[];
  edges?: MappedEdge[];
}

/** Default event-to-node mapper: expects JSON with id/label/group/value fields */
export function defaultMapEvent(raw: Record<string, unknown>): MappedNode {
  return {
    id: String(raw.id ?? raw.txHash ?? raw.hash ?? raw.signature ?? raw.address ?? Math.random().toString(36).slice(2)),
    label: String(raw.label ?? raw.symbol ?? raw.name ?? raw.token ?? ''),
    group: String(raw.group ?? raw.type ?? raw.chain ?? raw.category ?? 'default'),
    value: typeof raw.value === 'number' ? raw.value :
           typeof raw.amount === 'number' ? raw.amount :
           typeof raw.volume === 'number' ? raw.volume : 1,
  };
}
