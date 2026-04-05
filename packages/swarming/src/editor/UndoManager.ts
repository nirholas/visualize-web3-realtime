// ============================================================================
// UndoManager — Undo/redo stack for editor actions
// ============================================================================

import type { EditorAction, EditorGraph, EditorNode, EditorEdge } from './types';

const MAX_HISTORY = 100;

export class UndoManager {
  private undoStack: EditorAction[] = [];
  private redoStack: EditorAction[] = [];

  push(action: EditorAction): void {
    this.undoStack.push(action);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(graph: EditorGraph): EditorGraph {
    const action = this.undoStack.pop();
    if (!action) return graph;
    this.redoStack.push(action);
    return applyReverse(graph, action);
  }

  redo(graph: EditorGraph): EditorGraph {
    const action = this.redoStack.pop();
    if (!action) return graph;
    this.undoStack.push(action);
    return applyForward(graph, action);
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

function applyForward(graph: EditorGraph, action: EditorAction): EditorGraph {
  switch (action.type) {
    case 'addNode':
      return {
        ...graph,
        nodes: [...graph.nodes, action.node],
      };

    case 'removeNode':
      return {
        ...graph,
        nodes: graph.nodes.filter((n) => n.id !== action.nodeId),
        edges: graph.edges.filter(
          (e) => e.source !== action.nodeId && e.target !== action.nodeId,
        ),
      };

    case 'addEdge':
      return {
        ...graph,
        edges: [...graph.edges, action.edge],
      };

    case 'removeEdge':
      return {
        ...graph,
        edges: graph.edges.filter((e) => e.id !== action.edgeId),
      };

    case 'moveNodes':
      return {
        ...graph,
        nodes: graph.nodes.map((n) => {
          const move = action.moves.find((m) => m.id === n.id);
          return move ? { ...n, x: move.toX, y: move.toY } : n;
        }),
      };

    case 'updateNode':
      return {
        ...graph,
        nodes: graph.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, ...action.after } : n,
        ),
      };

    case 'updateEdge':
      return {
        ...graph,
        edges: graph.edges.map((e) =>
          e.id === action.edgeId ? { ...e, ...action.after } : e,
        ),
      };

    case 'batch':
      return action.actions.reduce(applyForward, graph);
  }
}

function applyReverse(graph: EditorGraph, action: EditorAction): EditorGraph {
  switch (action.type) {
    case 'addNode':
      return {
        ...graph,
        nodes: graph.nodes.filter((n) => n.id !== action.node.id),
      };

    case 'removeNode':
      return {
        ...graph,
        nodes: [...graph.nodes, action.removedNode],
        edges: [...graph.edges, ...action.removedEdges],
      };

    case 'addEdge':
      return {
        ...graph,
        edges: graph.edges.filter((e) => e.id !== action.edge.id),
      };

    case 'removeEdge':
      return {
        ...graph,
        edges: [...graph.edges, action.removedEdge],
      };

    case 'moveNodes':
      return {
        ...graph,
        nodes: graph.nodes.map((n) => {
          const move = action.moves.find((m) => m.id === n.id);
          return move ? { ...n, x: move.fromX, y: move.fromY } : n;
        }),
      };

    case 'updateNode':
      return {
        ...graph,
        nodes: graph.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, ...action.before } : n,
        ),
      };

    case 'updateEdge':
      return {
        ...graph,
        edges: graph.edges.map((e) =>
          e.id === action.edgeId ? { ...e, ...action.before } : e,
        ),
      };

    case 'batch':
      return [...action.actions].reverse().reduce(applyReverse, graph);
  }
}
