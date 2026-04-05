import { describe, it, expect } from 'vitest';
import {
  isObject,
  safeJsonParse,
  getString,
  getNumber,
  getBoolean,
  isValidEthAddress,
  isValidSolAddress,
  isValidHexData,
  isValidEthLog,
  parseFiniteFloat,
} from '../shared/validate';

describe('isObject', () => {
  it('returns true for plain objects', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isObject(null)).toBe(false);
  });

  it('returns false for arrays', () => {
    expect(isObject([])).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isObject('string')).toBe(false);
    expect(isObject(42)).toBe(false);
    expect(isObject(undefined)).toBe(false);
  });
});

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeJsonParse('[1,2,3]')).toEqual([1, 2, 3]);
    expect(safeJsonParse('"hello"')).toBe('hello');
  });

  it('returns null for invalid JSON', () => {
    expect(safeJsonParse('not json')).toBeNull();
    expect(safeJsonParse('')).toBeNull();
    expect(safeJsonParse('{broken')).toBeNull();
  });
});

describe('getString', () => {
  it('extracts string values', () => {
    expect(getString({ name: 'test' }, 'name')).toBe('test');
  });

  it('returns fallback for missing keys', () => {
    expect(getString({}, 'name')).toBe('');
    expect(getString({}, 'name', 'default')).toBe('default');
  });

  it('returns fallback for non-string values', () => {
    expect(getString({ n: 42 }, 'n')).toBe('');
    expect(getString({ n: null }, 'n', 'fb')).toBe('fb');
  });
});

describe('getNumber', () => {
  it('extracts number values', () => {
    expect(getNumber({ val: 42 }, 'val')).toBe(42);
  });

  it('parses string numbers', () => {
    expect(getNumber({ val: '123.5' }, 'val')).toBe(123.5);
  });

  it('returns fallback for NaN strings', () => {
    expect(getNumber({ val: 'not a number' }, 'val')).toBe(0);
    expect(getNumber({ val: 'not a number' }, 'val', -1)).toBe(-1);
  });

  it('returns fallback for NaN number', () => {
    expect(getNumber({ val: NaN }, 'val')).toBe(0);
  });

  it('returns fallback for missing keys', () => {
    expect(getNumber({}, 'val')).toBe(0);
  });
});

describe('getBoolean', () => {
  it('extracts boolean values', () => {
    expect(getBoolean({ flag: true }, 'flag')).toBe(true);
    expect(getBoolean({ flag: false }, 'flag')).toBe(false);
  });

  it('returns fallback for non-boolean values', () => {
    expect(getBoolean({ flag: 'yes' }, 'flag')).toBe(false);
    expect(getBoolean({}, 'flag', true)).toBe(true);
  });
});

describe('isValidEthAddress', () => {
  it('accepts valid eth addresses', () => {
    expect(isValidEthAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
    expect(isValidEthAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true);
  });

  it('rejects invalid eth addresses', () => {
    expect(isValidEthAddress('0x1234')).toBe(false);
    expect(isValidEthAddress('1234567890abcdef1234567890abcdef12345678')).toBe(false);
    expect(isValidEthAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false);
    expect(isValidEthAddress(42)).toBe(false);
    expect(isValidEthAddress(null)).toBe(false);
  });
});

describe('isValidSolAddress', () => {
  it('accepts valid solana addresses', () => {
    expect(isValidSolAddress('11111111111111111111111111111111')).toBe(true);
    expect(isValidSolAddress('So11111111111111111111111111111111111111112')).toBe(true);
  });

  it('rejects invalid solana addresses', () => {
    expect(isValidSolAddress('short')).toBe(false);
    expect(isValidSolAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(false);
    expect(isValidSolAddress(42)).toBe(false);
  });
});

describe('isValidHexData', () => {
  it('accepts valid hex data', () => {
    expect(isValidHexData('0x')).toBe(true);
    expect(isValidHexData('0x1234')).toBe(true);
    expect(isValidHexData('0xabcdef')).toBe(true);
  });

  it('rejects odd-length hex', () => {
    expect(isValidHexData('0x123')).toBe(false);
  });

  it('rejects non-hex chars', () => {
    expect(isValidHexData('0xGG')).toBe(false);
  });

  it('rejects missing 0x prefix', () => {
    expect(isValidHexData('1234')).toBe(false);
  });
});

describe('isValidEthLog', () => {
  it('accepts valid log objects', () => {
    expect(
      isValidEthLog({
        address: '0x123',
        topics: ['0xabc'],
        data: '0x',
        transactionHash: '0xdef',
        logIndex: '0x0',
        blockNumber: '0x1',
      }),
    ).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(isValidEthLog(null)).toBe(false);
    expect(isValidEthLog('string')).toBe(false);
  });

  it('rejects objects with missing fields', () => {
    expect(isValidEthLog({ address: '0x' })).toBe(false);
    expect(isValidEthLog({ address: '0x', topics: [] })).toBe(false);
  });

  it('rejects non-string address', () => {
    expect(isValidEthLog({ address: 42, topics: ['0x'], data: '0x', transactionHash: '0x' })).toBe(
      false,
    );
  });
});

describe('parseFiniteFloat', () => {
  it('parses valid floats', () => {
    expect(parseFiniteFloat('3.14')).toBe(3.14);
    expect(parseFiniteFloat('42')).toBe(42);
    expect(parseFiniteFloat('-1.5')).toBe(-1.5);
    expect(parseFiniteFloat('0')).toBe(0);
  });

  it('returns null for Infinity', () => {
    expect(parseFiniteFloat('Infinity')).toBeNull();
    expect(parseFiniteFloat('-Infinity')).toBeNull();
  });

  it('returns null for NaN', () => {
    expect(parseFiniteFloat('not a number')).toBeNull();
    expect(parseFiniteFloat('')).toBeNull();
  });
});
