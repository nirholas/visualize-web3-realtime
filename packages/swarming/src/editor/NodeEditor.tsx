'use client';

// ============================================================================
// NodeEditor — Renders editable nodes on the 2D canvas
// ============================================================================

import React, { memo, useCallback, useRef, useState } from 'react';
import type { EditorNode, SelectionState } from './types';

// ---------------------------------------------------------------------------
// Styles (inline — no Tailwind dependency for packages)
// ---------------------------------------------------------------------------

const HANDLE_SIZE = 8;
const MIN_SIZE = 40;

// ---------------------------------------------------------------------------
// Single node
// ---------------------------------------------------------------------------

interface NodeProps {
  node: EditorNode;
  selected: boolean;
  activeTool: string;
  zoom: number;
  onPointerDown: (e: React.PointerEvent, nodeId: string) => void;
  onDoubleClick: (nodeId: string) => void;
  onResizeStart: (e: React.PointerEvent, nodeId: string, handle: string) => void;
  onEdgeDragStart: (e: React.PointerEvent, nodeId: string) => void;
}

const EditorNodeView = memo<NodeProps>(function EditorNodeView({
  node,
  selected,
  activeTool,
  zoom,
  onPointerDown,
  onDoubleClick,
  onResizeStart,
  onEdgeDragStart,
}) {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (activeTool === 'addEdge') {
        onEdgeDragStart(e, node.id);
      } else {
        onPointerDown(e, node.id);
      }
    },
    [activeTool, node.id, onPointerDown, onEdgeDragStart],
  );

  const handleDoubleClick = useCallback(() => {
    onDoubleClick(node.id);
  }, [node.id, onDoubleClick]);

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: activeTool === 'addEdge' ? 'crosshair' : 'grab' }}
    >
      {/* Node body */}
      <rect
        width={node.width}
        height={node.height}
        rx={6}
        fill={node.color}
        stroke={selected ? '#ffffff' : 'transparent'}
        strokeWidth={selected ? 2 / zoom : 0}
        opacity={0.9}
      />

      {/* Label */}
      <text
        x={node.width / 2}
        y={node.height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={14 / zoom}
        fontFamily="monospace"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {node.label}
      </text>

      {/* Group badge */}
      {node.group && (
        <text
          x={node.width / 2}
          y={node.height - 8 / zoom}
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize={10 / zoom}
          fontFamily="monospace"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {node.group}
        </text>
      )}

      {/* Resize handles (only when selected) */}
      {selected && (
        <>
          {['nw', 'ne', 'sw', 'se'].map((handle) => {
            const hx = handle.includes('e') ? node.width : 0;
            const hy = handle.includes('s') ? node.height : 0;
            const hs = HANDLE_SIZE / zoom;
            return (
              <rect
                key={handle}
                x={hx - hs / 2}
                y={hy - hs / 2}
                width={hs}
                height={hs}
                fill="white"
                stroke="#333"
                strokeWidth={1 / zoom}
                style={{ cursor: `${handle}-resize` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onResizeStart(e, node.id, handle);
                }}
              />
            );
          })}
        </>
      )}

      {/* Edge connection port (center dot when addEdge tool active) */}
      {activeTool === 'addEdge' && (
        <circle
          cx={node.width / 2}
          cy={node.height / 2}
          r={6 / zoom}
          fill="rgba(255,255,255,0.3)"
          stroke="white"
          strokeWidth={1.5 / zoom}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  );
});

// ---------------------------------------------------------------------------
// Inline label editor overlay
// ---------------------------------------------------------------------------

interface LabelEditorProps {
  node: EditorNode;
  zoom: number;
  panX: number;
  panY: number;
  onCommit: (nodeId: string, label: string) => void;
  onCancel: () => void;
}

export const InlineLabelEditor = memo<LabelEditorProps>(function InlineLabelEditor({
  node,
  zoom,
  panX,
  panY,
  onCommit,
  onCancel,
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(node.label);

  const screenX = (node.x + node.width / 2) * zoom + panX;
  const screenY = (node.y + node.height / 2) * zoom + panY;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onCommit(node.id, value);
      } else if (e.key === 'Escape') {
        onCancel();
      }
    },
    [node.id, value, onCommit, onCancel],
  );

  return (
    <input
      ref={inputRef}
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onCommit(node.id, value)}
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        transform: 'translate(-50%, -50%)',
        fontSize: 14,
        fontFamily: 'monospace',
        textAlign: 'center',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 4,
        padding: '4px 8px',
        outline: 'none',
        zIndex: 10,
        minWidth: 80,
      }}
    />
  );
});

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

export interface ContextMenuProps {
  x: number;
  y: number;
  nodeId?: string;
  edgeId?: string;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onEditLabel: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
  onClose: () => void;
}

const COLOR_PRESETS = ['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

export const ContextMenu = memo<ContextMenuProps>(function ContextMenu({
  x,
  y,
  nodeId,
  edgeId,
  onDeleteNode,
  onDeleteEdge,
  onEditLabel,
  onChangeColor,
  onClose,
}) {
  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: '4px 0',
    minWidth: 160,
    zIndex: 100,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#e2e8f0',
  };

  const itemStyle: React.CSSProperties = {
    padding: '6px 16px',
    cursor: 'pointer',
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    color: 'inherit',
    fontFamily: 'inherit',
    fontSize: 'inherit',
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={onClose} />
      <div style={menuStyle}>
        {nodeId && (
          <>
            <button
              style={itemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              onClick={() => { onEditLabel(nodeId); onClose(); }}
            >
              Edit Label
            </button>
            <div style={{ padding: '6px 16px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => { onChangeColor(nodeId, c); onClose(); }}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: c,
                    border: '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
            <button
              style={{ ...itemStyle, color: '#ef4444' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              onClick={() => { onDeleteNode(nodeId); onClose(); }}
            >
              Delete Node
            </button>
          </>
        )}
        {edgeId && (
          <button
            style={{ ...itemStyle, color: '#ef4444' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            onClick={() => { onDeleteEdge(edgeId); onClose(); }}
          >
            Delete Edge
          </button>
        )}
      </div>
    </>
  );
});

export { EditorNodeView };
