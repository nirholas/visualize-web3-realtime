import { WebSocketServer } from "ws";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = 8080;
const TICK_INTERVAL = 500; // ms between events
const SEED_COUNT = 10;
const MAX_NODES = 100;

const GROUPS = ["service", "database", "cache", "queue", "gateway"];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {Map<string, {id: string, label: string, group: string, value: number}>} */
const nodes = new Map();
let edgeCount = 0;
let nodeIdCounter = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomGroup() {
  return GROUPS[Math.floor(Math.random() * GROUPS.length)];
}

function randomValue() {
  return Math.round(Math.random() * 100);
}

function createNode() {
  const id = `node-${++nodeIdCounter}`;
  const group = randomGroup();
  const node = { id, label: `${group}-${nodeIdCounter}`, group, value: randomValue() };
  nodes.set(id, node);
  return node;
}

function randomNodeId() {
  const keys = Array.from(nodes.keys());
  return keys[Math.floor(Math.random() * keys.length)];
}

// ---------------------------------------------------------------------------
// WebSocket Server
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ port: PORT });

console.log(`[server] WebSocket server listening on ws://localhost:${PORT}`);

/** Broadcast a JSON message to all connected clients */
function broadcast(data) {
  const payload = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1 /* WebSocket.OPEN */) {
      client.send(payload);
    }
  }
}

// Send the current graph state to newly connected clients
wss.on("connection", (ws) => {
  console.log("[server] Client connected");

  // Send all existing nodes
  for (const node of nodes.values()) {
    ws.send(JSON.stringify({ type: "node-add", payload: node }));
  }

  ws.on("close", () => {
    console.log("[server] Client disconnected");
  });
});

// ---------------------------------------------------------------------------
// Seed nodes
// ---------------------------------------------------------------------------

console.log(`[server] Creating ${SEED_COUNT} seed nodes...`);
for (let i = 0; i < SEED_COUNT; i++) {
  createNode();
}

// ---------------------------------------------------------------------------
// Simulation tick — randomly add nodes or edges
// ---------------------------------------------------------------------------

setInterval(() => {
  // Decide action: 40% add node (if under max), 60% add edge
  const shouldAddNode = nodes.size < MAX_NODES && Math.random() < 0.4;

  if (shouldAddNode) {
    const node = createNode();
    broadcast({ type: "node-add", payload: node });
    console.log(`[server] + node  ${node.id} (${node.group}) — total: ${nodes.size}`);
  } else if (nodes.size >= 2) {
    // Add an edge between two random existing nodes
    let source = randomNodeId();
    let target = randomNodeId();
    // Ensure source !== target
    while (target === source) {
      target = randomNodeId();
    }
    const edge = { source, target };
    edgeCount++;
    broadcast({ type: "edge-add", payload: edge });
    console.log(`[server] + edge  ${source} -> ${target} — total: ${edgeCount}`);
  }
}, TICK_INTERVAL);
