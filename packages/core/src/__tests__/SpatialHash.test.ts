import { describe, it, expect } from 'vitest';
import { SpatialHash } from '../engine/SpatialHash';

describe('SpatialHash', () => {
  it('inserts and queries items', () => {
    const hash = new SpatialHash(10);
    hash.insert(0, 5, 5, 5);
    hash.insert(1, 6, 6, 6);
    const results = hash.query(5, 5, 5, 5);
    expect(results).toContain(0);
    expect(results).toContain(1);
  });

  it('returns empty for queries with no nearby items', () => {
    const hash = new SpatialHash(10);
    hash.insert(0, 0, 0, 0);
    const results = hash.query(100, 100, 100, 5);
    expect(results).toHaveLength(0);
  });

  it('handles items in different cells', () => {
    const hash = new SpatialHash(10);
    hash.insert(0, 0, 0, 0);
    hash.insert(1, 50, 50, 50);
    const results = hash.query(0, 0, 0, 5);
    expect(results).toContain(0);
    expect(results).not.toContain(1);
  });

  it('clears all items', () => {
    const hash = new SpatialHash(10);
    hash.insert(0, 5, 5, 5);
    hash.insert(1, 6, 6, 6);
    hash.clear();
    const results = hash.query(5, 5, 5, 20);
    expect(results).toHaveLength(0);
  });

  it('handles negative coordinates', () => {
    const hash = new SpatialHash(10);
    hash.insert(0, -5, -5, -5);
    hash.insert(1, -6, -6, -6);
    const results = hash.query(-5, -5, -5, 5);
    expect(results).toContain(0);
    expect(results).toContain(1);
  });

  it('handles boundary conditions at cell edges', () => {
    const hash = new SpatialHash(10);
    hash.insert(0, 10, 10, 10);
    hash.insert(1, 9.99, 9.99, 9.99);
    const results = hash.query(10, 10, 10, 1);
    expect(results).toContain(0);
  });

  it('handles zero radius query', () => {
    const hash = new SpatialHash(10);
    hash.insert(0, 5, 5, 5);
    const results = hash.query(5, 5, 5, 0);
    expect(results).toContain(0);
  });

  it('handles multiple items in the same cell', () => {
    const hash = new SpatialHash(10);
    for (let i = 0; i < 100; i++) {
      hash.insert(i, 1, 1, 1);
    }
    const results = hash.query(1, 1, 1, 1);
    expect(results).toHaveLength(100);
  });

  it('handles small cell sizes', () => {
    const hash = new SpatialHash(0.1);
    hash.insert(0, 0.05, 0.05, 0.05);
    hash.insert(1, 0.15, 0.15, 0.15);
    const results = hash.query(0.05, 0.05, 0.05, 0.05);
    expect(results).toContain(0);
  });
});
