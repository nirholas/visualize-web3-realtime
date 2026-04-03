import { WebSocketServer } from 'ws';
export class EventBroadcaster {
    port;
    wss;
    clients = new Set();
    recentEvents = [];
    constructor(port) {
        this.port = port;
        this.wss = new WebSocketServer({ port });
    }
    start(getSnapshot) {
        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            // Send snapshot on connect
            const snapshot = { type: 'snapshot', data: getSnapshot() };
            ws.send(JSON.stringify(snapshot));
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
        for (const client of this.clients) {
            if (client.readyState === 1 /* OPEN */) {
                client.send(json);
            }
        }
    }
    broadcastState(state) {
        const msg = { type: 'heartbeat', data: state };
        const json = JSON.stringify(msg);
        for (const client of this.clients) {
            if (client.readyState === 1) {
                client.send(json);
            }
        }
    }
    getClientCount() { return this.clients.size; }
    stop() {
        this.wss.close();
    }
}
