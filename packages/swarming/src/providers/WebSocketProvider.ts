import type { DataProvider, EmitFn, SwarmingNode } from '../types';

/**
 * Connects to a WebSocket URL and parses incoming JSON messages as SwarmingNode[].
 *
 * Expects the server to send either:
 * - A JSON array of SwarmingNode objects
 * - A single SwarmingNode object (wrapped into an array)
 */
export class WebSocketProvider implements DataProvider {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect(emit: EmitFn): () => void {
    const ws = new WebSocket(this.url);

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data as string);
        const nodes: SwarmingNode[] = Array.isArray(parsed) ? parsed : [parsed];
        emit(nodes);
      } catch {
        // Silently skip unparseable messages
      }
    };

    return () => {
      ws.close();
    };
  }
}
