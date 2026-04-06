/**
 * Shared UI utilities for Agent features.
 *
 * Re-exports common helpers from World's shared utils and adds
 * agent-specific formatting functions. Mirrors the World utility
 * layer pattern (features/World/utils/shared.ts).
 */

// Re-export common utilities from World for use in Agent components
export {
  formatStat,
  formatAmount,
  truncateAddress,
  escapeHtml,
  isValidHex,
  normalizeHex,
  MONO_FONT,
} from '../../World/utils/shared';

// ============================================================================
// Animated Value Hook (shared between StatsBar and other counters)
// ============================================================================

import { useEffect, useRef, useState } from 'react';

export function useAnimatedValue(target: number, duration = 400): number {
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

// ============================================================================
// Number Formatting (agent-specific compact format)
// ============================================================================

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ============================================================================
// Time Helpers
// ============================================================================

/**
 * Hydration-safe relative time string.
 * Accepts an explicit `now` timestamp to avoid calling Date.now() in render.
 */
export function timeAgo(ts: number, now: number): string {
  const diff = now - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

/**
 * Human-readable uptime/duration string from milliseconds.
 */
export function formatUptime(ms: number | undefined): string {
  if (!ms) return '0s';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * Format a task duration in compact form.
 */
export function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}
