#!/usr/bin/env node
// ---------------------------------------------------------------------------
// swarming-collab-server — WebSocket relay for multiplayer collaboration
//
// Usage:
//   npx swarming-collab-server          # starts on port 4444
//   PORT=8080 npx swarming-collab-server # custom port
//
// Clients connect via: wss://your-host:PORT
// ---------------------------------------------------------------------------

import { WebSocketServer, type WebSocket } from 'ws';
import { Room } from './room';

const PORT = parseInt(process.env.PORT ?? '4444', 10);
const ROOM_IDLE_MS = 300_000; // Clean up empty rooms after 5 min

interface ClientMessage {
  type: string;
  room?: string;
  username?: string;
  color?: string;
  position?: [number, number, number] | null;
  target?: [number, number, number];
  nodeId?: string | null;
  annotation?: { nodeId: string; text: string; createdAt: number };
  annotationId?: string;
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const rooms = new Map<string, Room>();
const peerRooms = new Map<WebSocket, { room: Room; peerId: string }>();
let nextPeerId = 1;

function getOrCreateRoom(roomId: string): Room {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Room(roomId);
    rooms.set(roomId, room);
  }
  return room;
}

function cleanupRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room && room.isEmpty) {
    room.dispose();
    rooms.delete(roomId);
  }
}

// ---------------------------------------------------------------------------
// WebSocket Server
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ port: PORT });

console.log(`[swarming-collab] relay server listening on ws://0.0.0.0:${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // -- Join a room --
    if (msg.type === 'join' && msg.room && msg.username) {
      // If already in a room, leave it first
      const existing = peerRooms.get(ws);
      if (existing) {
        existing.room.removePeer(existing.peerId);
        peerRooms.delete(ws);
        setTimeout(() => cleanupRoom(existing.room.id), ROOM_IDLE_MS);
      }

      const room = getOrCreateRoom(msg.room);
      const peerId = `p${nextPeerId++}`;
      const peer = room.addPeer(ws, peerId, msg.username, msg.color ?? '#ff6b6b');

      if (!peer) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
        return;
      }

      peerRooms.set(ws, { room, peerId });
      return;
    }

    // All other messages require being in a room
    const ctx = peerRooms.get(ws);
    if (!ctx) return;

    const { room, peerId } = ctx;

    switch (msg.type) {
      case 'cursor':
        room.updateCursor(peerId, msg.position ?? null);
        break;
      case 'camera':
        if (msg.position && msg.target) {
          room.updateCamera(peerId, msg.position, msg.target);
        }
        break;
      case 'select':
        room.selectNode(peerId, msg.nodeId ?? null);
        break;
      case 'annotate':
        if (msg.annotation) {
          room.addAnnotation(peerId, msg.annotation.nodeId, msg.annotation.text, msg.annotation.createdAt);
        }
        break;
      case 'removeAnnotation':
        if (msg.annotationId) {
          room.removeAnnotation(peerId, msg.annotationId);
        }
        break;
      case 'presenter':
        room.setPresenter(peerId, msg.enabled ?? false);
        break;
      case 'ping':
        room.handlePing(peerId);
        break;
    }
  });

  ws.on('close', () => {
    const ctx = peerRooms.get(ws);
    if (ctx) {
      ctx.room.removePeer(ctx.peerId);
      peerRooms.delete(ws);
      setTimeout(() => cleanupRoom(ctx.room.id), ROOM_IDLE_MS);
    }
  });

  ws.on('error', () => {
    // handled by close
  });
});

// Periodic cleanup of idle empty rooms
setInterval(() => {
  for (const [id, room] of rooms) {
    if (room.isEmpty) {
      room.dispose();
      rooms.delete(id);
    }
  }
}, ROOM_IDLE_MS);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[swarming-collab] shutting down...');
  for (const room of rooms.values()) {
    room.dispose();
  }
  rooms.clear();
  wss.close();
  process.exit(0);
});
