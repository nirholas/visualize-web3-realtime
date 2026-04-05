// ============================================================================
// @swarming/engine — Types
//
// Framework-agnostic types for the swarming engine.
// ============================================================================

// ---------------------------------------------------------------------------
// Node & Edge (public API)
// ---------------------------------------------------------------------------

/** A node in the swarming graph */
export interface SwarmingNode {
  /** Unique identifier */
  id: string;
  /** Display label */
  label?: string;
  /** IDs of connected nodes */
  connections?: string[];
  /** Group — nodes in the same group cluster together as hubs */
  group?: string;
  /** Visual size override (default: auto-scaled) */
  size?: number;
  /** Hex color override */
  color?: string;
  /** Arbitrary metadata accessible via event callbacks */
  meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal simulation types
// ---------------------------------------------------------------------------

/** Internal simulation node with physics state */
export interface SimNode {
  id: string;
  type: 'hub' | 'leaf';
  label: string;
  radius: number;
  color: string;
  group?: string;
  meta?: Record<string, unknown>;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
  hubId?: string;
}

/** Internal simulation edge */
export interface SimEdge {
  sourceId: string;
  targetId: string;
  source: string | SimNode;
  target: string | SimNode;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Theme preset name or full theme configuration */
export type ThemeInput = 'dark' | 'light' | SwarmingTheme;

/** Full theme configuration */
export interface SwarmingTheme {
  /** Canvas background color */
  background: string;
  /** Hub node colors (cycled through groups) */
  hubColors: string[];
  /** Leaf/agent node color */
  leafColor: string;
  /** Hub-to-hub edge color */
  hubEdgeColor: string;
  /** Leaf-to-hub edge color */
  leafEdgeColor: string;
  /** Label text color */
  labelColor: string;
  /** Label background */
  labelBackground: string;
  /** Hub emissive intensity */
  hubEmissive: number;
  /** Leaf emissive intensity */
  leafEmissive: number;
  /** Bloom intensity (0 = off) */
  bloomIntensity: number;
  /** Bloom threshold */
  bloomThreshold: number;
}

/** Physics configuration */
export interface PhysicsConfig {
  /** Hub charge strength (negative = repel). Default: -200 */
  charge?: number;
  /** Hub-to-hub link distance. Default: 25 */
  linkDistance?: number;
  /** Velocity decay (0–1). Default: 0.4 */
  damping?: number;
  /** Maximum leaf nodes. Default: 5000 */
  maxNodes?: number;
  /** Hub base radius. Default: 0.8 */
  hubBaseRadius?: number;
  /** Hub max radius. Default: 3.0 */
  hubMaxRadius?: number;
  /** Leaf node radius. Default: 0.06 */
  leafRadius?: number;
  /** Leaf-to-hub link distance. Default: 5 */
  leafLinkDistance?: number;
  /** Alpha decay. Default: 0.01 */
  alphaDecay?: number;
}

/** Configuration for the SwarmingEngine */
export interface SwarmingConfig {
  /** WebSocket URL — auto-connects and parses JSON messages */
  source?: string;
  /** Static data array */
  data?: SwarmingNode[];
  /** Maximum nodes. Default: 2000 */
  nodes?: number;
  /** Theme preset or full config. Default: 'dark' */
  theme?: ThemeInput;
  /** Enable bloom. Default: true */
  bloom?: boolean;
  /** Physics overrides */
  physics?: PhysicsConfig;
  /** Show labels. Default: true */
  showLabels?: boolean;
  /** Camera field of view. Default: 45 */
  fov?: number;
  /** Initial camera position. Default: [0, 55, 12] */
  cameraPosition?: [number, number, number];
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type SwarmingEventType = 'nodeClick' | 'nodeHover' | 'ready' | 'error' | 'data';

export interface SwarmingEventMap {
  nodeClick: SwarmingNode;
  nodeHover: SwarmingNode | null;
  ready: void;
  error: Error;
  data: { nodeCount: number; edgeCount: number };
}

// ---------------------------------------------------------------------------
// Handle (imperative API returned by createSwarming)
// ---------------------------------------------------------------------------

export interface SwarmingInstance {
  /** Pause WebSocket data ingestion */
  pause(): void;
  /** Resume WebSocket data ingestion */
  resume(): void;
  /** Update the theme */
  setTheme(theme: ThemeInput): void;
  /** Update the maximum node count */
  setMaxNodes(max: number): void;
  /** Push new data into the engine */
  addNodes(nodes: SwarmingNode[]): void;
  /** Remove a node by ID */
  removeNode(id: string): void;
  /** Update configuration */
  setConfig(config: Partial<SwarmingConfig>): void;
  /** Subscribe to events */
  on<E extends SwarmingEventType>(event: E, callback: (payload: SwarmingEventMap[E]) => void): void;
  /** Unsubscribe from events */
  off<E extends SwarmingEventType>(event: E, callback: (payload: SwarmingEventMap[E]) => void): void;
  /** Reheat the physics simulation */
  reheat(alpha?: number): void;
  /** Destroy the engine and clean up */
  destroy(): void;
  /** Get the container element */
  getContainer(): HTMLElement;
  /** Get the current simulation */
  getSimulation(): SwarmingSimulation;
}

// ---------------------------------------------------------------------------
// Simulation interface (for framework adapters)
// ---------------------------------------------------------------------------

export interface SwarmingSimulation {
  nodes: SimNode[];
  edges: SimEdge[];
  tick(): void;
  update(groups: GroupData[], leafEdges: LeafEdge[]): void;
  reheat(alpha?: number): void;
  dispose(): void;
}

/** A hub group (aggregated from SwarmingNode groups) */
export interface GroupData {
  id: string;
  label: string;
  count: number;
  totalSize: number;
}

/** A leaf-to-hub edge */
export interface LeafEdge {
  leafId: string;
  hubId: string;
}
