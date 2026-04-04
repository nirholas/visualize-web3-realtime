/**
 * A Map with a maximum size. When the limit is reached, the oldest entries
 * (by insertion order) are evicted to make room. This prevents unbounded
 * memory growth in long-running provider caches.
 */
export class BoundedMap<K, V> extends Map<K, V> {
  private readonly maxSize: number;

  constructor(maxSize: number, entries?: Iterable<[K, V]>) {
    super(entries);
    this.maxSize = maxSize;
  }

  override set(key: K, value: V): this {
    // If key already exists, delete first so it moves to end of insertion order
    if (this.has(key)) {
      this.delete(key);
    }
    super.set(key, value);
    // Evict oldest entries if over capacity
    while (this.size > this.maxSize) {
      const oldest = this.keys().next().value;
      if (oldest !== undefined) this.delete(oldest);
    }
    return this;
  }
}

/**
 * A Set with a maximum size. When the limit is reached, the oldest entries
 * (by insertion order) are evicted.
 */
export class BoundedSet<V> extends Set<V> {
  private readonly maxSize: number;

  constructor(maxSize: number, values?: Iterable<V>) {
    super(values);
    this.maxSize = maxSize;
  }

  override add(value: V): this {
    if (this.has(value)) {
      // Move to end: delete + re-add
      this.delete(value);
    }
    super.add(value);
    while (this.size > this.maxSize) {
      const oldest = this.values().next().value;
      if (oldest !== undefined) this.delete(oldest);
    }
    return this;
  }
}
