// ---------------------------------------------------------------------------
// SyncEngine — WebSocket-based collaboration state synchronization
//
// Manages the connection to the relay server, sends local state updates,
// and receives peer state changes. Uses a simple JSON wire protocol with
// automatic reconnection and cursor/camera throttling.
// ---------------------------------------------------------------------------

import type {
  ClientMessage,
  ServerMessage,
  Peer,
  Annotation,
  CollaborationConfig,
  ConnectionState,
} from './types';

export interface SyncEngineCallbacks {
  onStateChange: (state: ConnectionState) => void;
  onWelcome: (peerId: string, peers: Peer[], annotations: Annotation[]) => void;
  onPeerJoined: (peer: Peer) => void;
  onPeerLeft: (peerId: string) => void;
  onPeerUpdate: (peerId: string, update: Partial<Peer>) => void;
  onAnnotation: (annotation: Annotation) => void;
  onAnnotationRemoved: (annotationId: string) => void;
  onPresenterChanged: (peerId: string | null) => void;
  onError: (message: string) => void;
}

const CURSOR_THROTTLE_MS = 50; // 20 Hz cursor updates
const CAMERA_THROTTLE_MS = 100; // 10 Hz camera updates
const HEARTBEAT_INTERVAL_MS = 15_000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15_000;
const MAX_RETRIES = 20;

export class SyncEngine {
  private ws: WebSocket | null = null;
  private config: CollaborationConfig;
  private callbacks: SyncEngineCallbacks;
  private state: ConnectionState = 'disconnected';
  private disposed = false;
  private retryCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // Throttle state
  private lastCursorSend = 0;
  private lastCameraSend = 0;
  private pendingCursor: [number, number, number] | null = null;
  private pendingCamera: { position: [number, number, number]; target: [number, number, number] } | null = null;
  private cursorFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private cameraFlushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: CollaborationConfig, callbacks: SyncEngineCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  connect(): void {
    if (this.disposed) return;
    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.config.server);
    } catch {
      this.setState('disconnected');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.retryCount = 0;
      this.send({
        type: 'join',
        room: this.config.room,
        username: this.config.username,
        color: this.config.color ?? '#ff6b6b',
      });
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data as string);
        this.handleMessage(msg);
      } catch {
        // skip unparseable messages
      }
    };

    this.ws.onerror = () => {
      this.callbacks.onError('WebSocket connection error');
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (!this.disposed) {
        this.setState('reconnecting');
        this.scheduleReconnect();
      }
    };
  }

  disconnect(): void {
    this.disposed = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }

  // -- Public send methods (throttled) --

  sendCursor(position: [number, number, number] | null): void {
    if (position === null) {
      this.send({ type: 'cursor', position: null });
      return;
    }

    const now = Date.now();
    if (now - this.lastCursorSend >= CURSOR_THROTTLE_MS) {
      this.lastCursorSend = now;
      this.send({ type: 'cursor', position });
    } else {
      this.pendingCursor = position;
      if (!this.cursorFlushTimer) {
        this.cursorFlushTimer = setTimeout(() => {
          this.cursorFlushTimer = null;
          if (this.pendingCursor) {
            this.lastCursorSend = Date.now();
            this.send({ type: 'cursor', position: this.pendingCursor });
            this.pendingCursor = null;
          }
        }, CURSOR_THROTTLE_MS - (now - this.lastCursorSend));
      }
    }
  }

  sendCamera(position: [number, number, number], target: [number, number, number]): void {
    const now = Date.now();
    if (now - this.lastCameraSend >= CAMERA_THROTTLE_MS) {
      this.lastCameraSend = now;
      this.send({ type: 'camera', position, target });
    } else {
      this.pendingCamera = { position, target };
      if (!this.cameraFlushTimer) {
        this.cameraFlushTimer = setTimeout(() => {
          this.cameraFlushTimer = null;
          if (this.pendingCamera) {
            this.lastCameraSend = Date.now();
            this.send({ type: 'camera', ...this.pendingCamera });
            this.pendingCamera = null;
          }
        }, CAMERA_THROTTLE_MS - (now - this.lastCameraSend));
      }
    }
  }

  sendSelect(nodeId: string | null): void {
    this.send({ type: 'select', nodeId });
  }

  sendAnnotation(nodeId: string, text: string): void {
    this.send({
      type: 'annotate',
      annotation: { nodeId, text, createdAt: Date.now() },
    });
  }

  sendRemoveAnnotation(annotationId: string): void {
    this.send({ type: 'removeAnnotation', annotationId });
  }

  sendPresenter(enabled: boolean): void {
    this.send({ type: 'presenter', enabled });
  }

  // -- Internal --

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'welcome':
        this.setState('connected');
        this.callbacks.onWelcome(msg.peerId, msg.peers, msg.annotations);
        break;
      case 'peerJoined':
        this.callbacks.onPeerJoined(msg.peer);
        break;
      case 'peerLeft':
        this.callbacks.onPeerLeft(msg.peerId);
        break;
      case 'peerUpdate':
        this.callbacks.onPeerUpdate(msg.peerId, msg.update);
        break;
      case 'annotation':
        this.callbacks.onAnnotation(msg.annotation);
        break;
      case 'annotationRemoved':
        this.callbacks.onAnnotationRemoved(msg.annotationId);
        break;
      case 'presenterChanged':
        this.callbacks.onPresenterChanged(msg.peerId);
        break;
      case 'error':
        this.callbacks.onError(msg.message);
        break;
      case 'pong':
        // heartbeat ack
        break;
    }
  }

  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.callbacks.onStateChange(state);
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.retryCount >= MAX_RETRIES) {
      this.setState('disconnected');
      return;
    }
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, this.retryCount), RECONNECT_MAX_MS);
    this.retryCount++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.cursorFlushTimer) {
      clearTimeout(this.cursorFlushTimer);
      this.cursorFlushTimer = null;
    }
    if (this.cameraFlushTimer) {
      clearTimeout(this.cameraFlushTimer);
      this.cameraFlushTimer = null;
    }
  }
}
