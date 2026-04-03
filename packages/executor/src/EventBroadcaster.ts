import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import type { AgentEvent, AgentIdentity, AgentTask, ExecutorState } from './types.js';
import type { BroadcastMessage } from './types.js';

export class EventBroadcaster {
  private wss: WebSocketServer;
  private clients = new Set<WebSocket>();
  private recentEvents: AgentEvent[] = [];

  constructor(private readonly port: number) {
    this.wss = new WebSocketServer({ port });
  }

  start(
    getSnapshot: () => { agents: AgentIdentity[]; tasks: AgentTask[]; recentEvents: AgentEvent[] },
  ): void {
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);

      // Send snapshot on connect
      const snapshot: BroadcastMessage = { type: 'snapshot', data: getSnapshot() };
      ws.send(JSON.stringify(snapshot));

      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));
    });

    console.log(`[EventBroadcaster] WebSocket server listening on port ${this.port}`);
  }

  broadcast(event: AgentEvent): void {
    this.recentEvents.push(event);
    if (this.recentEvents.length > 500) this.recentEvents = this.recentEvents.slice(-500);

    const msg: BroadcastMessage = { type: 'event', data: event };
    const json = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === 1 /* OPEN */) {
        client.send(json);
      }
    }
  }

  broadcastState(state: ExecutorState): void {
    const msg: BroadcastMessage = { type: 'heartbeat', data: state };
    const json = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === 1) {
        client.send(json);
      }
    }
  }

  getClientCount(): number { return this.clients.size; }

  stop(): void {
    this.wss.close();
  }
}
