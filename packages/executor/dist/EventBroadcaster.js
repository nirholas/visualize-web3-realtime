import { WebSocketServer } from 'ws';
export class EventBroadcaster {
    port;
    wss;
    clients = new Map();
    recentEvents = [];
    constructor(port) {
        this.port = port;
        // Will be initialized in start() with either a provided httpServer or a new one
        this.wss = null;
    }
    start(getSnapshot, httpServer) {
        // Create WebSocketServer on either provided httpServer or standalone on port
        if (httpServer) {
            this.wss = new WebSocketServer({ server: httpServer });
        }
        else {
            this.wss = new WebSocketServer({ port: this.port });
        }
        this.wss.on('connection', (ws) => {
            const state = { ws, subscribedAgents: null };
            this.clients.set(ws, state);
            // Send snapshot on connect
            const snapshot = { type: 'snapshot', data: getSnapshot() };
            ws.send(JSON.stringify(snapshot));
            // Handle client messages (e.g., subscribe)
            ws.on('message', (raw) => {
                try {
                    const msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
                    if (msg.type === 'subscribe' && Array.isArray(msg.agentIds)) {
                        state.subscribedAgents = new Set(msg.agentIds);
                    }
                    else if (msg.type === 'subscribe' && msg.agentIds === null) {
                        // Unsubscribe — receive all events again
                        state.subscribedAgents = null;
                    }
                }
                catch {
                    // ignore malformed messages
                }
            });
            ws.on('close', () => this.clients.delete(ws));
            ws.on('error', () => this.clients.delete(ws));
        });
        console.log(`[EventBroadcaster] WebSocket server listening on port ${this.port}`);
    }
    broadcast(event) {
        this.recentEvents.push(event);
        if (this.recentEvents.length > 500)
            this.recentEvents = this.recentEvents.slice(-500);
        const msg = { type: 'event', data: event };
        const json = JSON.stringify(msg);
        for (const [, client] of this.clients) {
            if (client.ws.readyState !== 1 /* OPEN */)
                continue;
            // Apply subscription filter
            if (client.subscribedAgents && !client.subscribedAgents.has(event.agentId))
                continue;
            client.ws.send(json);
        }
    }
    broadcastState(state) {
        const msg = { type: 'heartbeat', data: state };
        const json = JSON.stringify(msg);
        for (const [, client] of this.clients) {
            if (client.ws.readyState === 1) {
                // Heartbeat always sent regardless of subscription filter
                client.ws.send(json);
            }
        }
    }
    getClientCount() { return this.clients.size; }
    stop() {
        for (const [, client] of this.clients) {
            client.ws.close();
        }
        this.clients.clear();
        this.wss.close();
    }
}
