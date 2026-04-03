'use client';

import { memo, useMemo } from 'react';
import type { ExecutorState } from '@web3viz/core';
import { agentThemeTokens } from '@/packages/ui/src/tokens/agent-colors';

interface ExecutorBannerProps {
  executorState: ExecutorState | null;
  connected: boolean;
  lastHeartbeat?: number;
  sidebarWidth?: number;
  feedWidth?: number;
  colorScheme?: 'dark' | 'light';
}

type Health = 'healthy' | 'degraded' | 'offline';

function formatUptime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m`;
  return `${secs}s`;
}

const HEALTH_COLORS: Record<Health, { bg: string; border: string; text: string }> = {
  healthy: { bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)', text: '#34d399' },
  degraded: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', text: '#fbbf24' },
  offline: { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', text: '#f87171' },
};

const ExecutorBanner = memo<ExecutorBannerProps>(({ executorState, connected, lastHeartbeat, sidebarWidth = 200, feedWidth = 260, colorScheme = 'dark' }) => {
  const themeTokens = agentThemeTokens[colorScheme];
  const health = useMemo<Health>(() => {
    if (!connected && !executorState) return 'offline';
    if (executorState?.status === 'error') return 'degraded';
    if (lastHeartbeat) {
      const age = Date.now() - lastHeartbeat;
      if (age > 90_000) return 'offline';
      if (age > 45_000) return 'degraded';
    }
    return 'healthy';
  }, [connected, executorState, lastHeartbeat]);

  const colors = HEALTH_COLORS[health];

  const message = useMemo(() => {
    if (health === 'offline') {
      if (lastHeartbeat) {
        const ageSecs = Math.floor((Date.now() - lastHeartbeat) / 1000);
        return `✗ EXECUTOR OFFLINE · last seen ${ageSecs}s ago`;
      }
      return '✗ EXECUTOR OFFLINE · mock mode active';
    }
    if (health === 'degraded') {
      const ageSecs = lastHeartbeat ? Math.floor((Date.now() - lastHeartbeat) / 1000) : 0;
      return `⚠ EXECUTOR SLOW · last heartbeat ${ageSecs}s ago`;
    }
    const agents = executorState?.activeAgents.length ?? 0;
    const uptime = executorState ? formatUptime(executorState.uptime) : '—';
    return `● EXECUTOR RUNNING · ${agents} agents · uptime ${uptime}`;
  }, [health, executorState, lastHeartbeat]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        top: 0,
        left: sidebarWidth,
        right: feedWidth,
        zIndex: 15,
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        padding: '4px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: colors.text,
        transition: 'all 0.3s ease',
      }}
    >
      {message}
    </div>
  );
});

ExecutorBanner.displayName = 'ExecutorBanner';
export default ExecutorBanner;
