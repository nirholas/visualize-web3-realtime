// ============================================================================
// Editor — Public API
// ============================================================================

export { default as EditorMode } from './EditorMode';
export { Toolbar } from './Toolbar';
export { EditorNodeView, InlineLabelEditor, ContextMenu } from './NodeEditor';
export { EditorEdgeView, DragEdgePreview } from './EdgeEditor';
export { UndoManager } from './UndoManager';
export {
  emptySelection,
  isSelected,
  toggleNodeSelection,
  toggleEdgeSelection,
  selectAll,
  selectInMarquee,
  copySelection,
  pasteClipboard,
} from './SelectionManager';
export { applyLayout } from './LayoutAlgorithms';
export {
  exportJSON,
  importJSON,
  exportMermaid,
  importMermaid,
  importCSV,
  exportSVG,
} from './ImportExport';
export { createPersistence } from './Persistence';

export type {
  EditorNode,
  EditorEdge,
  EditorGraph,
  EditorConfig,
  EditorHandle,
  EditorTool,
  EditorAction,
  EdgeStyle,
  EdgeDirection,
  LayoutType,
  PersistenceConfig,
  PersistenceType,
  SelectionState,
  MarqueeRect,
} from './types';
