'use client';

// ============================================================================
// EditorMode — Main 2D SVG graph editor with drag-and-drop editing
// ============================================================================

import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  EditorConfig,
  EditorGraph,
  EditorHandle,
  EditorNode,
  EditorEdge,
  EditorTool,
  EditorAction,
  LayoutType,
  SelectionState,
  MarqueeRect,
} from './types';

import { UndoManager } from './UndoManager';
import {
  emptySelection,
  toggleNodeSelection,
  toggleEdgeSelection,
  selectAll as selectAllNodes,
  selectInMarquee,
  copySelection,
  pasteClipboard,
  type ClipboardData,
} from './SelectionManager';
import { applyLayout } from './LayoutAlgorithms';
import { exportJSON, importJSON, exportMermaid, importMermaid, importCSV, exportSVG } from './ImportExport';
import { createPersistence, type PersistenceStrategy } from './Persistence';
import { EditorNodeView, InlineLabelEditor, ContextMenu, type ContextMenuProps } from './NodeEditor';
import { EditorEdgeView, DragEdgePreview } from './EdgeEditor';
import { Toolbar } from './Toolbar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nodeCounter = 0;
function nextNodeId(): string {
  return `node_${Date.now()}_${++nodeCounter}`;
}

let edgeCounter = 0;
function nextEdgeId(): string {
  return `edge_${Date.now()}_${++edgeCounter}`;
}

const DEFAULT_NODE_COLOR = '#6366f1';
const DEFAULT_EDGE_COLOR = '#888888';
const ZOOM_STEP = 0.15;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

// ---------------------------------------------------------------------------
// Grid background
// ---------------------------------------------------------------------------

const GridBackground = memo<{ zoom: number; panX: number; panY: number }>(function GridBackground({
  zoom,
  panX,
  panY,
}) {
  const gridSize = 30;
  const majorEvery = 5;

  return (
    <g>
      <defs>
        <pattern
          id="editor-grid-minor"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.5}
          />
        </pattern>
        <pattern
          id="editor-grid-major"
          width={gridSize * majorEvery}
          height={gridSize * majorEvery}
          patternUnits="userSpaceOnUse"
        >
          <rect
            width={gridSize * majorEvery}
            height={gridSize * majorEvery}
            fill="url(#editor-grid-minor)"
          />
          <path
            d={`M ${gridSize * majorEvery} 0 L 0 0 0 ${gridSize * majorEvery}`}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect x={-1e6} y={-1e6} width={2e6} height={2e6} fill="url(#editor-grid-major)" />
    </g>
  );
});

// ---------------------------------------------------------------------------
// Marquee selection rectangle
// ---------------------------------------------------------------------------

const MarqueeOverlay = memo<{ rect: MarqueeRect; zoom: number }>(function MarqueeOverlay({ rect, zoom }) {
  const x = Math.min(rect.x, rect.x + rect.width);
  const y = Math.min(rect.y, rect.y + rect.height);
  const w = Math.abs(rect.width);
  const h = Math.abs(rect.height);

  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill="rgba(99,102,241,0.15)"
      stroke="rgba(99,102,241,0.6)"
      strokeWidth={1.5 / zoom}
      strokeDasharray={`${4 / zoom},${3 / zoom}`}
      style={{ pointerEvents: 'none' }}
    />
  );
});

// ---------------------------------------------------------------------------
// EditorMode component
// ---------------------------------------------------------------------------

const EditorMode = forwardRef<EditorHandle, EditorConfig>(function EditorMode(props, ref) {
  const {
    data,
    onChange,
    physics: initialPhysics = false,
    persistence: persistenceConfig,
    showToolbar = true,
    showGrid = true,
    defaultNodeColor = DEFAULT_NODE_COLOR,
    defaultEdgeColor = DEFAULT_EDGE_COLOR,
    width = '100%',
    height = '100%',
    className,
    style,
  } = props;

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [graph, setGraphRaw] = useState<EditorGraph>(() => data ?? { nodes: [], edges: [] });
  const [selection, setSelection] = useState<SelectionState>(emptySelection);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [physicsEnabled, setPhysicsEnabled] = useState(initialPhysics);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuProps | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const [dragEdge, setDragEdge] = useState<{ sourceId: string; toX: number; toY: number } | null>(null);

  const undoManager = useMemo(() => new UndoManager(), []);
  const clipboardRef = useRef<ClipboardData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Persistence
  const persistenceRef = useRef<PersistenceStrategy | null>(null);
  useEffect(() => {
    if (persistenceConfig) {
      persistenceRef.current = createPersistence(persistenceConfig);
      const loaded = persistenceRef.current.load();
      if (loaded && !data) {
        setGraphRaw(loaded);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Graph mutation helper
  // -------------------------------------------------------------------------

  const setGraph = useCallback(
    (updater: EditorGraph | ((prev: EditorGraph) => EditorGraph)) => {
      setGraphRaw((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        onChange?.(next);
        persistenceRef.current?.save(next);
        return next;
      });
    },
    [onChange],
  );

  const pushAction = useCallback(
    (action: EditorAction) => {
      undoManager.push(action);
    },
    [undoManager],
  );

  // -------------------------------------------------------------------------
  // SVG coordinate conversion
  // -------------------------------------------------------------------------

  const screenToSvg = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const container = containerRef.current;
      if (!container) return [0, 0];
      const rect = container.getBoundingClientRect();
      const x = (clientX - rect.left - panX) / zoom;
      const y = (clientY - rect.top - panY) / zoom;
      return [x, y];
    },
    [zoom, panX, panY],
  );

  // -------------------------------------------------------------------------
  // Node operations
  // -------------------------------------------------------------------------

  const addNode = useCallback(
    (partial: Omit<EditorNode, 'id'> & { id?: string }): EditorNode => {
      const node: EditorNode = {
        id: partial.id ?? nextNodeId(),
        label: partial.label ?? 'Node',
        x: partial.x ?? 0,
        y: partial.y ?? 0,
        width: partial.width ?? 120,
        height: partial.height ?? 60,
        color: partial.color ?? defaultNodeColor,
        group: partial.group,
        meta: partial.meta,
      };
      pushAction({ type: 'addNode', node });
      setGraph((g) => ({ ...g, nodes: [...g.nodes, node] }));
      return node;
    },
    [setGraph, pushAction, defaultNodeColor],
  );

  const removeNode = useCallback(
    (id: string) => {
      setGraph((g) => {
        const removedNode = g.nodes.find((n) => n.id === id);
        if (!removedNode) return g;
        const removedEdges = g.edges.filter((e) => e.source === id || e.target === id);
        pushAction({ type: 'removeNode', nodeId: id, removedNode, removedEdges });
        return {
          nodes: g.nodes.filter((n) => n.id !== id),
          edges: g.edges.filter((e) => e.source !== id && e.target !== id),
        };
      });
      setSelection((s) => {
        const next = { nodeIds: new Set(s.nodeIds), edgeIds: new Set(s.edgeIds) };
        next.nodeIds.delete(id);
        return next;
      });
    },
    [setGraph, pushAction],
  );

  const addEdge = useCallback(
    (partial: Omit<EditorEdge, 'id'> & { id?: string }): EditorEdge => {
      const edge: EditorEdge = {
        id: partial.id ?? nextEdgeId(),
        source: partial.source,
        target: partial.target,
        label: partial.label,
        style: partial.style ?? 'solid',
        direction: partial.direction ?? 'forward',
        color: partial.color ?? defaultEdgeColor,
      };
      pushAction({ type: 'addEdge', edge });
      setGraph((g) => ({ ...g, edges: [...g.edges, edge] }));
      return edge;
    },
    [setGraph, pushAction, defaultEdgeColor],
  );

  const removeEdge = useCallback(
    (id: string) => {
      setGraph((g) => {
        const removedEdge = g.edges.find((e) => e.id === id);
        if (!removedEdge) return g;
        pushAction({ type: 'removeEdge', edgeId: id, removedEdge });
        return { ...g, edges: g.edges.filter((e) => e.id !== id) };
      });
      setSelection((s) => {
        const next = { nodeIds: new Set(s.nodeIds), edgeIds: new Set(s.edgeIds) };
        next.edgeIds.delete(id);
        return next;
      });
    },
    [setGraph, pushAction],
  );

  // -------------------------------------------------------------------------
  // Undo / Redo
  // -------------------------------------------------------------------------

  const undo = useCallback(() => {
    setGraph((g) => undoManager.undo(g));
  }, [undoManager, setGraph]);

  const redo = useCallback(() => {
    setGraph((g) => undoManager.redo(g));
  }, [undoManager, setGraph]);

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------

  const doLayout = useCallback(
    (layout: LayoutType) => {
      setGraph((g) => {
        const before = g.nodes.map((n) => ({ id: n.id, fromX: n.x, fromY: n.y, toX: n.x, toY: n.y }));
        const newNodes = applyLayout(g, layout);
        const moves = newNodes.map((n, i) => ({
          id: n.id,
          fromX: before[i]?.fromX ?? n.x,
          fromY: before[i]?.fromY ?? n.y,
          toX: n.x,
          toY: n.y,
        }));
        pushAction({ type: 'moveNodes', moves });
        return { ...g, nodes: newNodes };
      });
    },
    [setGraph, pushAction],
  );

  // -------------------------------------------------------------------------
  // Zoom
  // -------------------------------------------------------------------------

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z * (1 + ZOOM_STEP), MAX_ZOOM)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z / (1 + ZOOM_STEP), MIN_ZOOM)), []);

  const fitView = useCallback(() => {
    const container = containerRef.current;
    if (!container || graph.nodes.length === 0) return;
    const rect = container.getBoundingClientRect();

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of graph.nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }

    const gw = maxX - minX || 1;
    const gh = maxY - minY || 1;
    const padding = 60;
    const newZoom = Math.min(
      (rect.width - padding * 2) / gw,
      (rect.height - padding * 2) / gh,
      MAX_ZOOM,
    );

    setZoom(Math.max(newZoom, MIN_ZOOM));
    setPanX(rect.width / 2 - (minX + gw / 2) * newZoom);
    setPanY(rect.height / 2 - (minY + gh / 2) * newZoom);
  }, [graph.nodes]);

  // -------------------------------------------------------------------------
  // Delete selected
  // -------------------------------------------------------------------------

  const deleteSelected = useCallback(() => {
    const actions: EditorAction[] = [];
    setGraph((g) => {
      let next = { ...g, nodes: [...g.nodes], edges: [...g.edges] };
      for (const edgeId of selection.edgeIds) {
        const edge = next.edges.find((e) => e.id === edgeId);
        if (edge) {
          actions.push({ type: 'removeEdge', edgeId, removedEdge: edge });
          next = { ...next, edges: next.edges.filter((e) => e.id !== edgeId) };
        }
      }
      for (const nodeId of selection.nodeIds) {
        const node = next.nodes.find((n) => n.id === nodeId);
        if (node) {
          const removedEdges = next.edges.filter((e) => e.source === nodeId || e.target === nodeId);
          actions.push({ type: 'removeNode', nodeId, removedNode: node, removedEdges });
          next = {
            nodes: next.nodes.filter((n) => n.id !== nodeId),
            edges: next.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
          };
        }
      }
      if (actions.length > 0) {
        pushAction({ type: 'batch', actions });
      }
      return next;
    });
    setSelection(emptySelection());
  }, [selection, setGraph, pushAction]);

  // -------------------------------------------------------------------------
  // Pointer event handlers
  // -------------------------------------------------------------------------

  const dragState = useRef<{
    type: 'move' | 'resize' | 'pan' | 'marquee' | 'edgeDrag';
    startX: number;
    startY: number;
    nodeId?: string;
    handle?: string;
    initPositions?: Array<{ id: string; x: number; y: number }>;
    initNode?: EditorNode;
  } | null>(null);

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 2) return; // right-click handled separately
      setContextMenu(null);

      const [svgX, svgY] = screenToSvg(e.clientX, e.clientY);

      if (activeTool === 'addNode') {
        addNode({
          x: svgX - 60,
          y: svgY - 30,
          label: `Node ${graph.nodes.length + 1}`,
        });
        return;
      }

      if (activeTool === 'pan' || e.button === 1) {
        dragState.current = { type: 'pan', startX: e.clientX - panX, startY: e.clientY - panY };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        return;
      }

      // Start marquee selection
      if (activeTool === 'select') {
        if (!e.shiftKey) {
          setSelection(emptySelection());
        }
        dragState.current = {
          type: 'marquee',
          startX: svgX,
          startY: svgY,
        };
        setMarquee({ x: svgX, y: svgY, width: 0, height: 0 });
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }
    },
    [activeTool, screenToSvg, addNode, graph.nodes.length, panX, panY],
  );

  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, nodeId: string) => {
      e.stopPropagation();
      setContextMenu(null);

      if (e.button === 2) {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        setContextMenu({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          nodeId,
          onDeleteNode: removeNode,
          onDeleteEdge: removeEdge,
          onEditLabel: (id) => setEditingNodeId(id),
          onChangeColor: (id, color) => {
            setGraph((g) => ({
              ...g,
              nodes: g.nodes.map((n) => (n.id === id ? { ...n, color } : n)),
            }));
            pushAction({
              type: 'updateNode',
              nodeId: id,
              before: { color: graph.nodes.find((n) => n.id === id)?.color },
              after: { color },
            });
          },
          onClose: () => setContextMenu(null),
        });
        return;
      }

      const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
      setSelection((s) => toggleNodeSelection(s, nodeId, isMulti));

      // Start drag
      const selected = selection.nodeIds.has(nodeId)
        ? [...selection.nodeIds]
        : [nodeId];
      const initPositions = graph.nodes
        .filter((n) => selected.includes(n.id))
        .map((n) => ({ id: n.id, x: n.x, y: n.y }));

      dragState.current = {
        type: 'move',
        startX: e.clientX,
        startY: e.clientY,
        nodeId,
        initPositions,
      };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [selection, graph.nodes, removeNode, removeEdge, setGraph, pushAction],
  );

  const handleResizeStart = useCallback(
    (e: React.PointerEvent, nodeId: string, handle: string) => {
      e.stopPropagation();
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      dragState.current = {
        type: 'resize',
        startX: e.clientX,
        startY: e.clientY,
        nodeId,
        handle,
        initNode: { ...node },
      };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [graph.nodes],
  );

  const handleEdgeDragStart = useCallback(
    (e: React.PointerEvent, nodeId: string) => {
      e.stopPropagation();
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const fromX = node.x + node.width / 2;
      const fromY = node.y + node.height / 2;
      dragState.current = {
        type: 'edgeDrag',
        startX: fromX,
        startY: fromY,
        nodeId,
      };
      setDragEdge({ sourceId: nodeId, toX: fromX, toY: fromY });
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [graph.nodes],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragState.current;
      if (!ds) return;

      if (ds.type === 'pan') {
        setPanX(e.clientX - ds.startX);
        setPanY(e.clientY - ds.startY);
        return;
      }

      if (ds.type === 'move' && ds.initPositions) {
        const dx = (e.clientX - ds.startX) / zoom;
        const dy = (e.clientY - ds.startY) / zoom;
        setGraphRaw((g) => ({
          ...g,
          nodes: g.nodes.map((n) => {
            const init = ds.initPositions!.find((p) => p.id === n.id);
            return init ? { ...n, x: init.x + dx, y: init.y + dy } : n;
          }),
        }));
        return;
      }

      if (ds.type === 'resize' && ds.initNode && ds.handle) {
        const dx = (e.clientX - ds.startX) / zoom;
        const dy = (e.clientY - ds.startY) / zoom;
        const init = ds.initNode;
        let x = init.x;
        let y = init.y;
        let w = init.width;
        let h = init.height;

        if (ds.handle.includes('e')) w = Math.max(MIN_SIZE, init.width + dx);
        if (ds.handle.includes('w')) { w = Math.max(MIN_SIZE, init.width - dx); x = init.x + init.width - w; }
        if (ds.handle.includes('s')) h = Math.max(MIN_SIZE, init.height + dy);
        if (ds.handle.includes('n')) { h = Math.max(MIN_SIZE, init.height - dy); y = init.y + init.height - h; }

        setGraphRaw((g) => ({
          ...g,
          nodes: g.nodes.map((n) =>
            n.id === ds.nodeId ? { ...n, x, y, width: w, height: h } : n,
          ),
        }));
        return;
      }

      if (ds.type === 'marquee') {
        const [svgX, svgY] = screenToSvg(e.clientX, e.clientY);
        setMarquee({
          x: ds.startX,
          y: ds.startY,
          width: svgX - ds.startX,
          height: svgY - ds.startY,
        });
        return;
      }

      if (ds.type === 'edgeDrag') {
        const [svgX, svgY] = screenToSvg(e.clientX, e.clientY);
        setDragEdge((d) => d ? { ...d, toX: svgX, toY: svgY } : null);
        return;
      }
    },
    [zoom, screenToSvg],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragState.current;
      if (!ds) return;

      if (ds.type === 'move' && ds.initPositions) {
        const dx = (e.clientX - ds.startX) / zoom;
        const dy = (e.clientY - ds.startY) / zoom;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          const moves = ds.initPositions.map((p) => ({
            id: p.id,
            fromX: p.x,
            fromY: p.y,
            toX: p.x + dx,
            toY: p.y + dy,
          }));
          pushAction({ type: 'moveNodes', moves });
          // Persist
          setGraph((g) => g);
        }
      }

      if (ds.type === 'resize' && ds.initNode) {
        const node = graph.nodes.find((n) => n.id === ds.nodeId);
        if (node) {
          pushAction({
            type: 'updateNode',
            nodeId: ds.nodeId!,
            before: { x: ds.initNode.x, y: ds.initNode.y, width: ds.initNode.width, height: ds.initNode.height },
            after: { x: node.x, y: node.y, width: node.width, height: node.height },
          });
          setGraph((g) => g);
        }
      }

      if (ds.type === 'marquee') {
        setMarquee(null);
        if (marquee) {
          setSelection((prev) => {
            const marqueeSel = selectInMarquee(graph, marquee);
            if (e.shiftKey) {
              return {
                nodeIds: new Set([...prev.nodeIds, ...marqueeSel.nodeIds]),
                edgeIds: new Set([...prev.edgeIds, ...marqueeSel.edgeIds]),
              };
            }
            return marqueeSel;
          });
        }
      }

      if (ds.type === 'edgeDrag') {
        setDragEdge(null);
        // Find target node under pointer
        const [svgX, svgY] = screenToSvg(e.clientX, e.clientY);
        const target = graph.nodes.find(
          (n) => svgX >= n.x && svgX <= n.x + n.width && svgY >= n.y && svgY <= n.y + n.height,
        );
        if (target && target.id !== ds.nodeId) {
          // Check no duplicate edge exists
          const exists = graph.edges.some(
            (ed) =>
              (ed.source === ds.nodeId && ed.target === target.id) ||
              (ed.source === target.id && ed.target === ds.nodeId),
          );
          if (!exists) {
            addEdge({ source: ds.nodeId!, target: target.id });
          }
        }
      }

      dragState.current = null;
    },
    [zoom, pushAction, setGraph, graph, marquee, screenToSvg, addEdge],
  );

  // -------------------------------------------------------------------------
  // Wheel zoom
  // -------------------------------------------------------------------------

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1 + ZOOM_STEP : 1 / (1 + ZOOM_STEP);
      const newZoom = Math.min(Math.max(zoom * factor, MIN_ZOOM), MAX_ZOOM);
      const scale = newZoom / zoom;

      setPanX(mouseX - scale * (mouseX - panX));
      setPanY(mouseY - scale * (mouseY - panY));
      setZoom(newZoom);
    },
    [zoom, panX, panY],
  );

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when editing label
      if (editingNodeId) return;

      const isCtrl = e.ctrlKey || e.metaKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (isCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if (isCtrl && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (isCtrl && e.key === 'a') {
        e.preventDefault();
        setSelection(selectAllNodes(graph));
        return;
      }
      if (isCtrl && e.key === 'c') {
        e.preventDefault();
        clipboardRef.current = copySelection(graph, selection);
        return;
      }
      if (isCtrl && e.key === 'v') {
        e.preventDefault();
        if (clipboardRef.current) {
          const pasted = pasteClipboard(clipboardRef.current);
          const actions: EditorAction[] = [];
          for (const node of pasted.nodes) actions.push({ type: 'addNode', node });
          for (const edge of pasted.edges) actions.push({ type: 'addEdge', edge });
          if (actions.length > 0) pushAction({ type: 'batch', actions });
          setGraph((g) => ({
            nodes: [...g.nodes, ...pasted.nodes],
            edges: [...g.edges, ...pasted.edges],
          }));
          setSelection({
            nodeIds: new Set(pasted.nodes.map((n) => n.id)),
            edgeIds: new Set(pasted.edges.map((e) => e.id)),
          });
        }
        return;
      }
      if (e.key === 'Escape') {
        setSelection(emptySelection());
        setActiveTool('select');
        setContextMenu(null);
        return;
      }
      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') { setActiveTool('select'); return; }
      if (e.key === 'n' || e.key === 'N') { setActiveTool('addNode'); return; }
      if (e.key === 'e' || e.key === 'E') { setActiveTool('addEdge'); return; }
      if (e.key === ' ') { e.preventDefault(); setActiveTool('pan'); return; }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === ' ') {
        setActiveTool('select');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [editingNodeId, deleteSelected, undo, redo, graph, selection, pushAction, setGraph]);

  // -------------------------------------------------------------------------
  // Label editing
  // -------------------------------------------------------------------------

  const handleLabelCommit = useCallback(
    (nodeId: string, label: string) => {
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (node && node.label !== label) {
        pushAction({
          type: 'updateNode',
          nodeId,
          before: { label: node.label },
          after: { label },
        });
        setGraph((g) => ({
          ...g,
          nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, label } : n)),
        }));
      }
      setEditingNodeId(null);
    },
    [graph.nodes, pushAction, setGraph],
  );

  // Edge double-click editing
  const handleEdgeDoubleClick = useCallback((edgeId: string) => {
    const label = prompt('Edge label:');
    if (label !== null) {
      const edge = graph.edges.find((e) => e.id === edgeId);
      if (edge) {
        pushAction({
          type: 'updateEdge',
          edgeId,
          before: { label: edge.label },
          after: { label: label || undefined },
        });
        setGraph((g) => ({
          ...g,
          edges: g.edges.map((e) => (e.id === edgeId ? { ...e, label: label || undefined } : e)),
        }));
      }
    }
  }, [graph.edges, pushAction, setGraph]);

  // -------------------------------------------------------------------------
  // Export / Import handlers for toolbar
  // -------------------------------------------------------------------------

  const handleExportJSON = useCallback(() => {
    const json = exportJSON(graph);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, 'graph.json');
  }, [graph]);

  const handleExportSVG = useCallback(() => {
    const svg = exportSVG(graph);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    downloadBlob(blob, 'graph.svg');
  }, [graph]);

  const handleExportMermaid = useCallback(() => {
    const md = exportMermaid(graph);
    navigator.clipboard?.writeText(md);
    // Could show a toast, but keeping minimal
  }, [graph]);

  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = importJSON(reader.result as string);
          undoManager.clear();
          setGraph(imported);
          setSelection(emptySelection());
        } catch {
          // invalid file
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setGraph, undoManager]);

  const handleImportMermaid = useCallback(() => {
    const input = prompt('Paste Mermaid syntax:');
    if (input) {
      try {
        const imported = importMermaid(input);
        undoManager.clear();
        setGraph(imported);
        setSelection(emptySelection());
      } catch {
        // invalid mermaid
      }
    }
  }, [setGraph, undoManager]);

  // -------------------------------------------------------------------------
  // Imperative handle
  // -------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    getGraph: () => graph,
    setGraph: (g: EditorGraph) => { undoManager.clear(); setGraph(g); },
    undo,
    redo,
    canUndo: () => undoManager.canUndo(),
    canRedo: () => undoManager.canRedo(),
    addNode,
    removeNode,
    addEdge,
    removeEdge,
    applyLayout: doLayout,
    exportJSON: () => exportJSON(graph),
    exportMermaid: () => exportMermaid(graph),
    importJSON: (json: string) => {
      const imported = importJSON(json);
      undoManager.clear();
      setGraph(imported);
    },
    importMermaid: (mermaid: string) => {
      const imported = importMermaid(mermaid);
      undoManager.clear();
      setGraph(imported);
    },
    importCSV: (csv: string) => {
      const imported = importCSV(csv);
      undoManager.clear();
      setGraph(imported);
    },
    fitView,
    selectAll: () => setSelection(selectAllNodes(graph)),
    clearSelection: () => setSelection(emptySelection()),
    deleteSelected,
  }));

  // -------------------------------------------------------------------------
  // Node map for edge lookups
  // -------------------------------------------------------------------------

  const nodeMap = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph.nodes],
  );

  // -------------------------------------------------------------------------
  // Simple force physics loop
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!physicsEnabled || graph.nodes.length === 0) return;

    let raf: number;
    function tick() {
      setGraphRaw((g) => {
        const nodes = g.nodes.map((n) => ({ ...n }));
        const repulsion = 5000;
        const attraction = 0.005;
        const damping = 0.85;

        for (let i = 0; i < nodes.length; i++) {
          let fx = 0;
          let fy = 0;
          for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            fx -= (dx / dist) * repulsion / (dist * dist);
            fy -= (dy / dist) * repulsion / (dist * dist);
          }
          for (const edge of g.edges) {
            const isSource = edge.source === nodes[i].id;
            const isTarget = edge.target === nodes[i].id;
            if (!isSource && !isTarget) continue;
            const otherId = isSource ? edge.target : edge.source;
            const other = nodes.find((n) => n.id === otherId);
            if (!other) continue;
            const dx = other.x - nodes[i].x;
            const dy = other.y - nodes[i].y;
            fx += dx * attraction;
            fy += dy * attraction;
          }
          nodes[i].x += fx * damping;
          nodes[i].y += fy * damping;
        }
        return { ...g, nodes };
      });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [physicsEnabled, graph.nodes.length, graph.edges]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const hasSelection = selection.nodeIds.size > 0 || selection.edgeIds.size > 0;

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width,
    height,
    overflow: 'hidden',
    background: '#0a0a1a',
    cursor:
      activeTool === 'pan' ? 'grab' :
      activeTool === 'addNode' ? 'crosshair' :
      activeTool === 'addEdge' ? 'crosshair' : 'default',
    ...style,
  };

  // Source node for edge drag preview
  const dragSourceNode = dragEdge ? nodeMap.get(dragEdge.sourceId) : null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ display: 'block' }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {/* Grid */}
          {showGrid && <GridBackground zoom={zoom} panX={panX} panY={panY} />}

          {/* Edges */}
          {graph.edges.map((edge) => {
            const src = nodeMap.get(edge.source);
            const tgt = nodeMap.get(edge.target);
            if (!src || !tgt) return null;
            return (
              <EditorEdgeView
                key={edge.id}
                edge={edge}
                sourceNode={src}
                targetNode={tgt}
                selected={selection.edgeIds.has(edge.id)}
                zoom={zoom}
                onPointerDown={(e, edgeId) => {
                  e.stopPropagation();
                  const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
                  setSelection((s) => toggleEdgeSelection(s, edgeId, isMulti));
                }}
                onDoubleClick={handleEdgeDoubleClick}
              />
            );
          })}

          {/* Drag edge preview */}
          {dragEdge && dragSourceNode && (
            <DragEdgePreview
              fromX={dragSourceNode.x + dragSourceNode.width / 2}
              fromY={dragSourceNode.y + dragSourceNode.height / 2}
              toX={dragEdge.toX}
              toY={dragEdge.toY}
              zoom={zoom}
            />
          )}

          {/* Nodes */}
          {graph.nodes.map((node) => (
            <EditorNodeView
              key={node.id}
              node={node}
              selected={selection.nodeIds.has(node.id)}
              activeTool={activeTool}
              zoom={zoom}
              onPointerDown={handleNodePointerDown}
              onDoubleClick={(id) => setEditingNodeId(id)}
              onResizeStart={handleResizeStart}
              onEdgeDragStart={handleEdgeDragStart}
            />
          ))}

          {/* Marquee */}
          {marquee && <MarqueeOverlay rect={marquee} zoom={zoom} />}
        </g>
      </svg>

      {/* Inline label editor */}
      {editingNodeId && (() => {
        const node = graph.nodes.find((n) => n.id === editingNodeId);
        if (!node) return null;
        return (
          <InlineLabelEditor
            node={node}
            zoom={zoom}
            panX={panX}
            panY={panY}
            onCommit={handleLabelCommit}
            onCancel={() => setEditingNodeId(null)}
          />
        );
      })()}

      {/* Context menu */}
      {contextMenu && <ContextMenu {...contextMenu} />}

      {/* Toolbar */}
      {showToolbar && (
        <Toolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          canUndo={undoManager.canUndo()}
          canRedo={undoManager.canRedo()}
          onUndo={undo}
          onRedo={redo}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFitView={fitView}
          onLayout={doLayout}
          onExportJSON={handleExportJSON}
          onExportSVG={handleExportSVG}
          onExportMermaid={handleExportMermaid}
          onImportJSON={handleImportJSON}
          onImportMermaid={handleImportMermaid}
          physicsEnabled={physicsEnabled}
          onTogglePhysics={() => setPhysicsEnabled((p) => !p)}
          onDeleteSelected={deleteSelected}
          hasSelection={hasSelection}
        />
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default memo(EditorMode);
