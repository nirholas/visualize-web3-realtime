import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  timeAgo,
  formatUptime,
  formatDuration,
} from '../shared';

// ============================================================================
// formatNumber
// ============================================================================

describe('formatNumber', () => {
  it('formats millions', () => {
    expect(formatNumber(2_500_000)).toBe('2.5M');
  });

  it('formats thousands', () => {
    expect(formatNumber(1_500)).toBe('1.5K');
  });

  it('formats small numbers with locale string', () => {
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(0)).toBe('0');
  });

  it('formats numbers just below threshold', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(999_999)).toBe('1000.0K');
  });
});

// ============================================================================
// timeAgo (hydration-safe version — takes explicit `now`)
// ============================================================================

describe('timeAgo', () => {
  it('returns "just now" for < 5s difference', () => {
    const now = 100_000;
    expect(timeAgo(now - 2000, now)).toBe('just now');
    expect(timeAgo(now - 4999, now)).toBe('just now');
  });

  it('returns seconds ago', () => {
    const now = 100_000;
    expect(timeAgo(now - 30_000, now)).toBe('30s ago');
    expect(timeAgo(now - 59_000, now)).toBe('59s ago');
  });

  it('returns minutes ago', () => {
    const now = 1_000_000;
    expect(timeAgo(now - 120_000, now)).toBe('2m ago');
    expect(timeAgo(now - 60_000, now)).toBe('1m ago');
  });

  it('returns hours ago', () => {
    const now = 10_000_000;
    expect(timeAgo(now - 3_600_000, now)).toBe('1h ago');
    expect(timeAgo(now - 7_200_000, now)).toBe('2h ago');
  });
});

// ============================================================================
// formatUptime
// ============================================================================

describe('formatUptime', () => {
  it('returns "0s" for falsy input', () => {
    expect(formatUptime(0)).toBe('0s');
    expect(formatUptime(undefined)).toBe('0s');
  });

  it('formats seconds', () => {
    expect(formatUptime(5_000)).toBe('5s');
    expect(formatUptime(59_000)).toBe('59s');
  });

  it('formats minutes', () => {
    expect(formatUptime(120_000)).toBe('2m');
    expect(formatUptime(3_540_000)).toBe('59m');
  });

  it('formats hours with minutes', () => {
    expect(formatUptime(3_600_000)).toBe('1h 0m');
    expect(formatUptime(5_400_000)).toBe('1h 30m');
  });

  it('formats days with hours', () => {
    expect(formatUptime(86_400_000)).toBe('1d 0h');
    expect(formatUptime(90_000_000)).toBe('1d 1h');
  });
});

// ============================================================================
// formatDuration
// ============================================================================

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(5_000)).toBe('5s');
    expect(formatDuration(45_000)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90_000)).toBe('1m 30s');
    expect(formatDuration(300_000)).toBe('5m 0s');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0s');
  });
});
