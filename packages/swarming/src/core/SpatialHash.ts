/**
 * 3D spatial hash for O(1) neighbor lookups.
 *
 * Partitions space into a uniform grid. Items are inserted at a 3D position
 * and can be queried by radius. Used internally for mouse-repulsion and
 * proximity-line effects.
 */
export class SpatialHash {
  private cellSize: number;
  private cells = new Map<string, number[]>();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private key(x: number, y: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  /** Remove all stored positions */
  clear(): void {
    this.cells.clear();
  }

  /** Insert an item index at a 3D position */
  insert(index: number, x: number, y: number, z: number): void {
    const k = this.key(x, y, z);
    const cell = this.cells.get(k);
    if (cell) {
      cell.push(index);
    } else {
      this.cells.set(k, [index]);
    }
  }

  /** Find all item indices within `radius` of the given point */
  query(x: number, y: number, z: number, radius: number): number[] {
    const result: number[] = [];
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    const minCz = Math.floor((z - radius) / this.cellSize);
    const maxCz = Math.floor((z + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cz = minCz; cz <= maxCz; cz++) {
          const cell = this.cells.get(`${cx},${cy},${cz}`);
          if (cell) {
            for (const idx of cell) {
              result.push(idx);
            }
          }
        }
      }
    }
    return result;
  }
}
