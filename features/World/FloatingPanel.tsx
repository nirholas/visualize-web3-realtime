'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useDarkMode } from './DarkModeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FloatingPanelProps {
  /** Unique identifier for persisting position in localStorage */
  id: string;
  /** Label shown in the minimized pill and drag handle */
  title: string;
  /** Panel content */
  children: ReactNode;
  /** Default position when not stored in localStorage */
  defaultPosition?: { x: number; y: number };
  /** If true, use the default anchor CSS (e.g. bottom/right) instead of top/left */
  defaultAnchor?: CSSProperties;
  /** Default z-index */
  zIndex?: number;
  /** Start minimized? */
  defaultMinimized?: boolean;
  /** Optional icon shown in the minimized pill */
  icon?: ReactNode;
  /** Min-width when expanded */
  minWidth?: number;
  /** Additional style applied to the outer wrapper */
  style?: CSSProperties;
  /** If true the panel cannot be minimized */
  disableMinimize?: boolean;
}

// ---------------------------------------------------------------------------
// Persist helpers
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'fp_';

interface PanelState {
  x: number;
  y: number;
  minimized: boolean;
  locked: boolean;
}

function loadState(id: string): PanelState | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(id: string, state: PanelState) {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(state));
  } catch {
    /* quota exceeded — ignore */
  }
}

// ---------------------------------------------------------------------------
// FloatingPanel
// ---------------------------------------------------------------------------

const FloatingPanel = memo<FloatingPanelProps>(function FloatingPanel({
  id,
  title,
  children,
  defaultPosition,
  defaultAnchor,
  zIndex = 20,
  defaultMinimized = false,
  icon,
  minWidth,
  style,
  disableMinimize = false,
}) {
  const isDark = useDarkMode();
  const saved = useRef(loadState(id));

  const [minimized, setMinimized] = useState(saved.current?.minimized ?? defaultMinimized);
  const [locked, setLocked] = useState(saved.current?.locked ?? true);
  const [dragging, setDragging] = useState(false);

  // Track whether user has ever dragged (if not, keep using anchor CSS)
  const [hasMoved, setHasMoved] = useState(saved.current != null);
  const [pos, setPos] = useState<{ x: number; y: number }>(
    saved.current ?? defaultPosition ?? { x: 0, y: 0 },
  );

  const dragStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Persist
  useEffect(() => {
    if (hasMoved) {
      saveState(id, { x: pos.x, y: pos.y, minimized, locked });
    }
  }, [id, pos, minimized, locked, hasMoved]);

  // --- Drag handlers (pointer events) ---

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (locked) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;

      // If the panel hasn't been dragged yet, initialize pos from current DOM position
      const startX = hasMoved ? pos.x : rect.left;
      const startY = hasMoved ? pos.y : rect.top;

      dragStart.current = { px: e.clientX, py: e.clientY, ox: startX, oy: startY };
      setDragging(true);
    },
    [locked, pos, hasMoved],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.px;
      const dy = e.clientY - dragStart.current.py;
      const newX = dragStart.current.ox + dx;
      const newY = dragStart.current.oy + dy;

      // Clamp to viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pw = panelRef.current?.offsetWidth ?? 200;
      const ph = panelRef.current?.offsetHeight ?? 40;
      setPos({
        x: Math.max(0, Math.min(newX, vw - pw)),
        y: Math.max(0, Math.min(newY, vh - ph)),
      });
      if (!hasMoved) setHasMoved(true);
    },
    [hasMoved],
  );

  const onPointerUp = useCallback(() => {
    dragStart.current = null;
    setDragging(false);
  }, []);

  // --- Styles ---

  const positionStyle: CSSProperties =
    hasMoved
      ? { position: 'fixed', left: pos.x, top: pos.y }
      : defaultAnchor
        ? { position: 'absolute', ...defaultAnchor }
        : defaultPosition
          ? { position: 'absolute', left: defaultPosition.x, top: defaultPosition.y }
          : { position: 'absolute' };

  const wrapperStyle: CSSProperties = {
    ...positionStyle,
    zIndex: dragging ? zIndex + 100 : zIndex,
    transition: dragging ? 'none' : 'box-shadow 200ms ease',
    ...(dragging ? { boxShadow: '0 8px 32px rgba(0,0,0,0.18)' } : {}),
    ...style,
  };

  // --- Minimized state ---

  if (minimized) {
    return (
      <div ref={panelRef} style={wrapperStyle}>
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{
            alignItems: 'center',
            background: isDark ? 'rgba(18, 18, 28, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e8e8e8',
            borderRadius: 10,
            boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
            cursor: locked ? 'pointer' : 'grab',
            display: 'flex',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            gap: 5,
            letterSpacing: '0.06em',
            padding: '5px 12px',
            textTransform: 'uppercase',
            userSelect: 'none',
            color: isDark ? '#94a3b8' : '#666',
          }}
        >
          {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
          <span>{title}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setMinimized(false); }}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? '#64748b' : '#999',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              marginLeft: 4,
              padding: '0 2px',
            }}
            title="Expand"
            type="button"
          >
            +
          </button>
        </div>
      </div>
    );
  }

  // --- Expanded state ---

  return (
    <div
      ref={panelRef}
      style={{
        ...wrapperStyle,
        ...(minWidth != null ? { minWidth } : {}),
      }}
    >
      {/* Drag handle + toolbar */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          alignItems: 'center',
          background: isDark ? 'rgba(18, 18, 28, 0.8)' : 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(8px)',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
          borderRadius: '10px 10px 0 0',
          cursor: locked ? 'default' : 'grab',
          display: 'flex',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          gap: 6,
          justifyContent: 'space-between',
          letterSpacing: '0.08em',
          padding: '3px 8px',
          textTransform: 'uppercase',
          userSelect: 'none',
          color: isDark ? '#64748b' : '#999',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {!locked && (
            <span style={{ color: isDark ? '#475569' : '#bbb', fontSize: 8, cursor: 'grab' }}>⠿</span>
          )}
          {title}
        </span>
        <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Lock/unlock toggle */}
          <button
            onClick={() => setLocked((l) => !l)}
            style={{
              background: 'none',
              border: 'none',
              color: locked ? (isDark ? '#475569' : '#bbb') : '#3d63ff',
              cursor: 'pointer',
              fontSize: 11,
              lineHeight: 1,
              padding: '1px 3px',
            }}
            title={locked ? 'Unlock to drag' : 'Lock position'}
            type="button"
          >
            {locked ? '🔒' : '🔓'}
          </button>
          {/* Minimize button */}
          {!disableMinimize && (
            <button
              onClick={() => setMinimized(true)}
              style={{
                background: 'none',
                border: 'none',
                color: isDark ? '#475569' : '#bbb',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
                padding: '1px 3px',
              }}
              title="Minimize"
              type="button"
            >
              −
            </button>
          )}
        </span>
      </div>
      {/* Panel content */}
      <div>{children}</div>
    </div>
  );
});

export default FloatingPanel;
