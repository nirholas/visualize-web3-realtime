'use client';

import { memo, useEffect, useMemo, useState } from 'react';
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

type Health = 'healthy' | 'degraded' | 'offline' | 'reconnecting';

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
  reconnecting: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', text: '#fbbf24' },
};

const RECONNECT_INTERVAL = 5; // seconds

const ExecutorBanner = memo<ExecutorBannerProps>(({ executorState, connected, lastHeartbeat, sidebarWidth = 200, feedWidth = 260, colorScheme = 'dark' }) => {
  const themeTokens = agentThemeTokens[colorScheme];
  const [reconnectCountdown, setReconnectCountdown] = useState(RECONNECT_INTERVAL);
  const [health, setHealth] = useState<Health>('offline');

  // Compute health in an effect to avoid Date.now() hydration mismatch
  useEffect(() => {
    const compute = (): Health => {
      if (!connected && !executorState) return 'offline';
      if (executorState?.status === 'error') return 'degraded';
      if (lastHeartbeat) {
        const age = Date.now() - lastHeartbeat;
        if (age > 90_000) return 'offline';
        if (age > 45_000) return 'reconnecting';
      }
      return 'healthy';
    };
    setHealth(compute());
    const id = setInterval(() => setHealth(compute()), 5_000);
    return () => clearInterval(id);
  }, [connected, executorState, lastHeartbeat]);

  // Reconnecting countdown timer
  useEffect(() => {
    if (health !== 'reconnecting' && health !== 'offline') {
      setReconnectCountdown(RECONNECT_INTERVAL);
      return;
    }
    const interval = setInterval(() => {
      setReconnectCountdown((prev) => (prev <= 1 ? RECONNECT_INTERVAL : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [health]);

  const colors = HEALTH_COLORS[health];

  const [ageSecs, setAgeSecs] = useState(0);

  // Keep age counter fresh — avoids Date.now() in render path
  useEffect(() => {
    if (!lastHeartbeat) return;
    setAgeSecs(Math.floor((Date.now() - lastHeartbeat) / 1000));
    const id = setInterval(() => setAgeSecs(Math.floor((Date.now() - lastHeartbeat) / 1000)), 1_000);
    return () => clearInterval(id);
  }, [lastHeartbeat]);

  const message = useMemo(() => {
    if (health === 'offline') {
      if (lastHeartbeat) {
        return `✗ EXECUTOR OFFLINE · last seen ${ageSecs}s ago · retry in ${reconnectCountdown}s`;
      }
      return '✗ EXECUTOR OFFLINE · mock mode active';
    }
    if (health === 'reconnecting') {
      return `⟳ RECONNECTING... · retry in ${reconnectCountdown}s`;
    }
    if (health === 'degraded') {
      return `⚠ EXECUTOR SLOW · last heartbeat ${ageSecs}s ago`;
    }
    const agents = executorState?.activeAgents.length ?? 0;
    const uptime = executorState ? formatUptime(executorState.uptime) : '—';
    return `● EXECUTOR RUNNING · ${agents} agents · uptime ${uptime}`;
  }, [health, executorState, lastHeartbeat, reconnectCountdown, ageSecs]);

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
