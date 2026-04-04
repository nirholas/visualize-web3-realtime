/**
 * Shared WebSocket lifecycle manager with:
 * - Exponential backoff reconnection with configurable max retries
 * - Ping/pong heartbeat keep-alive
 * - Connection state machine
 * - Error callbacks (no silent failures)
 */

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface WebSocketManagerOptions {
  url: string;
  /** Base delay for reconnection backoff (ms). Default: 1000 */
  baseReconnectMs?: number;
  /** Max reconnection delay (ms). Default: 30000 */
  maxReconnectMs?: number;
  /** Max reconnection attempts before giving up. 0 = unlimited. Default: 50 */
  maxRetries?: number;
  /** Heartbeat ping interval (ms). 0 = disabled. Default: 30000 */
  heartbeatIntervalMs?: number;
  /** How long to wait for pong before considering connection dead (ms). Default: 10000 */
  heartbeatTimeoutMs?: number;
  /** Called when connection state changes */
  onStateChange?: (state: ConnectionState) => void;
  /** Called on connection errors */
  onError?: (error: Error) => void;
  /** Called when a message is received */
  onMessage?: (data: string) => void;
  /** Called when successfully connected */
  onOpen?: (ws: WebSocket) => void;
  /** Called when connection closes */
  onClose?: (code: number, reason: string) => void;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private retryCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  private readonly url: string;
  private readonly baseReconnectMs: number;
  private readonly maxReconnectMs: number;
  private readonly maxRetries: number;
  private readonly heartbeatIntervalMs: number;
  private readonly heartbeatTimeoutMs: number;
  private readonly onStateChange?: (state: ConnectionState) => void;
  private readonly onError?: (error: Error) => void;
  private readonly onMessage?: (data: string) => void;
  private readonly onOpen?: (ws: WebSocket) => void;
  private readonly onClose?: (code: number, reason: string) => void;

  constructor(options: WebSocketManagerOptions) {
    this.url = options.url;
    this.baseReconnectMs = options.baseReconnectMs ?? 1000;
    this.maxReconnectMs = options.maxReconnectMs ?? 30000;
    this.maxRetries = options.maxRetries ?? 50;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30000;
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 10000;
    this.onStateChange = options.onStateChange;
    this.onError = options.onError;
    this.onMessage = options.onMessage;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
  }

  get currentState(): ConnectionState {
    return this.state;
  }

  get isConnected(): boolean {
    return this.state === 'connected';
  }

  get socket(): WebSocket | null {
    return this.ws;
  }

  connect(): void {
    if (this.disposed) return;
    this.clearTimers();

    this.setState(this.retryCount > 0 ? 'reconnecting' : 'connecting');

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      this.handleError(err instanceof Error ? err : new Error(String(err)));
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.retryCount = 0;
      this.setState('connected');
      this.startHeartbeat();
      this.onOpen?.(this.ws!);
    };

    this.ws.onmessage = (event) => {
      // Any message counts as a pong (resets heartbeat timeout)
      this.resetHeartbeatTimeout();
      if (typeof event.data === 'string') {
        this.onMessage?.(event.data);
      }
    };

    this.ws.onerror = () => {
      this.handleError(new Error(`WebSocket error on ${this.url}`));
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      this.onClose?.(event.code, event.reason);
      if (!this.disposed) {
        this.scheduleReconnect();
      }
    };
  }

  disconnect(): void {
    this.disposed = true;
    this.clearTimers();
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }
    this.setState('disconnected');
  }

  /** Send data if connected. Returns false if not connected. */
  send(data: string): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
      return true;
    }
    return false;
  }

  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange?.(state);
    }
  }

  private handleError(error: Error): void {
    if (this.onError) {
      this.onError(error);
    } else {
      console.warn(`[WebSocketManager] ${error.message}`);
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed) return;

    if (this.maxRetries > 0 && this.retryCount >= this.maxRetries) {
      this.setState('failed');
      this.handleError(new Error(`Max reconnection attempts (${this.maxRetries}) reached for ${this.url}`));
      return;
    }

    const delay = Math.min(
      this.baseReconnectMs * Math.pow(2, this.retryCount),
      this.maxReconnectMs,
    );
    this.retryCount++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatIntervalMs <= 0) return;
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send a ping frame. Many WS servers respond to text pings too.
        try {
          this.ws.send('ping');
        } catch {
          // If send fails, connection is likely dead
          this.ws.close();
        }
        // Set a timeout: if no message arrives within heartbeatTimeoutMs, reconnect
        this.heartbeatTimeout = setTimeout(() => {
          if (this.ws) {
            this.handleError(new Error(`Heartbeat timeout on ${this.url}`));
            this.ws.close();
          }
        }, this.heartbeatTimeoutMs);
      }
    }, this.heartbeatIntervalMs);
  }

  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private stopHeartbeat(): void {
    this.resetHeartbeatTimeout();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
