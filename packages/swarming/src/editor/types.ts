// ============================================================================
// Editor Types
// ============================================================================

import type { CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Node & Edge
// ---------------------------------------------------------------------------

export interface EditorNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  group?: string;
  meta?: Record<string, unknown>;
}

export type EdgeStyle = 'solid' | 'dashed' | 'dotted';
export type EdgeDirection = 'none' | 'forward' | 'backward' | 'both';

export interface EditorEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style: EdgeStyle;
  direction: EdgeDirection;
  color: string;
}

// ---------------------------------------------------------------------------
// Graph state
// ---------------------------------------------------------------------------

export interface EditorGraph {
  nodes: EditorNode[];
  edges: EditorEdge[];
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface SelectionState {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Editor tool modes
// ---------------------------------------------------------------------------

export type EditorTool =
  | 'select'
  | 'addNode'
  | 'addEdge'
  | 'text'
  | 'pan';

// ---------------------------------------------------------------------------
// Undo/Redo
// ---------------------------------------------------------------------------

export type EditorAction =
  | { type: 'addNode'; node: EditorNode }
  | { type: 'removeNode'; nodeId: string; removedNode: EditorNode; removedEdges: EditorEdge[] }
  | { type: 'addEdge'; edge: EditorEdge }
  | { type: 'removeEdge'; edgeId: string; removedEdge: EditorEdge }
  | { type: 'moveNodes'; moves: Array<{ id: string; fromX: number; fromY: number; toX: number; toY: number }> }
  | { type: 'updateNode'; nodeId: string; before: Partial<EditorNode>; after: Partial<EditorNode> }
  | { type: 'updateEdge'; edgeId: string; before: Partial<EditorEdge>; after: Partial<EditorEdge> }
  | { type: 'batch'; actions: EditorAction[] };

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export type LayoutType =
  | 'force'
  | 'hierarchical'
  | 'circular'
  | 'grid'
  | 'radial';

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export type PersistenceType = 'localStorage' | 'url' | 'callback';

export interface PersistenceConfig {
  type: PersistenceType;
  key?: string;
  onSave?: (graph: EditorGraph) => void;
  onLoad?: () => EditorGraph | null;
}

// ---------------------------------------------------------------------------
// Editor config (public API)
// ---------------------------------------------------------------------------

export interface EditorConfig {
  /** Initial graph data */
  data?: EditorGraph;
  /** Callback when graph changes */
  onChange?: (graph: EditorGraph) => void;
  /** Enable physics simulation toggle (default: false in editor) */
  physics?: boolean;
  /** Persistence strategy */
  persistence?: PersistenceConfig;
  /** Whether to show the toolbar (default: true) */
  showToolbar?: boolean;
  /** Whether to show grid lines (default: true) */
  showGrid?: boolean;
  /** Default node color */
  defaultNodeColor?: string;
  /** Default edge color */
  defaultEdgeColor?: string;
  /** Container width */
  width?: number | string;
  /** Container height */
  height?: number | string;
  /** CSS class */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// Editor handle (imperative API)
// ---------------------------------------------------------------------------

export interface EditorHandle {
  /** Get the current graph state */
  getGraph: () => EditorGraph;
  /** Set the graph state */
  setGraph: (graph: EditorGraph) => void;
  /** Undo last action */
  undo: () => void;
  /** Redo last undone action */
  redo: () => void;
  /** Check if undo is available */
  canUndo: () => boolean;
  /** Check if redo is available */
  canRedo: () => boolean;
  /** Add a node programmatically */
  addNode: (node: Omit<EditorNode, 'id'> & { id?: string }) => EditorNode;
  /** Remove a node */
  removeNode: (id: string) => void;
  /** Add an edge */
  addEdge: (edge: Omit<EditorEdge, 'id'> & { id?: string }) => EditorEdge;
  /** Remove an edge */
  removeEdge: (id: string) => void;
  /** Apply a layout algorithm */
  applyLayout: (layout: LayoutType) => void;
  /** Export as JSON */
  exportJSON: () => string;
  /** Export as Mermaid syntax */
  exportMermaid: () => string;
  /** Import from JSON */
  importJSON: (json: string) => void;
  /** Import from Mermaid syntax */
  importMermaid: (mermaid: string) => void;
  /** Import from CSV (adjacency list) */
  importCSV: (csv: string) => void;
  /** Fit all nodes in view */
  fitView: () => void;
  /** Select all nodes */
  selectAll: () => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Delete selected items */
  deleteSelected: () => void;
}
