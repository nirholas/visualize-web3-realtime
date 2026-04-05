// ---------------------------------------------------------------------------
// Room — Manages peers, annotations, and state for a single collaboration room
// ---------------------------------------------------------------------------

import type { WebSocket } from 'ws';

export interface Peer {
  id: string;
  username: string;
  color: string;
  cursor: [number, number, number] | null;
  camera: [number, number, number] | null;
  cameraTarget: [number, number, number] | null;
  selectedNode: string | null;
  isPresenter: boolean;
  lastSeen: number;
  ws: WebSocket;
}

export interface Annotation {
  id: string;
  nodeId: string;
  text: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  createdAt: number;
}

const MAX_PEERS_PER_ROOM = 50;
const MAX_ANNOTATIONS_PER_ROOM = 200;
const STALE_PEER_MS = 60_000; // Remove peers silent for 60s

let annotationCounter = 0;

export class Room {
  readonly id: string;
  private peers = new Map<string, Peer>();
  private annotations: Annotation[] = [];
  private presenterId: string | null = null;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(id: string) {
    this.id = id;
    this.cleanupTimer = setInterval(() => this.pruneStale(), 30_000);
  }

  get peerCount(): number {
    return this.peers.size;
  }

  get isEmpty(): boolean {
    return this.peers.size === 0;
  }

  addPeer(ws: WebSocket, peerId: string, username: string, color: string): Peer | null {
    if (this.peers.size >= MAX_PEERS_PER_ROOM) return null;

    const peer: Peer = {
      id: peerId,
      username,
      color,
      cursor: null,
      camera: null,
      cameraTarget: null,
      selectedNode: null,
      isPresenter: false,
      lastSeen: Date.now(),
      ws,
    };

    this.peers.set(peerId, peer);

    // Send welcome to the new peer
    this.sendTo(ws, {
      type: 'welcome',
      peerId,
      peers: this.getPublicPeers(peerId),
      annotations: this.annotations,
    });

    // Notify others
    this.broadcast(peerId, {
      type: 'peerJoined',
      peer: this.toPublicPeer(peer),
    });

    return peer;
  }

  removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    this.peers.delete(peerId);

    // If presenter left, clear presenter
    if (this.presenterId === peerId) {
      this.presenterId = null;
      this.broadcast(null, { type: 'presenterChanged', peerId: null });
    }

    this.broadcast(null, { type: 'peerLeft', peerId });
  }

  updateCursor(peerId: string, position: [number, number, number] | null): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.cursor = position;
    peer.lastSeen = Date.now();
    this.broadcast(peerId, { type: 'peerUpdate', peerId, update: { cursor: position } });
  }

  updateCamera(peerId: string, position: [number, number, number], target: [number, number, number]): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.camera = position;
    peer.cameraTarget = target;
    peer.lastSeen = Date.now();
    this.broadcast(peerId, {
      type: 'peerUpdate',
      peerId,
      update: { camera: position, cameraTarget: target },
    });
  }

  selectNode(peerId: string, nodeId: string | null): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.selectedNode = nodeId;
    peer.lastSeen = Date.now();
    this.broadcast(peerId, { type: 'peerUpdate', peerId, update: { selectedNode: nodeId } });
  }

  addAnnotation(peerId: string, nodeId: string, text: string, createdAt: number): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    if (this.annotations.length >= MAX_ANNOTATIONS_PER_ROOM) {
      // Evict oldest
      this.annotations.shift();
    }

    const annotation: Annotation = {
      id: `ann-${++annotationCounter}`,
      nodeId,
      text: text.slice(0, 500), // Cap text length
      authorId: peerId,
      authorName: peer.username,
      authorColor: peer.color,
      createdAt,
    };
    this.annotations.push(annotation);
    this.broadcast(null, { type: 'annotation', annotation });
  }

  removeAnnotation(peerId: string, annotationId: string): void {
    const idx = this.annotations.findIndex((a) => a.id === annotationId);
    if (idx < 0) return;
    // Only author can remove
    if (this.annotations[idx].authorId !== peerId) return;
    this.annotations.splice(idx, 1);
    this.broadcast(null, { type: 'annotationRemoved', annotationId });
  }

  setPresenter(peerId: string, enabled: boolean): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    if (enabled) {
      // Unset previous presenter
      if (this.presenterId && this.presenterId !== peerId) {
        const prev = this.peers.get(this.presenterId);
        if (prev) prev.isPresenter = false;
      }
      peer.isPresenter = true;
      this.presenterId = peerId;
    } else {
      peer.isPresenter = false;
      if (this.presenterId === peerId) this.presenterId = null;
    }

    this.broadcast(null, { type: 'presenterChanged', peerId: enabled ? peerId : null });
  }

  handlePing(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.lastSeen = Date.now();
    this.sendTo(peer.ws, { type: 'pong' });
  }

  dispose(): void {
    clearInterval(this.cleanupTimer);
    for (const peer of this.peers.values()) {
      try {
        peer.ws.close();
      } catch {
        // ignore
      }
    }
    this.peers.clear();
    this.annotations = [];
  }

  // -- Internal --

  private broadcast(excludePeerId: string | null, msg: Record<string, unknown>): void {
    const data = JSON.stringify(msg);
    for (const peer of this.peers.values()) {
      if (peer.id === excludePeerId) continue;
      try {
        if (peer.ws.readyState === 1 /* OPEN */) {
          peer.ws.send(data);
        }
      } catch {
        // skip broken connections
      }
    }
  }

  private sendTo(ws: WebSocket, msg: Record<string, unknown>): void {
    try {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify(msg));
      }
    } catch {
      // ignore
    }
  }

  private getPublicPeers(excludeId: string): Array<Omit<Peer, 'ws'>> {
    const result: Array<Omit<Peer, 'ws'>> = [];
    for (const peer of this.peers.values()) {
      if (peer.id === excludeId) continue;
      result.push(this.toPublicPeer(peer));
    }
    return result;
  }

  private toPublicPeer(peer: Peer): Omit<Peer, 'ws'> {
    const { ws: _ws, ...publicPeer } = peer;
    return publicPeer;
  }

  private pruneStale(): void {
    const now = Date.now();
    for (const [id, peer] of this.peers) {
      if (now - peer.lastSeen > STALE_PEER_MS) {
        this.removePeer(id);
        try {
          peer.ws.close();
        } catch {
          // ignore
        }
      }
    }
  }
}
