import type { CSSProperties } from 'react';
import type { CollaborationConfig } from './collaboration/types';

// ---------------------------------------------------------------------------
// Node & Edge types
// ---------------------------------------------------------------------------

/** A node in the swarming graph */
export interface SwarmingNode {
  /** Unique identifier for this node */
  id: string;
  /** Display label */
  label?: string;
  /** IDs of connected nodes */
  connections?: string[];
  /** Node group — nodes in the same group cluster together */
  group?: string;
  /** Visual size override (default: auto-scaled) */
  size?: number;
  /** Hex color override */
  color?: string;
  /** Arbitrary metadata accessible via event callbacks */
  meta?: Record<string, unknown>;
}

/** Internal simulation node (extends SwarmingNode with physics state) */
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
  /** For leaf nodes: the hub they connect to */
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
// Data Provider
// ---------------------------------------------------------------------------

/** Emit function passed to data providers to push nodes into the graph */
export type EmitFn = (nodes: SwarmingNode[]) => void;

/**
 * A data provider connects to a data source and emits nodes.
 * Return a cleanup function to disconnect.
 */
export interface DataProvider {
  /** Called when the graph mounts. Return a cleanup function. */
  connect: (emit: EmitFn) => (() => void) | void;
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

/** Full theme configuration */
export interface ThemeConfig {
  /** Canvas background color */
  background: string;
  /** Hub node colors (cycled through groups) */
  hubColors: string[];
  /** Leaf node color */
  leafColor: string;
  /** Edge color (for hub-to-hub edges) */
  hubEdgeColor: string;
  /** Edge color (for leaf-to-hub edges) */
  leafEdgeColor: string;
  /** Hub label text color */
  labelColor: string;
  /** Hub label background color */
  labelBackground: string;
  /** Emissive intensity for hub nodes */
  hubEmissive: number;
  /** Emissive intensity for leaf nodes */
  leafEmissive: number;
  /** Bloom intensity (0 = no bloom) */
  bloomIntensity: number;
  /** Bloom luminance threshold */
  bloomThreshold: number;
}

// ---------------------------------------------------------------------------
// Configuration (public API)
// ---------------------------------------------------------------------------

/** Props for the `<Swarming />` component */
export interface SwarmingConfig {
  // -- Data sources (pick one) --

  /** WebSocket URL — automatically connects and parses JSON messages as SwarmingNode[] */
  source?: string;
  /** Custom data provider */
  provider?: DataProvider;
  /** Static data array */
  data?: SwarmingNode[];

  // -- Data mapping --

  /** Map raw WebSocket JSON messages to SwarmingNode. When provided, the component
   *  manages the WebSocket connection directly and passes mapped nodes to the simulation. */
  mapEvent?: (raw: Record<string, unknown>) => SwarmingNode;

  // -- Rendering --

  /** Maximum number of nodes to render (default: 2000) */
  nodes?: number;
  /** Theme preset name or full config */
  theme?: 'dark' | 'light' | ThemeConfig;
  /** Enable post-processing bloom effect (default: true) */
  bloom?: boolean;
  /** Enable mouse-repulsion interaction (default: true) */
  interactive?: boolean;

  // -- Physics --

  /** Node repulsion strength (default: -200) */
  chargeStrength?: number;
  /** Target edge length (default: 25) */
  linkDistance?: number;
  /** Center gravity strength (default: 0.03) */
  centerPull?: number;

  // -- Events --

  /** Called when a node is clicked */
  onNodeClick?: (node: SwarmingNode) => void;
  /** Called when hover state changes (null = unhovered) */
  onNodeHover?: (node: SwarmingNode | null) => void;
  /** Called when the canvas is ready */
  onReady?: () => void;

  // -- Layout --

  /** Container width */
  width?: number | string;
  /** Container height */
  height?: number | string;
  /** CSS class for the container */
  className?: string;
  /** Inline styles for the container */
  style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// Handle (imperative API)
// ---------------------------------------------------------------------------

/** Imperative methods exposed via ref on `<Swarming />` */
export interface SwarmingHandle {
  /** Animate the camera to a position */
  animateCameraTo: (
    position: [number, number, number],
    lookAt?: [number, number, number],
    durationMs?: number,
  ) => Promise<void>;
  /** Focus on a specific group by index */
  focusGroup: (index: number, durationMs?: number) => Promise<void>;
  /** Get the underlying canvas element */
  getCanvasElement: () => HTMLCanvasElement | null;
  /** Capture the current view as a PNG data URL */
  takeSnapshot: () => string | null;
  /** Reheat the physics simulation */
  reheat: (alpha?: number) => void;
}
