/**
 * Shared UI utilities for World features.
 * Centralizes hex validation, number formatting, address truncation,
 * and common style constants that were duplicated across components.
 */

// ============================================================================
// Constants
// ============================================================================

export const MONO_FONT = "'IBM Plex Mono', monospace";

// ============================================================================
// Hex Color Validation
// ============================================================================

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidHex(v: string): boolean {
  return HEX_RE.test(v.startsWith('#') ? v : `#${v}`);
}

export function normalizeHex(v: string): string {
  const raw = v.startsWith('#') ? v : `#${v}`;
  if (!HEX_RE.test(raw)) return '';
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return raw.toLowerCase();
}

/**
 * Escape user-provided strings for safe embedding in HTML attributes.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format a large number with compact suffixes. Used across StatsBar,
 * ShareOverlay, LiveFeed, and page-level stat pills.
 */
export function formatStat(value: number, prefix = ''): string {
  if (value >= 1_000_000_000) return `${prefix}${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${prefix}${(value / 1000).toFixed(1)}K`;
  return `${prefix}${value.toFixed(value < 10 ? 2 : 0)}`;
}

/**
 * Format a volume value with $ prefix and compact suffixes.
 */
export function formatVolume(v: number): string {
  return formatStat(v, '$');
}

/**
 * Format a token/trade amount with appropriate precision.
 */
export function formatAmount(amount: number, symbol?: string): string {
  const s = symbol || '';
  const prefix = s === 'USD' || s === '$' ? '$' : '';
  const suffix = prefix ? '' : s ? ` ${s}` : '';

  if (amount < 0.001) return `${prefix}<0.001${suffix}`;
  if (amount >= 1_000_000) return `${prefix}${(amount / 1_000_000).toFixed(1)}M${suffix}`;
  if (amount >= 1000) return `${prefix}${(amount / 1000).toFixed(1)}k${suffix}`;
  if (amount >= 1) return `${prefix}${amount.toFixed(2)}${suffix}`;
  return `${prefix}${amount.toFixed(3)}${suffix}`;
}

// ============================================================================
// Address Truncation
// ============================================================================

/**
 * Truncate a blockchain address for display. Consistent 6...4 format.
 */
export function truncateAddress(addr: string, prefixChars = 6, suffixChars = 4): string {
  if (addr.length <= prefixChars + suffixChars + 3) return addr;
  return `${addr.slice(0, prefixChars)}...${addr.slice(-suffixChars)}`;
}

// ============================================================================
// Time
// ============================================================================

/**
 * Human-readable relative time string.
 */
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}
