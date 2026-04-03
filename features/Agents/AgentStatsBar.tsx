'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { agentThemeTokens } from '@/packages/ui/src/tokens/agent-colors';

// ---------------------------------------------------------------------------
// Animated Value Hook
// ---------------------------------------------------------------------------

function useAnimatedValue(target: number, duration = 400): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    prevRef.current = to;

    if (from === to) return;

    const start = performance.now();
    const diff = to - from;

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + diff * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

// ---------------------------------------------------------------------------
// Number Formatting
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ---------------------------------------------------------------------------
// Stat Pill
// ---------------------------------------------------------------------------

const StatPill = memo<{
  label: string;
  value: number;
  accentColor?: string;
  colorScheme?: 'dark' | 'light';
}>(({ label, value, accentColor = '#a78bfa', colorScheme = 'dark' }) => {
  const animated = useAnimatedValue(value);
  const tokens = agentThemeTokens[colorScheme];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '6px 12px',
        background: `${tokens.agentHub}50`,
        border: `1px solid ${accentColor}20`,
        borderRadius: 8,
        minWidth: 90,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 400,
          color: tokens.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: accentColor,
          lineHeight: 1.4,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatNumber(animated)}
      </span>
    </div>
  );
});

StatPill.displayName = 'StatPill';

// ---------------------------------------------------------------------------
// Agent Stats Bar
// ---------------------------------------------------------------------------

export interface AgentStatsBarProps {
  totalAgents: number;
  activeTasks: number;
  toolCallsPerMinute: number;
  totalCompleted: number;
  totalErrors: number;
  colorScheme?: 'dark' | 'light';
  sidebarWidth?: number;
}

const AgentStatsBar = memo<AgentStatsBarProps>(
  ({ totalAgents, activeTasks, toolCallsPerMinute, totalCompleted, totalErrors, colorScheme = 'dark', sidebarWidth = 200 }) => {
    const tokens = agentThemeTokens[colorScheme];
    return (
      <div
        role="status"
        aria-label="Agent system statistics"
        style={{
          position: 'absolute',
          bottom: 16,
          left: `calc(50% + ${sidebarWidth / 2}px)`,
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          fontFamily: "'IBM Plex Mono', monospace",
          borderRadius: 12,
          background: `${tokens.sidebar}`,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${tokens.edge}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <StatPill label="Agents" value={totalAgents} accentColor={tokens.agentHubActive} colorScheme={colorScheme} />
        <StatPill label="Tasks" value={activeTasks} accentColor={tokens.taskActive} colorScheme={colorScheme} />
        <StatPill label="Tools/Min" value={toolCallsPerMinute} accentColor={tokens.taskComplete} colorScheme={colorScheme} />
        <StatPill label="Completed" value={totalCompleted} accentColor={tokens.taskPlanning} colorScheme={colorScheme} />
        <StatPill label="Errors" value={totalErrors} accentColor={tokens.taskFailed} colorScheme={colorScheme} />
      </div>
    );
  },
);

AgentStatsBar.displayName = 'AgentStatsBar';

export default AgentStatsBar;
