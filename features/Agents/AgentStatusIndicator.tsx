'use client';

import { memo } from 'react';

export type AgentStatus = 'active' | 'idle' | 'error' | 'shutdown';

interface AgentStatusIndicatorProps {
  status: AgentStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  pulse?: boolean;
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  active: '#34d399',
  idle: '#60a5fa',
  error: '#f87171',
  shutdown: '#6b7280',
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  active: 'Active',
  idle: 'Idle',
  error: 'Error',
  shutdown: 'Offline',
};

const SIZE_PX: Record<string, number> = { sm: 6, md: 8, lg: 12 };

export const AgentStatusIndicator = memo<AgentStatusIndicatorProps>(
  ({ status, size = 'md', showLabel = false, pulse = false }) => {
    const px = SIZE_PX[size] ?? 8;
    const color = STATUS_COLORS[status];

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div
          style={{
            width: px,
            height: px,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
            animation: pulse && status === 'active' ? 'statusPulse 2s ease-in-out infinite' : 'none',
          }}
        />
        {showLabel && (
          <span
            style={{
              fontSize: 10,
              color,
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {STATUS_LABELS[status]}
          </span>
        )}
        <style>{`@keyframes statusPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    );
  },
);

AgentStatusIndicator.displayName = 'AgentStatusIndicator';
