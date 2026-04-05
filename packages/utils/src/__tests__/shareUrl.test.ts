import { describe, it, expect } from 'vitest';
import { parseShareParams, buildShareText } from '../shareUrl';

describe('parseShareParams', () => {
  it('parses valid color params', () => {
    const result = parseShareParams('?bg=1a1a2e&pc=60a5fa&uc=f472b6');
    expect(result.colors).toEqual({
      background: '#1a1a2e',
      protocol: '#60a5fa',
      user: '#f472b6',
    });
  });

  it('parses address param', () => {
    const result = parseShareParams('?bg=000000&address=0xABC');
    expect(result.address).toBe('0xABC');
  });

  it('ignores invalid hex colors', () => {
    const result = parseShareParams('?bg=ZZZZZZ&pc=60a5fa');
    expect(result.colors.background).toBeUndefined();
    expect(result.colors.protocol).toBe('#60a5fa');
  });

  it('returns empty colors for missing params', () => {
    const result = parseShareParams('');
    expect(result.colors).toEqual({});
    expect(result.address).toBeUndefined();
  });
});

describe('buildShareText', () => {
  it('formats stats into share text', () => {
    const text = buildShareText(
      { tokens: 1500, volume: 2_500_000, transactions: 50_000 },
      'https://example.com/world',
    );
    expect(text).toContain('1.5K tokens');
    expect(text).toContain('$2.5M volume');
    expect(text).toContain('50.0K transactions');
    expect(text).toContain('https://example.com/world');
  });

  it('formats small numbers without suffix', () => {
    const text = buildShareText(
      { tokens: 5, volume: 100, transactions: 42 },
      'https://example.com',
    );
    expect(text).toContain('5 tokens');
    expect(text).toContain('$100 volume');
    expect(text).toContain('42 transactions');
  });
});
