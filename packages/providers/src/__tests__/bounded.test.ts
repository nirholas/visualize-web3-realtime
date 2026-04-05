import { describe, it, expect } from 'vitest';
import { BoundedMap, BoundedSet } from '../shared/BoundedMap';

describe('BoundedMap', () => {
  it('stores and retrieves entries', () => {
    const map = new BoundedMap<string, number>(5);
    map.set('a', 1);
    map.set('b', 2);
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
    expect(map.size).toBe(2);
  });

  it('evicts oldest entries when capacity exceeded', () => {
    const map = new BoundedMap<string, number>(3);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    map.set('d', 4);
    expect(map.has('a')).toBe(false);
    expect(map.has('b')).toBe(true);
    expect(map.has('d')).toBe(true);
    expect(map.size).toBe(3);
  });

  it('refreshes existing keys on update (moves to end)', () => {
    const map = new BoundedMap<string, number>(3);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    map.set('a', 10);
    map.set('d', 4);
    expect(map.has('a')).toBe(true);
    expect(map.get('a')).toBe(10);
    expect(map.has('b')).toBe(false);
    expect(map.size).toBe(3);
  });

  it('works with initial entries', () => {
    const map = new BoundedMap<string, number>(2, [
      ['a', 1],
      ['b', 2],
    ]);
    expect(map.size).toBe(2);
    expect(map.get('a')).toBe(1);
  });

  it('handles capacity of 1', () => {
    const map = new BoundedMap<string, number>(1);
    map.set('a', 1);
    map.set('b', 2);
    expect(map.size).toBe(1);
    expect(map.has('a')).toBe(false);
    expect(map.has('b')).toBe(true);
  });
});

describe('BoundedSet', () => {
  it('stores and checks membership', () => {
    const set = new BoundedSet<string>(5);
    set.add('a');
    set.add('b');
    expect(set.has('a')).toBe(true);
    expect(set.has('b')).toBe(true);
    expect(set.size).toBe(2);
  });

  it('evicts oldest entries when capacity exceeded', () => {
    const set = new BoundedSet<string>(3);
    set.add('a');
    set.add('b');
    set.add('c');
    set.add('d');
    expect(set.has('a')).toBe(false);
    expect(set.has('d')).toBe(true);
    expect(set.size).toBe(3);
  });

  it('refreshes existing values on re-add (moves to end)', () => {
    const set = new BoundedSet<string>(3);
    set.add('a');
    set.add('b');
    set.add('c');
    set.add('a');
    set.add('d');
    expect(set.has('a')).toBe(true);
    expect(set.has('b')).toBe(false);
    expect(set.size).toBe(3);
  });

  it('works with initial values', () => {
    const set = new BoundedSet<number>(3, [1, 2, 3]);
    expect(set.size).toBe(3);
    expect(set.has(1)).toBe(true);
  });

  it('handles capacity of 1', () => {
    const set = new BoundedSet<string>(1);
    set.add('a');
    set.add('b');
    expect(set.size).toBe(1);
    expect(set.has('a')).toBe(false);
    expect(set.has('b')).toBe(true);
  });
});
