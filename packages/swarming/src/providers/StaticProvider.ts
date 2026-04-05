import type { DataProvider, EmitFn, SwarmingNode } from '../types';

/**
 * Emits a static array of nodes once on connect.
 * Useful for rendering pre-computed graphs.
 */
export class StaticProvider implements DataProvider {
  private nodes: SwarmingNode[];

  constructor(nodes: SwarmingNode[]) {
    this.nodes = nodes;
  }

  connect(emit: EmitFn): () => void {
    emit(this.nodes);
    return () => {};
  }
}
