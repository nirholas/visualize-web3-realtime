import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isValidHex,
  normalizeHex,
  escapeHtml,
  formatStat,
  formatVolume,
  formatAmount,
  truncateAddress,
  timeAgo,
} from '../shared';

describe('isValidHex', () => {
  it('accepts 6-char hex with #', () => {
    expect(isValidHex('#1a2b3c')).toBe(true);
    expect(isValidHex('#AABBCC')).toBe(true);
  });

  it('accepts 3-char hex with #', () => {
    expect(isValidHex('#abc')).toBe(true);
  });

  it('accepts hex without # prefix', () => {
    expect(isValidHex('1a2b3c')).toBe(true);
  });

  it('rejects invalid hex', () => {
    expect(isValidHex('#gggggg')).toBe(false);
    expect(isValidHex('#12345')).toBe(false);
    expect(isValidHex('')).toBe(false);
  });
});

describe('normalizeHex', () => {
  it('normalizes 6-char hex to lowercase with #', () => {
    expect(normalizeHex('#AABBCC')).toBe('#aabbcc');
    expect(normalizeHex('AABBCC')).toBe('#aabbcc');
  });

  it('expands 3-char hex to 6-char', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
    expect(normalizeHex('abc')).toBe('#aabbcc');
  });

  it('returns empty string for invalid hex', () => {
    expect(normalizeHex('not-hex')).toBe('');
    expect(normalizeHex('#12345')).toBe('');
  });
});

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('formatStat', () => {
  it('formats billions', () => {
    expect(formatStat(1_500_000_000)).toBe('1.5B');
  });

  it('formats millions', () => {
    expect(formatStat(2_500_000)).toBe('2.5M');
  });

  it('formats thousands', () => {
    expect(formatStat(1_500)).toBe('1.5K');
  });

  it('formats small numbers with precision', () => {
    expect(formatStat(5)).toBe('5.00');
    expect(formatStat(42)).toBe('42');
  });

  it('applies prefix', () => {
    expect(formatStat(1_000_000, '$')).toBe('$1.0M');
  });
});

describe('formatVolume', () => {
  it('formats with $ prefix', () => {
    expect(formatVolume(1_000_000)).toBe('$1.0M');
    expect(formatVolume(500)).toBe('$500');
  });
});

describe('formatAmount', () => {
  it('formats very small amounts', () => {
    expect(formatAmount(0.0001)).toBe('<0.001');
  });

  it('formats millions', () => {
    expect(formatAmount(2_500_000)).toBe('2.5M');
  });

  it('formats thousands', () => {
    expect(formatAmount(1_500)).toBe('1.5k');
  });

  it('formats amounts >= 1 with 2 decimals', () => {
    expect(formatAmount(42.567)).toBe('42.57');
  });

  it('formats fractional amounts with 3 decimals', () => {
    expect(formatAmount(0.123)).toBe('0.123');
  });

  it('adds symbol as suffix', () => {
    expect(formatAmount(1.5, 'SOL')).toBe('1.50 SOL');
  });

  it('uses $ prefix for USD symbol', () => {
    expect(formatAmount(1.5, 'USD')).toBe('$1.50');
    expect(formatAmount(1.5, '$')).toBe('$1.50');
  });
});

describe('truncateAddress', () => {
  it('truncates long addresses', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    expect(truncateAddress(addr)).toBe('0x1234...5678');
  });

  it('returns short addresses unchanged', () => {
    expect(truncateAddress('0x12345678')).toBe('0x12345678');
  });

  it('respects custom prefix/suffix lengths', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    expect(truncateAddress(addr, 8, 6)).toBe('0x123456...345678');
  });
});

describe('timeAgo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "just now" for recent timestamps', () => {
    expect(timeAgo(Date.now() - 2000)).toBe('just now');
  });

  it('returns seconds ago', () => {
    expect(timeAgo(Date.now() - 30_000)).toBe('30s ago');
  });

  it('returns minutes ago', () => {
    expect(timeAgo(Date.now() - 5 * 60_000)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    expect(timeAgo(Date.now() - 3 * 3600_000)).toBe('3h ago');
  });
});
