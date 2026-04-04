'use client';

import { memo } from 'react';
import { useDesktopClock } from './useDesktopClock';

interface ConnectionInfo {
  name: string;
  connected: boolean;
}

interface SystemTrayProps {
  connections: Record<string, ConnectionInfo[]>;
  isLive: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const SystemTray = memo<SystemTrayProps>(({
  connections,
  isLive,
  isPlaying,
  onTogglePlay,
}) => {
  const { time, date } = useDesktopClock();

  const connEntries = Object.entries(connections);
  const totalConnected = connEntries.reduce(
    (sum, [, conns]) => sum + conns.filter((c) => c.connected).length, 0,
  );
  const totalConns = connEntries.reduce((sum, [, conns]) => sum + conns.length, 0);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 12px',
      borderRadius: 8,
      background: 'rgba(255, 255, 255, 0.04)',
    }}>
      {/* Play / Pause */}
      <button
        onClick={onTogglePlay}
        type="button"
        title={isPlaying ? 'Pause' : 'Play'}
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          color: isPlaying ? '#22c55e' : '#64748b',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontFamily: "'IBM Plex Mono', monospace",
          transition: 'color 150ms',
        }}
      >
        {isPlaying ? '▶' : '⏸'}
      </button>

      {/* Live indicator */}
      {isLive && isPlaying && (
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          color: '#22c55e',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          LIVE
        </span>
      )}

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

      {/* Connection status */}
      {totalConns > 0 && (
        <div
          title={`${totalConnected}/${totalConns} connections active`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'default',
          }}
        >
          {/* Wifi-like icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={totalConnected > 0 ? '#22c55e' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill={totalConnected > 0 ? '#22c55e' : '#ef4444'} />
          </svg>
        </div>
      )}

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

      {/* Clock */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 0,
        cursor: 'default',
        minWidth: 70,
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: '#e2e8f0',
          fontFamily: "'IBM Plex Mono', monospace",
          lineHeight: 1.2,
        }}>
          {time}
        </span>
        <span style={{
          fontSize: 9,
          color: '#64748b',
          fontFamily: "'IBM Plex Mono', monospace",
          lineHeight: 1.2,
        }}>
          {date}
        </span>
      </div>
    </div>
  );
});

SystemTray.displayName = 'SystemTray';
