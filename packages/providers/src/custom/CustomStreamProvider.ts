import type {
  DataProvider,
  DataProviderEvent,
  DataProviderStats,
  ConnectionState,
  CategoryConfig,
  SourceConfig,
  TopToken,
  TraderEdge,
  RawEvent,
} from '@web3viz/core';

// ============================================================================
// Custom Stream Provider
//
// Connects to a user-supplied URL (WebSocket, SSE, or REST polling) and maps
// incoming JSON events into the unified DataProviderEvent format so they
// render in the visualization alongside built-in providers.
// ============================================================================

export type StreamType = 'websocket' | 'sse' | 'rest';

export interface CustomStreamProviderOptions {
  /** Unique id for this custom provider instance */
  id: string;
  /** Human-readable name */
  name: string;
  /** The URL to connect to */
  url: string;
  /** Transport type */
  streamType: StreamType;
  /** Polling interval in ms (only for REST). Default 5000 */
  pollIntervalMs?: number;
  /** Brand color for sidebar icon */
  color?: string;
  /** Icon character */
  icon?: string;
  /**
   * Optional JSON path for the event array in the response.
   * e.g. "data.events" will read response.data.events
   * If omitted, the whole response (or each WS message) is treated as an event.
   */
  jsonPath?: string;
  /**
   * Field mapping — tells the provider which fields in the incoming JSON
   * correspond to the unified event schema. All are optional; sensible
   * defaults are used when omitted.
   */
  fieldMap?: Partial<FieldMap>;
}

export interface FieldMap {
  /** Field for event label / symbol */
  label: string;
  /** Field for amount (numeric) */
  amount: string;
  /** Field for participant address */
  address: string;
  /** Field for token / asset address */
  tokenAddress: string;
  /** Field for category string */
  category: string;
  /** Field for chain identifier */
  chain: string;
  /** Field for timestamp (epoch ms or ISO string) */
  timestamp: string;
}

const DEFAULT_FIELD_MAP: FieldMap = {
  label: 'label',
  amount: 'amount',
  address: 'address',
  tokenAddress: 'tokenAddress',
  category: 'category',
  chain: 'chain',
  timestamp: 'timestamp',
};

let idSeq = 0;

function dig(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function parseTimestamp(raw: unknown): number {
  if (typeof raw === 'number') return raw > 1e12 ? raw : raw * 1000;
  if (typeof raw === 'string') {
    const d = Date.parse(raw);
    return Number.isNaN(d) ? Date.now() : d;
  }
  return Date.now();
}

export class CustomStreamProvider implements DataProvider {
  readonly id: string;
  readonly name: string;
  readonly chains: string[];
  readonly sourceConfig: SourceConfig;
  readonly categories: CategoryConfig[];

  private url: string;
  private streamType: StreamType;
  private pollIntervalMs: number;
  private jsonPath: string | undefined;
  private fieldMap: FieldMap;

  private eventListeners: Array<(event: DataProviderEvent) => void> = [];
  private rawListeners: Array<(event: RawEvent) => void> = [];
  private _paused = false;
  private _enabled = true;
  private _connected = false;

  private ws: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private totalEvents = 0;
  private tokenAcc = new Map<string, { name: string; symbol: string; volume: number; trades: number }>();
  private traderEdges: TraderEdge[] = [];

  constructor(opts: CustomStreamProviderOptions) {
    this.id = opts.id;
    this.name = opts.name;
    this.url = opts.url;
    this.streamType = opts.streamType;
    this.pollIntervalMs = opts.pollIntervalMs ?? 5000;
    this.jsonPath = opts.jsonPath;
    this.fieldMap = { ...DEFAULT_FIELD_MAP, ...opts.fieldMap };
    this.chains = ['custom'];

    const color = opts.color ?? '#6366f1';
    const icon = opts.icon ?? '⬢';

    this.sourceConfig = {
      id: this.id,
      label: opts.name,
      color,
      icon,
      description: `Custom ${opts.streamType.toUpperCase()} stream`,
    };

    this.categories = [
      { id: `${this.id}_events`, label: `${opts.name} Events`, icon, color, sourceId: this.id },
    ];
  }

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  connect(): void {
    if (this._connected) return;

    switch (this.streamType) {
      case 'websocket':
        this.connectWebSocket();
        break;
      case 'sse':
        this.connectSSE();
        break;
      case 'rest':
        this.startPolling();
        break;
    }
  }

  disconnect(): void {
    this._connected = false;
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ------------------------------------------------------------------
  // Transport implementations
  // ------------------------------------------------------------------

  private connectWebSocket(): void {
    try {
      this.ws = new WebSocket(this.url);
      this._connected = true;

      this.ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data as string);
          this.ingestPayload(data);
        } catch {
          // non-JSON message, ignore
        }
      };

      this.ws.onerror = () => {
        // will trigger onclose
      };

      this.ws.onclose = () => {
        this._connected = false;
        this.ws = null;
        // Reconnect after 3s
        this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
      };
    } catch {
      this._connected = false;
    }
  }

  private connectSSE(): void {
    try {
      this.eventSource = new EventSource(this.url);
      this._connected = true;

      this.eventSource.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          this.ingestPayload(data);
        } catch {
          // ignore
        }
      };

      this.eventSource.onerror = () => {
        this._connected = false;
        this.eventSource?.close();
        this.eventSource = null;
        this.reconnectTimer = setTimeout(() => this.connectSSE(), 3000);
      };
    } catch {
      this._connected = false;
    }
  }

  private startPolling(): void {
    this._connected = true;
    const poll = async () => {
      try {
        const res = await fetch(this.url);
        if (!res.ok) return;
        const data = await res.json();
        this.ingestPayload(data);
      } catch {
        // will retry next interval
      }
    };
    poll();
    this.pollTimer = setInterval(poll, this.pollIntervalMs);
  }

  // ------------------------------------------------------------------
  // Event mapping
  // ------------------------------------------------------------------

  private ingestPayload(raw: unknown): void {
    if (this._paused || !this._enabled) return;

    // If jsonPath is set, dig into the payload
    let items: unknown[];
    if (this.jsonPath) {
      const extracted = dig(raw, this.jsonPath);
      items = Array.isArray(extracted) ? extracted : [extracted];
    } else if (Array.isArray(raw)) {
      items = raw;
    } else {
      items = [raw];
    }

    for (const item of items) {
      if (item == null || typeof item !== 'object') continue;
      this.mapAndEmit(item as Record<string, unknown>);
    }
  }

  private mapAndEmit(data: Record<string, unknown>): void {
    const fm = this.fieldMap;
    const label = String(dig(data, fm.label) ?? 'event');
    const amount = Number(dig(data, fm.amount) ?? 0) || 0;
    const address = String(dig(data, fm.address) ?? 'unknown');
    const tokenAddress = String(dig(data, fm.tokenAddress) ?? '');
    const timestamp = parseTimestamp(dig(data, fm.timestamp));

    const event: DataProviderEvent = {
      id: `${this.id}-${++idSeq}`,
      providerId: this.id,
      category: `${this.id}_events`,
      chain: String(dig(data, fm.chain) ?? 'custom'),
      timestamp,
      label,
      amount: amount || undefined,
      address,
      tokenAddress: tokenAddress || undefined,
      meta: data,
    };

    this.totalEvents++;

    // Track tokens for graph visualization
    if (tokenAddress) {
      const existing = this.tokenAcc.get(tokenAddress);
      if (existing) {
        existing.trades++;
        existing.volume += amount;
      } else {
        this.tokenAcc.set(tokenAddress, { name: label, symbol: label.slice(0, 6), volume: amount, trades: 1 });
      }

      // Track trader edge
      const edge = this.traderEdges.find((e) => e.trader === address && e.tokenAddress === tokenAddress);
      if (edge) {
        edge.trades++;
        edge.volume += amount;
      } else {
        this.traderEdges.push({
          trader: address,
          tokenAddress,
          chain: 'custom',
          trades: 1,
          volume: amount,
          source: this.id,
        });
      }
    }

    for (const listener of this.eventListeners) listener(event);
    for (const listener of this.rawListeners) listener({ type: 'custom', data });
  }

  // ------------------------------------------------------------------
  // DataProvider interface
  // ------------------------------------------------------------------

  setPaused(paused: boolean): void { this._paused = paused; }
  isPaused(): boolean { return this._paused; }
  isEnabled(): boolean { return this._enabled; }
  setEnabled(enabled: boolean): void { this._enabled = enabled; }

  getStats(): DataProviderStats {
    const topTokens: TopToken[] = Array.from(this.tokenAcc.entries())
      .map(([addr, t]) => ({
        tokenAddress: addr,
        mint: addr,
        name: t.name,
        symbol: t.symbol,
        chain: 'custom',
        trades: t.trades,
        volume: t.volume,
        nativeSymbol: 'USD',
        source: this.id,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);

    return {
      counts: { [`${this.id}_events`]: this.totalEvents },
      totalTransactions: this.totalEvents,
      totalAgents: 0,
      totalVolume: { custom: Array.from(this.tokenAcc.values()).reduce((s, t) => s + t.volume, 0) },
      recentEvents: [],
      topTokens,
      traderEdges: this.traderEdges.slice(0, 5000),
      rawEvents: [],
    };
  }

  getConnections(): ConnectionState[] {
    return [{ name: `${this.streamType.toUpperCase()} Stream`, connected: this._connected }];
  }

  onEvent(listener: (event: DataProviderEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => { this.eventListeners = this.eventListeners.filter((l) => l !== listener); };
  }

  onRawEvent(listener: (event: RawEvent) => void): () => void {
    this.rawListeners.push(listener);
    return () => { this.rawListeners = this.rawListeners.filter((l) => l !== listener); };
  }
}
