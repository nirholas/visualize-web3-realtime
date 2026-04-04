'use client';

import { memo, useState } from 'react';
import { GLASS, TASKBAR_HEIGHT, APPS } from './desktopConstants';
import type { WindowId, WindowState } from './desktopTypes';
import { TaskbarAppIcon } from './TaskbarAppIcon';
import { SystemTray } from './SystemTray';
import { StartMenuIcon } from './AppIcons';
import { getAppIcon } from './AppIcons';

interface ConnectionInfo {
  name: string;
  connected: boolean;
}

interface TaskbarProps {
  windows: Record<WindowId, WindowState>;
  onToggleWindow: (id: WindowId) => void;
  onToggleStartMenu: () => void;
  startMenuOpen: boolean;
  connections: Record<string, ConnectionInfo[]>;
  isLive: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const Taskbar = memo<TaskbarProps>(({
  windows,
  onToggleWindow,
  onToggleStartMenu,
  startMenuOpen,
  connections,
  isLive,
  isPlaying,
  onTogglePlay,
}) => {
  const [startHovered, setStartHovered] = useState(false);

  // Only show pinned apps + any open apps in the taskbar
  const pinnedIds = APPS.filter((a) => a.pinned).map((a) => a.id);
  const openIds = Object.values(windows)
    .filter((w) => w.isOpen && !pinnedIds.includes(w.id))
    .map((w) => w.id);
  const visibleIds = [...pinnedIds, ...openIds];

  return (
    <div style={{
      position: 'fixed',
      bottom: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      height: TASKBAR_HEIGHT,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      background: GLASS.bgSolid,
      backdropFilter: GLASS.blur,
      WebkitBackdropFilter: GLASS.blur,
      border: GLASS.border,
      borderRadius: GLASS.radiusLg,
      boxShadow: GLASS.shadow,
      zIndex: 9000,
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
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
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

      {/* App icons */}
      {visibleIds.map((id) => {
        const w = windows[id];
        const Icon = getAppIcon(id);
        return (
          <TaskbarAppIcon
            key={id}
            id={id}
            label={APPS.find((a) => a.id === id)?.label ?? id}
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
      <SystemTray
        connections={connections}
        isLive={isLive}
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
      />
    </div>
  );
});

Taskbar.displayName = 'Taskbar';
