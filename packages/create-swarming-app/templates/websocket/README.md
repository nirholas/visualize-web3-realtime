# Swarming Visualization — WebSocket Template

A real-time graph visualization powered by WebSocket. A mock server generates nodes and edges that stream into the browser and render as an interactive force-directed graph.

## Quick Start

Install dependencies:

```bash
npm install
```

Start the mock WebSocket server in one terminal:

```bash
npm run server
```

Then, in a second terminal, start the Vite dev server:

```bash
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`). You should see nodes and edges appearing in real time with a green "Connected" indicator in the top-right corner.

## How It Works

- **`src/server.js`** — A Node.js WebSocket server (using the `ws` package) that listens on port 8080. It starts with 10 seed nodes and emits `node-add` or `edge-add` events every 500 ms, building up to 100 nodes.
- **`src/provider.ts`** — A React hook (`useSwarmSocket`) that connects to the WebSocket server, maintains `nodes` and `edges` state, and auto-reconnects with exponential backoff on disconnect.
- **`src/App.tsx`** — Renders a `<SwarmGraph>` from `@swarming-vis/react-graph` with live data and a connection status indicator.

## Message Protocol

The server sends JSON messages with the following shapes:

```json
{ "type": "node-add",    "payload": { "id": "node-1", "label": "cache-1", "group": "cache", "value": 42 } }
{ "type": "edge-add",    "payload": { "source": "node-1", "target": "node-3" } }
{ "type": "node-remove", "payload": { "id": "node-1" } }
```
