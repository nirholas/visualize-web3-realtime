import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { AgentEvent } from './types.js';
import { makeEvent } from './transform.js';

const MAX_REPLAY = 500;
const HEARTBEAT_INTERVAL_MS = 15_000;

export class BridgeServer {
  private clients = new Set<WebSocket>();
  private replayBuffer: AgentEvent[] = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private httpServer: ReturnType<typeof createServer> | null = null;
  private wss: WebSocketServer | null = null;

  /** Push an event to all connected visualization clients. */
  broadcast = (event: AgentEvent): void => {
    this.replayBuffer.push(event);
    if (this.replayBuffer.length > MAX_REPLAY) {
      this.replayBuffer = this.replayBuffer.slice(-MAX_REPLAY);
    }
    const msg = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  };

  /** Start the HTTP + WebSocket server on the given port. */
  async start(port: number): Promise<void> {
    this.httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', clients: this.clients.size, events: this.replayBuffer.length }));
        return;
      }

      // Accept events via HTTP POST (alternative to adapter piping)
      if (req.method === 'POST' && req.url === '/events') {
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const event = JSON.parse(body) as AgentEvent;
            if (!event.type || !event.agentId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing required fields: type, agentId' }));
              return;
            }
            if (!event.eventId) event.eventId = `http_${Date.now()}`;
            if (!event.timestamp) event.timestamp = Date.now();
            this.broadcast(event);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      // Replay buffered events so the client can reconstruct state
      for (const event of this.replayBuffer) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(event));
        }
      }
      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));
    });

    // Periodic heartbeat so the frontend's heartbeat timeout doesn't fire
    this.heartbeatTimer = setInterval(() => {
      this.broadcast(makeEvent('heartbeat', 'bridge', {
        uptime: process.uptime() * 1000,
        clients: this.clients.size,
      }));
    }, HEARTBEAT_INTERVAL_MS);

    return new Promise<void>((resolve) => {
      this.httpServer!.listen(port, () => resolve());
    });
  }

  stop(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    for (const client of this.clients) client.close();
    this.wss?.close();
    this.httpServer?.close();
  }
}
