'use client';

import { memo } from 'react';
import type { AgentAggregateStats } from '@/hooks/useAgentEvents';

interface AgentStatsBarProps {
  stats: AgentAggregateStats;
  uptime?: number;
}

function formatUptime(ms?: number): string {
  if (!ms) return '—';
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m`;
  return `${secs}s`;
}

interface StatItemProps {
  label: string;
  value: string | number;
  color: string;
}

const StatItem = memo<StatItemProps>(({ label, value, color }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      padding: '0 16px',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <span style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      {label}
    </span>
    <span style={{ fontSize: 18, fontWeight: 600, color, fontFamily: "'IBM Plex Mono', monospace" }}>
      {value}
    </span>
  </div>
));
StatItem.displayName = 'StatItem';

const AgentStatsBar = memo<AgentStatsBarProps>(({ stats, uptime }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
      background: 'rgba(10,10,15,0.92)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      zIndex: 10,
      fontFamily: "'IBM Plex Mono', monospace",
      overflow: 'hidden',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingLeft: 200 }}>
      <StatItem label="Agents" value={stats.totalAgents} color="#c084fc" />
      <StatItem label="Tasks" value={stats.activeTasks} color="#60a5fa" />
      <StatItem label="Tools/min" value={stats.toolCallsPerMinute} color="#fbbf24" />
      <StatItem label="Completed" value={stats.totalTasksCompleted} color="#34d399" />
      <StatItem label="Errors" value={stats.totalTasksFailed} color="#f87171" />
      {uptime !== undefined && (
        <div style={{ padding: '0 16px' }}>
          <span style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Uptime</span>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{formatUptime(uptime)}</div>
        </div>
      )}
    </div>
    <div style={{ marginLeft: 'auto', padding: '0 16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 9,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#34d399',
            animation: 'livePulse 2s ease-in-out infinite',
          }}
        />
        Live
      </div>
    </div>
    <style>{`@keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
  </div>
));

AgentStatsBar.displayName = 'AgentStatsBar';
export default AgentStatsBar;
