// ============================================================================
// SelectionManager — Multi-select, marquee, and clipboard
// ============================================================================

import type { EditorNode, EditorEdge, EditorGraph, SelectionState, MarqueeRect } from './types';

export function emptySelection(): SelectionState {
  return { nodeIds: new Set(), edgeIds: new Set() };
}

export function isSelected(sel: SelectionState, id: string): boolean {
  return sel.nodeIds.has(id) || sel.edgeIds.has(id);
}

export function toggleNodeSelection(sel: SelectionState, nodeId: string, multi: boolean): SelectionState {
  const next: SelectionState = {
    nodeIds: new Set(multi ? sel.nodeIds : []),
    edgeIds: new Set(multi ? sel.edgeIds : []),
  };
  if (next.nodeIds.has(nodeId)) {
    next.nodeIds.delete(nodeId);
  } else {
    next.nodeIds.add(nodeId);
  }
  return next;
}

export function toggleEdgeSelection(sel: SelectionState, edgeId: string, multi: boolean): SelectionState {
  const next: SelectionState = {
    nodeIds: new Set(multi ? sel.nodeIds : []),
    edgeIds: new Set(multi ? sel.edgeIds : []),
  };
  if (next.edgeIds.has(edgeId)) {
    next.edgeIds.delete(edgeId);
  } else {
    next.edgeIds.add(edgeId);
  }
  return next;
}

export function selectAll(graph: EditorGraph): SelectionState {
  return {
    nodeIds: new Set(graph.nodes.map((n) => n.id)),
    edgeIds: new Set(graph.edges.map((e) => e.id)),
  };
}

export function selectInMarquee(graph: EditorGraph, rect: MarqueeRect): SelectionState {
  const x2 = rect.x + rect.width;
  const y2 = rect.y + rect.height;
  const minX = Math.min(rect.x, x2);
  const maxX = Math.max(rect.x, x2);
  const minY = Math.min(rect.y, y2);
  const maxY = Math.max(rect.y, y2);

  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    const nx = node.x + node.width / 2;
    const ny = node.y + node.height / 2;
    if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY) {
      nodeIds.add(node.id);
    }
  }

  // Auto-select edges between selected nodes
  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      edgeIds.add(edge.id);
    }
  }

  return { nodeIds, edgeIds };
}

// ---------------------------------------------------------------------------
// Clipboard (copy/paste)
// ---------------------------------------------------------------------------

export interface ClipboardData {
  nodes: EditorNode[];
  edges: EditorEdge[];
}

export function copySelection(graph: EditorGraph, sel: SelectionState): ClipboardData {
  const nodes = graph.nodes.filter((n) => sel.nodeIds.has(n.id));
  const nodeIdSet = sel.nodeIds;
  const edges = graph.edges.filter(
    (e) => sel.edgeIds.has(e.id) || (nodeIdSet.has(e.source) && nodeIdSet.has(e.target)),
  );
  return { nodes, edges };
}

export function pasteClipboard(
  clipboard: ClipboardData,
  offsetX = 20,
  offsetY = 20,
): { nodes: EditorNode[]; edges: EditorEdge[] } {
  const idMap = new Map<string, string>();

  const nodes = clipboard.nodes.map((n) => {
    const newId = `${n.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    idMap.set(n.id, newId);
    return { ...n, id: newId, x: n.x + offsetX, y: n.y + offsetY };
  });

  const edges = clipboard.edges
    .filter((e) => idMap.has(e.source) && idMap.has(e.target))
    .map((e) => ({
      ...e,
      id: `${e.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
    }));

  return { nodes, edges };
}
