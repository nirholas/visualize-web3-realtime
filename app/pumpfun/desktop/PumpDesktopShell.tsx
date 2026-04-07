'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GLASS, TASKBAR_HEIGHT } from '@/features/World/desktop/desktopConstants';
import { useDesktopClock } from '@/features/World/desktop/useDesktopClock';
import {
  LiveFeedIcon,
  StatsIcon,
  StartMenuIcon,
  TimelineIcon,
  SourcesIcon,
  ShareIcon,
} from '@/features/World/desktop/AppIcons';
import type { GraphMetrics } from '../useGraphMetrics';
import type { PumpNode } from '../types';

/* ================================================================== */
/*  Types & Constants                                                  */
/* ================================================================== */

type PumpWindowId = 'tokenfeed' | 'stats' | 'trades' | 'dashboard' | 'vanity';

interface PumpWindowState {
  id: PumpWindowId;
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size?: { width: number; height: number };
}

interface PumpAppDef {
  id: PumpWindowId;
  label: string;
  iconKey: string;
  defaultSize: { width: number; height: number };
  defaultPosition: { x: number; y: number };
  pinned: boolean;
  description: string;
}

const PUMP_APPS: PumpAppDef[] = [
  {
    id: 'tokenfeed',
    label: 'Token Feed',
    iconKey: 'tokenfeed',
    defaultSize: { width: 340, height: 420 },
    defaultPosition: { x: 60, y: 80 },
    pinned: true,
    description: 'Live token launches',
  },
  {
    id: 'trades',
    label: 'Trades',
    iconKey: 'trades',
    defaultSize: { width: 380, height: 420 },
    defaultPosition: { x: 420, y: 80 },
    pinned: true,
    description: 'Live buy/sell feed',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    iconKey: 'dashboard',
    defaultSize: { width: 440, height: 260 },
    defaultPosition: { x: 200, y: 260 },
    pinned: false,
    description: 'Overview stats & analytics',
  },
  {
    id: 'stats',
    label: 'Stats',
    iconKey: 'stats',
    defaultSize: { width: 500, height: 140 },
    defaultPosition: { x: 250, y: 100 },
    pinned: false,
    description: 'Volume & metrics',
  },
  {
    id: 'vanity',
    label: 'Vanity Gen',
    iconKey: 'vanity',
    defaultSize: { width: 320, height: 280 },
    defaultPosition: { x: 500, y: 200 },
    pinned: false,
    description: 'Vanity address generator',
  },
];

const PUMP_APP_MAP = Object.fromEntries(
  PUMP_APPS.map((a) => [a.id, a]),
) as Record<PumpWindowId, PumpAppDef>;

const ALL_PUMP_IDS: PumpWindowId[] = ['tokenfeed', 'trades', 'dashboard', 'stats', 'vanity'];

const ICON_MAP: Record<string, React.FC> = {
  tokenfeed: LiveFeedIcon,
  trades: TimelineIcon,
  dashboard: SourcesIcon,
  stats: StatsIcon,
  vanity: ShareIcon,
};

function getPumpIcon(key: string): React.FC {
  return ICON_MAP[key] ?? StatsIcon;
}

/* ================================================================== */
/*  Window Manager Hook                                                */
/* ================================================================== */

const STORAGE_KEY = 'pump_desktop_windows';

function loadPersistedState(): Record<PumpWindowId, PumpWindowState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistState(state: Record<PumpWindowId, PumpWindowState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded */
  }
}

let nextZ = 100;

function buildInitialState(): Record<PumpWindowId, PumpWindowState> {
  const s = {} as Record<PumpWindowId, PumpWindowState>;
  for (const id of ALL_PUMP_IDS) {
    const app = PUMP_APP_MAP[id];
    s[id] = {
      id,
      isOpen: false,
      isMinimized: false,
      zIndex: 10,
      position: app.defaultPosition,
      size: app.defaultSize,
    };
  }
  return s;
}

function usePumpWindows() {
  const [windows, setWindows] =
    useState<Record<PumpWindowId, PumpWindowState>>(buildInitialState);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const persisted = loadPersistedState();
    if (!persisted) return;
    setWindows((prev) => {
      const next = { ...prev };
      for (const id of ALL_PUMP_IDS) {
        if (persisted[id]) {
          next[id] = { ...persisted[id], isOpen: false, isMinimized: false };
        }
      }
      return next;
    });
  }, []);

  const update = useCallback(
    (id: PumpWindowId, patch: Partial<PumpWindowState>) => {
      setWindows((prev) => {
        const next = { ...prev, [id]: { ...prev[id], ...patch } };
        persistState(next);
        return next;
      });
    },
    [],
  );

  const openWindow = useCallback(
    (id: PumpWindowId) => {
      nextZ++;
      update(id, { isOpen: true, isMinimized: false, zIndex: nextZ });
    },
    [update],
  );

  const closeWindow = useCallback(
    (id: PumpWindowId) => {
      update(id, { isOpen: false, isMinimized: false });
    },
    [update],
  );

  const minimizeWindow = useCallback(
    (id: PumpWindowId) => {
      update(id, { isMinimized: true });
    },
    [update],
  );

  const focusWindow = useCallback(
    (id: PumpWindowId) => {
      nextZ++;
      update(id, { zIndex: nextZ });
    },
    [update],
  );

  const toggleWindow = useCallback((id: PumpWindowId) => {
    setWindows((prev) => {
      const w = prev[id];
      nextZ++;
      let patch: Partial<PumpWindowState>;
      if (!w.isOpen) {
        patch = { isOpen: true, isMinimized: false, zIndex: nextZ };
      } else if (w.isMinimized) {
        patch = { isMinimized: false, zIndex: nextZ };
      } else {
        patch = { isMinimized: true };
      }
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      persistState(next);
      return next;
    });
  }, []);

  const updatePosition = useCallback(
    (id: PumpWindowId, position: { x: number; y: number }) => {
      update(id, { position });
    },
    [update],
  );

  const openWindows = useMemo(
    () => Object.values(windows).filter((w) => w.isOpen && !w.isMinimized),
    [windows],
  );

  return {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    focusWindow,
    toggleWindow,
    updatePosition,
    openWindows,
  };
}

/* ================================================================== */
/*  PumpWindow                                                         */
/* ================================================================== */

interface PumpWindowProps {
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

const PumpWindow = memo<PumpWindowProps>(
  ({
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

    useEffect(() => {
      if (!dragging) {
        setDragPos(position);
        posRef.current = position;
      }
    }, [position, dragging]);

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
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
      },
      [onFocus],
    );

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
      if (dragRef.current) onPositionChange(posRef.current);
      dragRef.current = null;
      setDragging(false);
    }, [onPositionChange]);

    return (
      <div
        onMouseDown={onFocus}
        style={{
          position: 'absolute',
          left: dragPos.x,
          top: dragPos.y,
          width: size?.width ?? 360,
          minHeight: 100,
          maxHeight: size?.height ? size.height + 40 : '80vh',
          zIndex,
          display: 'flex',
          flexDirection: 'column',
          background: GLASS.bg,
          backdropFilter: GLASS.blur,
          WebkitBackdropFilter: GLASS.blur,
          border: GLASS.border,
          borderRadius: GLASS.radiusLg,
          boxShadow: GLASS.shadow,
          overflow: 'hidden',
          animation: 'winOpen 200ms ease-out',
          fontFamily: "'IBM Plex Mono', monospace",
          userSelect: dragging ? 'none' : undefined,
        }}
      >
        {/* Title bar */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
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
            <span
              style={{
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                fontSize: 14,
              }}
            >
              {icon}
            </span>
          )}
          <span
            style={{
              flex: 1,
              fontSize: 11,
              fontWeight: 500,
              color: '#e2e8f0',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </span>

          {/* Window controls */}
          <div style={{ display: 'flex', gap: 4 }} data-no-drag>
            <WinButton
              onClick={onMinimize}
              title="Minimize"
              hoverBg="rgba(255,255,255,0.12)"
              hoverColor="#e2e8f0"
            >
              &#x2015;
            </WinButton>
            <WinButton
              onClick={onClose}
              title="Close"
              hoverBg="rgba(239,68,68,0.4)"
              hoverColor="#fca5a5"
            >
              &#x2715;
            </WinButton>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>{children}</div>
      </div>
    );
  },
);
PumpWindow.displayName = 'PumpWindow';

/* Small helper for window title-bar buttons */
const WinButton = memo<{
  onClick: () => void;
  title: string;
  hoverBg: string;
  hoverColor: string;
  children: React.ReactNode;
}>(({ onClick, title, hoverBg, hoverColor, children }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.background = hoverBg;
      (e.currentTarget as HTMLElement).style.color = hoverColor;
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.background = 'transparent';
      (e.currentTarget as HTMLElement).style.color = '#64748b';
    }}
    type="button"
    title={title}
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
  >
    {children}
  </button>
));
WinButton.displayName = 'WinButton';

/* ================================================================== */
/*  Taskbar App Icon                                                   */
/* ================================================================== */

const PumpTaskbarIcon = memo<{
  id: PumpWindowId;
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  isMinimized: boolean;
  onClick: () => void;
}>(({ id, label, icon, isOpen, isMinimized, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      data-app-id={id}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={label}
      type="button"
      style={{
        position: 'relative',
        width: 40,
        height: 40,
        borderRadius: 8,
        border: 'none',
        background: hovered
          ? 'rgba(255, 255, 255, 0.10)'
          : isOpen
            ? 'rgba(255, 255, 255, 0.06)'
            : 'transparent',
        color: isOpen ? '#e2e8f0' : '#94a3b8',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 150ms, color 150ms, transform 100ms',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {icon}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: isMinimized ? 4 : 16,
            height: 3,
            borderRadius: 2,
            background: isMinimized ? '#64748b' : '#60a5fa',
            transition: 'width 200ms, background 200ms',
          }}
        />
      )}
    </button>
  );
});
PumpTaskbarIcon.displayName = 'PumpTaskbarIcon';

/* ================================================================== */
/*  System Tray                                                        */
/* ================================================================== */

const PumpSystemTray = memo<{
  isLive: boolean;
  darkMode: boolean;
  onToggleTheme: () => void;
}>(({ isLive, darkMode, onToggleTheme }) => {
  const { time, date } = useDesktopClock();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 8,
        background: 'rgba(255, 255, 255, 0.04)',
      }}
    >
      {/* Live / Demo indicator */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: isLive ? '#22c55e' : '#eab308',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {isLive ? 'LIVE' : 'DEMO'}
      </span>

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 20,
          background: 'rgba(255,255,255,0.08)',
        }}
      />

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        type="button"
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          color: '#94a3b8',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 150ms',
        }}
      >
        {darkMode ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 20,
          background: 'rgba(255,255,255,0.08)',
        }}
      />

      {/* Clock */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 0,
          cursor: 'default',
          minWidth: 70,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: '#e2e8f0',
            fontFamily: "'IBM Plex Mono', monospace",
            lineHeight: 1.2,
          }}
        >
          {time}
        </span>
        <span
          style={{
            fontSize: 9,
            color: '#64748b',
            fontFamily: "'IBM Plex Mono', monospace",
            lineHeight: 1.2,
          }}
        >
          {date}
        </span>
      </div>
    </div>
  );
});
PumpSystemTray.displayName = 'PumpSystemTray';

/* ================================================================== */
/*  Taskbar                                                            */
/* ================================================================== */

const PumpTaskbar = memo<{
  windows: Record<PumpWindowId, PumpWindowState>;
  onToggleWindow: (id: PumpWindowId) => void;
  onToggleStartMenu: () => void;
  startMenuOpen: boolean;
  isLive: boolean;
  darkMode: boolean;
  onToggleTheme: () => void;
}>(
  ({
    windows,
    onToggleWindow,
    onToggleStartMenu,
    startMenuOpen,
    isLive,
    darkMode,
    onToggleTheme,
  }) => {
    const [startHovered, setStartHovered] = useState(false);

    const pinnedIds = PUMP_APPS.filter((a) => a.pinned).map((a) => a.id);
    const openIds = Object.values(windows)
      .filter((w) => w.isOpen && !pinnedIds.includes(w.id))
      .map((w) => w.id);
    const visibleIds = [...pinnedIds, ...openIds];

    return (
      <div
        style={{
          position: 'fixed',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          height: TASKBAR_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: GLASS.bgSolid,
          backdropFilter: GLASS.blur,
          WebkitBackdropFilter: GLASS.blur,
          border: GLASS.border,
          borderRadius: GLASS.radiusLg,
          boxShadow: GLASS.shadow,
          zIndex: 9000,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {/* Start button */}
        <button
          onClick={onToggleStartMenu}
          onMouseEnter={() => setStartHovered(true)}
          onMouseLeave={() => setStartHovered(false)}
          type="button"
          title="Start"
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            border: 'none',
            background: startMenuOpen
              ? 'rgba(96, 165, 250, 0.2)'
              : startHovered
                ? 'rgba(255, 255, 255, 0.10)'
                : 'transparent',
            color: startMenuOpen ? '#60a5fa' : '#e2e8f0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 150ms, color 150ms, transform 100ms',
            transform: startHovered ? 'translateY(-2px)' : 'none',
          }}
        >
          <StartMenuIcon />
        </button>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 24,
            background: 'rgba(255,255,255,0.12)',
            margin: '0 6px',
          }}
        />

        {/* App icons */}
        {visibleIds.map((id) => {
          const w = windows[id];
          const Icon = getPumpIcon(
            PUMP_APPS.find((a) => a.id === id)?.iconKey ?? id,
          );
          return (
            <PumpTaskbarIcon
              key={id}
              id={id}
              label={PUMP_APPS.find((a) => a.id === id)?.label ?? id}
              icon={<Icon />}
              isOpen={w?.isOpen ?? false}
              isMinimized={w?.isMinimized ?? false}
              onClick={() => onToggleWindow(id)}
            />
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1, minWidth: 8 }} />

        {/* System tray */}
        <PumpSystemTray
          isLive={isLive}
          darkMode={darkMode}
          onToggleTheme={onToggleTheme}
        />
      </div>
    );
  },
);
PumpTaskbar.displayName = 'PumpTaskbar';

/* ================================================================== */
/*  Start Menu                                                         */
/* ================================================================== */

const PumpStartMenu = memo<{
  isOpen: boolean;
  onClose: () => void;
  onOpenWindow: (id: PumpWindowId) => void;
}>(({ isOpen, onClose, onOpenWindow }) => {
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('[title="Start"]')) return;
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleAppClick = useCallback(
    (id: PumpWindowId) => {
      onOpenWindow(id);
      onClose();
    },
    [onOpenWindow, onClose],
  );

  if (!isOpen) return null;

  const filteredApps = PUMP_APPS.filter(
    (a) =>
      a.label.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        bottom: TASKBAR_HEIGHT + 16,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 400,
        maxHeight: '70vh',
        background: GLASS.bgSolid,
        backdropFilter: GLASS.blur,
        WebkitBackdropFilter: GLASS.blur,
        border: GLASS.border,
        borderRadius: GLASS.radiusLg,
        boxShadow: GLASS.shadow,
        zIndex: 9500,
        fontFamily: "'IBM Plex Mono', monospace",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'startMenuOpen 200ms ease-out',
      }}
    >
      {/* Branding header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '20px 24px 12px',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: '#fff',
            fontWeight: 700,
          }}
        >
          PF
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>
            PumpFun
          </div>
          <div
            style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.04em' }}
          >
            Real-time trading visualizer
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 24px 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255, 255, 255, 0.07)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 8,
            padding: '8px 12px',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type here to search"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e2e8f0',
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          />
        </div>
      </div>

      {/* Pinned header */}
      <div style={{ padding: '0 24px 8px' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
          Pinned
        </span>
      </div>

      {/* App grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 4,
          padding: '0 16px 16px',
        }}
      >
        {filteredApps.map((app) => {
          const Icon = getPumpIcon(app.iconKey);
          return (
            <StartMenuTile
              key={app.id}
              label={app.label}
              icon={<Icon />}
              onClick={() => handleAppClick(app.id)}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: GLASS.borderLight,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: '#475569',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          PumpFun Visualizer v1.0
        </span>
      </div>
    </div>
  );
});
PumpStartMenu.displayName = 'PumpStartMenu';

/* Start menu tile */
const StartMenuTile = memo<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}>(({ label, icon, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      type="button"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '12px 8px',
        borderRadius: 8,
        border: 'none',
        background: hovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
        color: '#e2e8f0',
        cursor: 'pointer',
        transition: 'background 150ms',
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 10, letterSpacing: '0.02em' }}>{label}</span>
    </button>
  );
});
StartMenuTile.displayName = 'StartMenuTile';

/* ================================================================== */
/*  Window Content: Token Feed                                         */
/* ================================================================== */

function formatAge(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function shortenMint(mint: string): string {
  if (mint.length <= 10) return mint;
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

const TokenFeedContent = memo<{ tokens: PumpNode[] }>(({ tokens }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  if (tokens.length === 0) {
    return (
      <div
        style={{
          padding: 16,
          color: '#64748b',
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          textAlign: 'center',
        }}
      >
        Waiting for token launches...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 8 }}>
      {tokens.map((token, i) => (
        <div
          key={token.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.04)',
            animation: 'winOpen 0.3s ease-out both',
            animationDelay: `${i * 60}ms`,
          }}
        >
          <span
            style={{
              position: 'relative',
              display: 'inline-flex',
              width: 8,
              height: 8,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: '#4ade80',
                opacity: 0.75,
                animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite',
              }}
            />
            <span
              style={{
                position: 'relative',
                display: 'inline-flex',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#4ade80',
              }}
            />
          </span>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: 'rgba(255,255,255,0.8)',
              overflow: 'hidden',
              flex: 1,
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {token.name ? (
                  <>
                    {token.name}{' '}
                    <span style={{ color: '#4ade80', fontWeight: 600 }}>
                      ${token.ticker ?? 'UNKNOWN'}
                    </span>
                  </>
                ) : (
                  <>
                    New Launch:{' '}
                    <span style={{ color: '#4ade80', fontWeight: 600 }}>
                      ${token.ticker ?? 'UNKNOWN'}
                    </span>
                  </>
                )}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                fontSize: 9,
                color: 'rgba(255,255,255,0.35)',
                marginTop: 2,
              }}
            >
              {token.mint && <span>{shortenMint(token.mint)}</span>}
              {token.marketCapSol != null && (
                <span style={{ color: '#facc15' }}>
                  {token.marketCapSol.toFixed(1)} SOL
                </span>
              )}
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.3)',
              fontFamily: "'IBM Plex Mono', monospace",
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {formatAge(token.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
});
TokenFeedContent.displayName = 'TokenFeedContent';

/* ================================================================== */
/*  Window Content: Trades Feed                                        */
/* ================================================================== */

const TradesFeedContent = memo<{ trades: PumpNode[]; metrics: GraphMetrics }>(
  ({ trades, metrics }) => {
    const [, tick] = useState(0);
    useEffect(() => {
      const id = setInterval(() => tick((n) => n + 1), 1_000);
      return () => clearInterval(id);
    }, []);

    const buys = trades.filter((t) => t.isBuy === true);
    const sells = trades.filter((t) => t.isBuy === false);
    const whales = trades.filter(
      (t) => t.solAmount != null && t.solAmount >= 1,
    );
    const volume = trades.reduce((s, t) => s + (t.solAmount ?? 0), 0);

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'IBM Plex Mono', monospace",
          height: '100%',
        }}
      >
        {/* Stats bar */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '8px 12px',
            fontSize: 9,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.5)',
            flexWrap: 'wrap',
          }}
        >
          <span>
            <span style={{ color: '#4ade80' }}>▲</span> {buys.length}
          </span>
          <span>
            <span style={{ color: '#f87171' }}>▼</span> {sells.length}
          </span>
          <span>🐋 {whales.length}</span>
          <span style={{ color: '#facc15' }}>{volume.toFixed(1)} SOL</span>
        </div>
        {/* Trade rows */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            padding: 6,
          }}
        >
          {trades.length === 0 ? (
            <div
              style={{
                padding: 16,
                color: '#64748b',
                fontSize: 11,
                textAlign: 'center',
              }}
            >
              Waiting for trades...
            </div>
          ) : (
            trades.slice(0, 40).map((t, i) => {
              const isBuy = t.isBuy === true;
              const isWhale =
                t.solAmount != null && t.solAmount >= 1;
              const dotColor = isBuy ? '#4ade80' : '#f87171';
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 8px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.03)',
                    animation: 'winOpen 0.25s ease-out both',
                    animationDelay: `${i * 30}ms`,
                    fontSize: 10,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{ color: dotColor, fontWeight: 600, minWidth: 28 }}
                  >
                    {isBuy ? 'BUY' : 'SELL'}
                  </span>
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.7)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    ${t.ticker ?? '???'}
                  </span>
                  {t.solAmount != null && (
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {t.solAmount.toFixed(2)} SOL
                    </span>
                  )}
                  {isWhale && (
                    <span style={{ fontSize: 11 }} title="Whale trade">
                      🐋
                    </span>
                  )}
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.25)',
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}
                  >
                    {formatAge(t.timestamp)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  },
);
TradesFeedContent.displayName = 'TradesFeedContent';

/* ================================================================== */
/*  Window Content: Dashboard                                          */
/* ================================================================== */

const DashboardContent = memo<{
  metrics: GraphMetrics;
  recentTokens: PumpNode[];
  recentTrades: PumpNode[];
  isLive: boolean;
}>(({ metrics, recentTokens, recentTrades, isLive }) => {
  const whaleCount = recentTrades.filter(
    (t) => t.solAmount != null && t.solAmount >= 1,
  ).length;
  const buyCount = recentTrades.filter((t) => t.isBuy === true).length;
  const sellCount = recentTrades.filter((t) => t.isBuy === false).length;

  const cards: { label: string; value: string; color: string }[] = [
    {
      label: 'Status',
      value: isLive ? '● LIVE' : '○ DEMO',
      color: isLive ? '#4ade80' : '#facc15',
    },
    {
      label: 'Launches',
      value: String(metrics.activeTokens),
      color: '#38bdf8',
    },
    {
      label: 'Volume',
      value: `${formatVolume(metrics.totalVolume)} SOL`,
      color: '#facc15',
    },
    {
      label: 'Swaps',
      value: String(metrics.liveSwaps),
      color: '#c084fc',
    },
    {
      label: 'Buys / Sells',
      value: `${buyCount} / ${sellCount}`,
      color: '#4ade80',
    },
    {
      label: 'Whales',
      value: String(whaleCount),
      color: '#fb923c',
    },
  ];

  return (
    <div
      style={{
        padding: 12,
        fontFamily: "'IBM Plex Mono', monospace",
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Stat cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 8,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span
              style={{
                fontSize: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#64748b',
              }}
            >
              {c.label}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: c.color,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {c.value}
            </span>
          </div>
        ))}
      </div>

      {/* Recent tokens mini list */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 8,
        }}
      >
        <span
          style={{
            fontSize: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#64748b',
          }}
        >
          Latest Launches
        </span>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            marginTop: 4,
          }}
        >
          {recentTokens.slice(0, 3).map((t) => (
            <div
              key={t.id}
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.6)',
                display: 'flex',
                gap: 6,
              }}
            >
              <span style={{ color: '#4ade80', fontWeight: 600 }}>
                ${t.ticker ?? '???'}
              </span>
              {t.name && (
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.name}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
DashboardContent.displayName = 'DashboardContent';

/* ================================================================== */
/*  Window Content: Vanity Generator                                   */
/* ================================================================== */

const VanityContent = memo(() => (
  <div
    style={{
      padding: 16,
      fontFamily: "'IBM Plex Mono', monospace",
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}
  >
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#e2e8f0',
        }}
      >
        Vanity Address Generator
      </span>
      <span
        style={{
          fontSize: 10,
          color: '#94a3b8',
          lineHeight: 1.5,
        }}
      >
        Generate Solana keypairs with custom prefix or suffix patterns.
        Runs client-side using Web Crypto.
      </span>
    </div>
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#64748b',
        }}
      >
        Example Patterns
      </div>
      {['pump...', 'SOL...', '...moon'].map((p) => (
        <div
          key={p}
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 11,
            color: '#c084fc',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {p}
        </div>
      ))}
    </div>
    <span
      style={{
        fontSize: 9,
        color: '#64748b',
        textAlign: 'center',
      }}
    >
      Full vanity generator coming soon
    </span>
  </div>
));
VanityContent.displayName = 'VanityContent';

/* ================================================================== */
/*  Window Content: Stats HUD                                          */
/* ================================================================== */

function formatVolume(sol: number): string {
  if (sol >= 1_000_000) return `${(sol / 1_000_000).toFixed(1)}M`;
  if (sol >= 1_000) return `${(sol / 1_000).toFixed(1)}K`;
  return sol.toFixed(1);
}

const StatsContent = memo<{
  metrics: GraphMetrics;
  nodeCount: number;
  linkCount: number;
}>(({ metrics, nodeCount, linkCount }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: '12px 16px',
      fontFamily: "'IBM Plex Mono', monospace",
    }}
  >
    {/* Primary metrics */}
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <StatCell label="Agents" value={String(metrics.activeTokens)} />
      <StatCell label="Volume" value={`${formatVolume(metrics.totalVolume)} SOL`} />
      <StatCell label="Transactions" value={String(metrics.liveSwaps)} />
    </div>

    {/* Secondary info */}
    <div
      style={{
        display: 'flex',
        gap: 12,
        fontSize: 10,
        color: '#64748b',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: 8,
      }}
    >
      <span>{nodeCount} nodes</span>
      <span>&middot;</span>
      <span>{linkCount} links</span>
    </div>
  </div>
));
StatsContent.displayName = 'StatsContent';

const StatCell = memo<{ label: string; value: string }>(({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
    <span
      style={{
        fontSize: 9,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: 16,
        fontWeight: 600,
        color: '#e2e8f0',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </span>
  </div>
));
StatCell.displayName = 'StatCell';

/* ================================================================== */
/*  Main Shell                                                         */
/* ================================================================== */

export interface PumpDesktopShellProps {
  metrics: GraphMetrics;
  recentTokens: PumpNode[];
  recentTrades?: PumpNode[];
  isLive: boolean;
  darkMode: boolean;
  onToggleTheme: () => void;
  nodeCount: number;
  linkCount: number;
}

export const PumpDesktopShell = memo<PumpDesktopShellProps>((props) => {
  const {
    metrics,
    recentTokens,
    recentTrades = [],
    isLive,
    darkMode,
    onToggleTheme,
    nodeCount,
    linkCount,
  } = props;

  const wm = usePumpWindows();
  const [startMenuOpen, setStartMenuOpen] = useState(false);

  const toggleStartMenu = useCallback(
    () => setStartMenuOpen((p) => !p),
    [],
  );
  const closeStartMenu = useCallback(() => setStartMenuOpen(false), []);

  const windowMeta: Record<PumpWindowId, { title: string; iconKey: string }> = {
    tokenfeed: { title: 'Token Feed', iconKey: 'tokenfeed' },
    stats: { title: 'Stats', iconKey: 'stats' },
    trades: { title: 'Trades', iconKey: 'trades' },
    dashboard: { title: 'Dashboard', iconKey: 'dashboard' },
    vanity: { title: 'Vanity Gen', iconKey: 'vanity' },
  };

  const renderContent = useCallback(
    (id: PumpWindowId): React.ReactNode => {
      switch (id) {
        case 'tokenfeed':
          return <TokenFeedContent tokens={recentTokens} />;
        case 'trades':
          return <TradesFeedContent trades={recentTrades} metrics={metrics} />;
        case 'dashboard':
          return (
            <DashboardContent
              metrics={metrics}
              recentTokens={recentTokens}
              recentTrades={recentTrades}
              isLive={isLive}
            />
          );
        case 'stats':
          return (
            <StatsContent
              metrics={metrics}
              nodeCount={nodeCount}
              linkCount={linkCount}
            />
          );
        case 'vanity':
          return <VanityContent />;
        default:
          return null;
      }
    },
    [recentTokens, recentTrades, metrics, isLive, nodeCount, linkCount],
  );

  return (
    <>
      {/* Windows */}
      {wm.openWindows.map((w) => {
        const meta = windowMeta[w.id];
        const Icon = getPumpIcon(meta.iconKey);
        return (
          <PumpWindow
            key={w.id}
            title={meta.title}
            icon={<Icon />}
            zIndex={w.zIndex}
            position={w.position}
            size={w.size}
            onClose={() => wm.closeWindow(w.id)}
            onMinimize={() => wm.minimizeWindow(w.id)}
            onFocus={() => wm.focusWindow(w.id)}
            onPositionChange={(pos) => wm.updatePosition(w.id, pos)}
          >
            {renderContent(w.id)}
          </PumpWindow>
        );
      })}

      {/* Start Menu */}
      <PumpStartMenu
        isOpen={startMenuOpen}
        onClose={closeStartMenu}
        onOpenWindow={wm.openWindow}
      />

      {/* Taskbar */}
      <PumpTaskbar
        windows={wm.windows}
        onToggleWindow={wm.toggleWindow}
        onToggleStartMenu={toggleStartMenu}
        startMenuOpen={startMenuOpen}
        isLive={isLive}
        darkMode={darkMode}
        onToggleTheme={onToggleTheme}
      />
    </>
  );
});
PumpDesktopShell.displayName = 'PumpDesktopShell';
