'use client';

// ============================================================================
// EdgeEditor — Renders editable edges on the 2D SVG canvas
// ============================================================================

import React, { memo, useCallback } from 'react';
import type { EditorEdge, EditorNode } from './types';

// ---------------------------------------------------------------------------
// Edge rendering
// ---------------------------------------------------------------------------

interface EdgeProps {
  edge: EditorEdge;
  sourceNode: EditorNode;
  targetNode: EditorNode;
  selected: boolean;
  zoom: number;
  onPointerDown: (e: React.PointerEvent, edgeId: string) => void;
  onDoubleClick: (edgeId: string) => void;
}

export const EditorEdgeView = memo<EdgeProps>(function EditorEdgeView({
  edge,
  sourceNode,
  targetNode,
  selected,
  zoom,
  onPointerDown,
  onDoubleClick,
}) {
  const x1 = sourceNode.x + sourceNode.width / 2;
  const y1 = sourceNode.y + sourceNode.height / 2;
  const x2 = targetNode.x + targetNode.width / 2;
  const y2 = targetNode.y + targetNode.height / 2;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      onPointerDown(e, edge.id);
    },
    [edge.id, onPointerDown],
  );

  const handleDoubleClick = useCallback(() => {
    onDoubleClick(edge.id);
  }, [edge.id, onDoubleClick]);

  const dashArray =
    edge.style === 'dashed' ? '8,4' :
    edge.style === 'dotted' ? '2,4' : undefined;

  const markerId =
    edge.direction === 'forward' || edge.direction === 'both'
      ? `url(#arrow-${edge.id})`
      : undefined;

  const markerStartId =
    edge.direction === 'backward' || edge.direction === 'both'
      ? `url(#arrow-start-${edge.id})`
      : undefined;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g>
      {/* Arrow marker definitions */}
      <defs>
        {(edge.direction === 'forward' || edge.direction === 'both') && (
          <marker
            id={`arrow-${edge.id}`}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth={8}
            markerHeight={8}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={selected ? '#ffffff' : edge.color} />
          </marker>
        )}
        {(edge.direction === 'backward' || edge.direction === 'both') && (
          <marker
            id={`arrow-start-${edge.id}`}
            viewBox="0 0 10 10"
            refX="0"
            refY="5"
            markerWidth={8}
            markerHeight={8}
            orient="auto-start-reverse"
          >
            <path d="M 10 0 L 0 5 L 10 10 z" fill={selected ? '#ffffff' : edge.color} />
          </marker>
        )}
      </defs>

      {/* Invisible wide hit area for easier clicking */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth={12 / zoom}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: 'pointer' }}
      />

      {/* Visible edge line */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={selected ? '#ffffff' : edge.color}
        strokeWidth={(selected ? 2.5 : 1.5) / zoom}
        strokeDasharray={dashArray}
        markerEnd={markerId}
        markerStart={markerStartId}
        style={{ pointerEvents: 'none' }}
      />

      {/* Edge label */}
      {edge.label && (
        <text
          x={midX}
          y={midY - 8 / zoom}
          textAnchor="middle"
          fill={selected ? '#ffffff' : edge.color}
          fontSize={12 / zoom}
          fontFamily="monospace"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {edge.label}
        </text>
      )}

      {/* Selection indicator */}
      {selected && (
        <circle
          cx={midX}
          cy={midY}
          r={4 / zoom}
          fill="white"
          stroke="#333"
          strokeWidth={1 / zoom}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  );
});

// ---------------------------------------------------------------------------
// Drag-to-connect preview line
// ---------------------------------------------------------------------------

interface DragEdgePreviewProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  zoom: number;
}

export const DragEdgePreview = memo<DragEdgePreviewProps>(function DragEdgePreview({
  fromX,
  fromY,
  toX,
  toY,
  zoom,
}) {
  return (
    <line
      x1={fromX}
      y1={fromY}
      x2={toX}
      y2={toY}
      stroke="rgba(255,255,255,0.5)"
      strokeWidth={2 / zoom}
      strokeDasharray="6,4"
      style={{ pointerEvents: 'none' }}
    />
  );
});
