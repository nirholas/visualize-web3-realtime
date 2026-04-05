'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { GLASS } from './desktopConstants';
import type { WindowId } from './desktopTypes';

interface WindowProps {
  windowId: WindowId;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  zIndex: number;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  onPositionChange: (pos: { x: number; y: number }) => void;
}

export const Window = memo<WindowProps>(({
  title,
  icon,
  children,
  zIndex,
  position,
  size,
  onClose,
  onMinimize,
  onFocus,
  onPositionChange,
}) => {
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState(position);
  const posRef = useRef(position);

  // Maximize / restore state
  const [maximized, setMaximized] = useState(false);
  const preMaxRef = useRef<{ pos: { x: number; y: number }; size?: { width: number; height: number } } | null>(null);

  const toggleMaximize = useCallback(() => {
    if (maximized) {
      // Restore
      if (preMaxRef.current) {
        onPositionChange(preMaxRef.current.pos);
      }
      setMaximized(false);
    } else {
      // Save current state and maximize
      preMaxRef.current = { pos: posRef.current, size };
      onPositionChange({ x: 0, y: 0 });
      setMaximized(true);
    }
  }, [maximized, size, onPositionChange]);

  // Sync external position changes
  useEffect(() => {
    if (!dragging) {
      setDragPos(position);
      posRef.current = position;
    }
  }, [position, dragging]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag from title bar
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    e.preventDefault();
    onFocus();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: posRef.current.x,
      originY: posRef.current.y,
    };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [onFocus]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const next = {
      x: Math.max(0, dragRef.current.originX + dx),
      y: Math.max(0, dragRef.current.originY + dy),
    };
    setDragPos(next);
    posRef.current = next;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragRef.current) {
      onPositionChange(posRef.current);
    }
    dragRef.current = null;
    setDragging(false);
  }, [onPositionChange]);

  return (
    <div
      onMouseDown={onFocus}
      style={{
        position: maximized ? 'fixed' : 'absolute',
        left: maximized ? 8 : dragPos.x,
        top: maximized ? 8 : dragPos.y,
        width: maximized ? 'calc(100vw - 16px)' : (size?.width ?? 360),
        minHeight: 100,
        maxHeight: maximized ? 'calc(100vh - 84px)' : (size?.height ? size.height + 40 : '80vh'),
        height: maximized ? 'calc(100vh - 84px)' : undefined,
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        background: GLASS.bg,
        backdropFilter: GLASS.blur,
        WebkitBackdropFilter: GLASS.blur,
        border: GLASS.border,
        borderRadius: maximized ? GLASS.radiusSm : GLASS.radiusLg,
        boxShadow: GLASS.shadow,
        overflow: 'hidden',
        animation: 'winOpen 200ms ease-out',
        fontFamily: "'IBM Plex Mono', monospace",
        userSelect: dragging ? 'none' : undefined,
        transition: maximized ? 'all 200ms ease' : undefined,
      }}
    >
      {/* Title bar */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={toggleMaximize}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          cursor: dragging ? 'grabbing' : 'grab',
          borderBottom: GLASS.borderLight,
          flexShrink: 0,
          background: 'rgba(255, 255, 255, 0.03)',
        }}
      >
        {icon && (
          <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', fontSize: 14 }}>
            {icon}
          </span>
        )}
        <span style={{
          flex: 1,
          fontSize: 11,
          fontWeight: 500,
          color: '#e2e8f0',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {title}
        </span>

        {/* Window controls */}
        <div style={{ display: 'flex', gap: 4 }} data-no-drag>
          {/* Minimize */}
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              transition: 'background 150ms, color 150ms',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
              (e.target as HTMLElement).style.color = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
              (e.target as HTMLElement).style.color = '#64748b';
            }}
            type="button"
            title="Minimize"
          >
            &#x2015;
          </button>
          {/* Maximize / Restore */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleMaximize(); }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: maximized ? 12 : 10,
              transition: 'background 150ms, color 150ms',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
              (e.target as HTMLElement).style.color = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
              (e.target as HTMLElement).style.color = '#64748b';
            }}
            type="button"
            title={maximized ? 'Restore' : 'Maximize'}
          >
            {maximized ? '\u29C9' : '\u25A1'}
          </button>
          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              transition: 'background 150ms, color 150ms',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.4)';
              (e.target as HTMLElement).style.color = '#fca5a5';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
              (e.target as HTMLElement).style.color = '#64748b';
            }}
            type="button"
            title="Close"
          >
            &#x2715;
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 0,
      }}>
        {children}
      </div>
    </div>
  );
});

Window.displayName = 'Window';
