import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import type { AgentEvent, AgentIdentity, AgentTask, ExecutorState } from './types.js';
import type { BroadcastMessage } from './types.js';

interface ClientState {
  ws: WebSocket;
  /** If set, only forward events matching these agent IDs */
  subscribedAgents: Set<string> | null;
}

export class EventBroadcaster {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ClientState>();
  private recentEvents: AgentEvent[] = [];

  constructor(private readonly port: number) {
    // Will be initialized in start() with either a provided httpServer or a new one
    this.wss = null as any;
  }

  start(
    getSnapshot: () => { agents: AgentIdentity[]; tasks: AgentTask[]; recentEvents: AgentEvent[] },
    httpServer?: any,
  ): void {
    // Create WebSocketServer on either provided httpServer or standalone on port
    if (httpServer) {
      this.wss = new WebSocketServer({ server: httpServer });
    } else {
      this.wss = new WebSocketServer({ port: this.port });
    }
    this.wss.on('connection', (ws: any) => {
      const state: ClientState = { ws, subscribedAgents: null };
      this.clients.set(ws, state);

      // Send snapshot on connect
      const snapshot: BroadcastMessage = { type: 'snapshot', data: getSnapshot() };
      ws.send(JSON.stringify(snapshot));

      // Handle client messages (e.g., subscribe)
      ws.on('message', (raw: Buffer | string) => {
        try {
          const msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
          if (msg.type === 'subscribe' && Array.isArray(msg.agentIds)) {
            state.subscribedAgents = new Set(msg.agentIds as string[]);
          } else if (msg.type === 'subscribe' && msg.agentIds === null) {
            // Unsubscribe — receive all events again
            state.subscribedAgents = null;
          }
        } catch {
          // ignore malformed messages
        }
      });

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
    for (const [, client] of this.clients) {
      if (client.ws.readyState !== 1 /* OPEN */) continue;
      // Apply subscription filter
      if (client.subscribedAgents && !client.subscribedAgents.has(event.agentId)) continue;
      client.ws.send(json);
    }
  }

  broadcastState(state: ExecutorState): void {
    const msg: BroadcastMessage = { type: 'heartbeat', data: state };
    const json = JSON.stringify(msg);
    for (const [, client] of this.clients) {
      if (client.ws.readyState === 1) {
        // Heartbeat always sent regardless of subscription filter
        client.ws.send(json);
      }
    }
  }

  getClientCount(): number { return this.clients.size; }

  stop(): void {
    for (const [, client] of this.clients) {
      client.ws.close();
    }
    this.clients.clear();
    this.wss.close();
  }
}
