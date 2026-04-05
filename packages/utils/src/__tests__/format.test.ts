import { describe, it, expect } from 'vitest';
import { formatNumber, formatSol, truncateAddress, clamp, lerp } from '../format';

describe('formatNumber', () => {
  it('formats billions', () => {
    expect(formatNumber(1_500_000_000)).toBe('1.5B');
    expect(formatNumber(1_000_000_000)).toBe('1.0B');
  });

  it('formats millions', () => {
    expect(formatNumber(2_500_000)).toBe('2.5M');
    expect(formatNumber(1_000_000)).toBe('1.0M');
  });

  it('formats thousands', () => {
    expect(formatNumber(1_500)).toBe('1.5K');
    expect(formatNumber(1_000)).toBe('1.0K');
  });

  it('formats small numbers without suffix', () => {
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(0)).toBe('0');
  });

  it('respects custom decimal places', () => {
    expect(formatNumber(1_234_567, 2)).toBe('1.23M');
    expect(formatNumber(1_234_567, 0)).toBe('1M');
  });
});

describe('formatSol', () => {
  it('formats large SOL amounts with compact suffix', () => {
    expect(formatSol(5_000_000_000_000)).toBe('5.0K SOL');
  });

  it('formats SOL >= 1 with 2 decimals', () => {
    expect(formatSol(1_500_000_000)).toBe('1.50 SOL');
    expect(formatSol(1_000_000_000)).toBe('1.00 SOL');
  });

  it('formats small SOL with 4 decimals', () => {
    expect(formatSol(500_000)).toBe('0.0005 SOL');
    expect(formatSol(1_000)).toBe('0.0000 SOL');
  });
});

describe('truncateAddress', () => {
  it('truncates long addresses', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    expect(truncateAddress(addr)).toBe('0x12...5678');
  });

  it('returns short addresses unchanged', () => {
    expect(truncateAddress('0x1234')).toBe('0x1234');
  });

  it('respects custom char count', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    expect(truncateAddress(addr, 6)).toBe('0x1234...345678');
  });
});

describe('clamp', () => {
  it('clamps below min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps above max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('handles edge values', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('returns a at t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns b at t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it('extrapolates beyond 0-1', () => {
    expect(lerp(0, 10, 2)).toBe(20);
    expect(lerp(0, 10, -1)).toBe(-10);
  });
});
