// ============================================================================
// Swarming — UMD Entry Point
//
// Zero-build-step CDN embed for swarming force-directed graph visualization.
// Exposes `window.Swarming` with an imperative API.
//
// Usage:
//   <script src="https://unpkg.com/swarming/dist/swarming.umd.js"></script>
//   <script>
//     Swarming.create('#viz', { source: 'wss://...' })
//   </script>
// ============================================================================

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ForceGraphSimulation, type TopToken, type TraderEdge, type ForceGraphConfig } from '@web3viz/core';
import SwarmingRenderer from './SwarmingRenderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SwarmingNode {
  id: string;
  label: string;
  group?: string;
  radius?: number;
  color?: string;
}

export interface SwarmingEdge {
  source: string;
  target: string;
  label?: string;
}

export interface StaticData {
  nodes: SwarmingNode[];
  edges?: SwarmingEdge[];
}

export interface SwarmingOptions {
  /** WebSocket URL for real-time data */
  source?: string;
  /** Static data (nodes and edges) — alternative to source */
  data?: StaticData;
  /** Color theme */
  theme?: 'dark' | 'light';
  /** Maximum number of nodes */
  maxNodes?: number;
  /** Force simulation config overrides */
  simulationConfig?: ForceGraphConfig;
  /** Camera field of view */
  fov?: number;
  /** Initial camera position */
  cameraPosition?: [number, number, number];
  /** Show hub labels */
  showLabels?: boolean;
  /** Post-processing (bloom, AO) */
  postProcessing?: boolean;
}

type EventType = 'nodeClick' | 'ready' | 'error' | 'data';
type EventCallback = (payload?: unknown) => void;

export interface SwarmingInstance {
  pause(): void;
  resume(): void;
  setTheme(theme: 'dark' | 'light'): void;
  setMaxNodes(max: number): void;
  addNode(node: SwarmingNode): void;
  removeNode(id: string): void;
  on(event: EventType, callback: EventCallback): void;
  off(event: EventType, callback: EventCallback): void;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Group → color palette
// ---------------------------------------------------------------------------

const GROUP_COLORS: Record<string, string> = {
  default: '#1a1a2e',
  users: '#0f3460',
  tokens: '#16213e',
  protocols: '#2c2c54',
  agents: '#3d3d6b',
};

function colorForGroup(group: string): string {
  return GROUP_COLORS[group] || GROUP_COLORS.default;
}

// ---------------------------------------------------------------------------
// WebSocket data manager
// ---------------------------------------------------------------------------

class WebSocketDataManager {
  private ws: WebSocket | null = null;
  private url: string;
  private maxNodes: number;
  private topTokens: TopToken[] = [];
  private traderEdges: TraderEdge[] = [];
  private onChange: (tokens: TopToken[], edges: TraderEdge[]) => void;
  private onError: (err: unknown) => void;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private disposed = false;
  paused = false;

  constructor(
    url: string,
    maxNodes: number,
    onChange: (tokens: TopToken[], edges: TraderEdge[]) => void,
    onError: (err: unknown) => void,
  ) {
    this.url = url;
    this.maxNodes = maxNodes;
    this.onChange = onChange;
    this.onError = onError;
    this.connect();
  }

  private connect() {
    if (this.disposed) return;
    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      this.onError(err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
    };

    this.ws.onmessage = (event) => {
      if (this.paused) return;
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onerror = () => {
      this.onError(new Error(`WebSocket error: ${this.url}`));
    };

    this.ws.onclose = () => {
      if (!this.disposed) this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  private handleMessage(msg: Record<string, unknown>) {
    // Attempt to interpret as token create or trade event
    if (msg.txType === 'create' || msg.type === 'tokenCreate') {
      const data = (msg.data ?? msg) as Record<string, unknown>;
      const addr = (data.mint ?? data.tokenAddress ?? data.address ?? '') as string;
      if (!addr) return;

      const existing = this.topTokens.find((t) => t.tokenAddress === addr);
      if (existing) {
        existing.trades += 1;
        existing.volume += Number(data.marketCap ?? data.volume ?? 0);
      } else {
        if (this.topTokens.length >= this.maxNodes) {
          // evict the smallest hub
          this.topTokens.sort((a, b) => b.trades - a.trades);
          this.topTokens.pop();
        }
        this.topTokens.push({
          tokenAddress: addr,
          symbol: (data.symbol ?? data.name ?? addr.slice(0, 6)) as string,
          name: (data.name ?? '') as string,
          chain: (data.chain ?? 'unknown') as string,
          trades: 1,
          volume: Number(data.marketCap ?? data.volume ?? 0),
          nativeSymbol: (data.nativeSymbol ?? '') as string,
        });
      }
      this.onChange(this.topTokens, this.traderEdges);
    }

    if (msg.txType === 'buy' || msg.txType === 'sell' || msg.type === 'trade') {
      const data = (msg.data ?? msg) as Record<string, unknown>;
      const trader = (data.traderPublicKey ?? data.traderAddress ?? data.trader ?? '') as string;
      const addr = (data.mint ?? data.tokenAddress ?? '') as string;
      if (!trader || !addr) return;

      const hub = this.topTokens.find((t) => t.tokenAddress === addr);
      if (hub) {
        hub.trades += 1;
        hub.volume += Number(data.vSolInBondingCurve ?? data.nativeAmount ?? data.volume ?? 0);
      }

      const existingEdge = this.traderEdges.find(
        (e) => e.trader === trader && e.tokenAddress === addr,
      );
      if (existingEdge) {
        existingEdge.trades += 1;
      } else {
        this.traderEdges.push({
          trader,
          tokenAddress: addr,
          chain: (data.chain ?? 'unknown') as string,
          trades: 1,
          volume: Number(data.nativeAmount ?? data.volume ?? 0),
        });
      }
      this.onChange(this.topTokens, this.traderEdges);
    }
  }

  setMaxNodes(max: number) {
    this.maxNodes = max;
  }

  dispose() {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
  }
}

// ---------------------------------------------------------------------------
// Static data → TopToken/TraderEdge conversion
// ---------------------------------------------------------------------------

function staticDataToGraph(data: StaticData): { topTokens: TopToken[]; traderEdges: TraderEdge[] } {
  const topTokens: TopToken[] = data.nodes.map((n, i) => ({
    tokenAddress: n.id,
    symbol: n.label,
    name: n.label,
    chain: n.group ?? 'default',
    trades: 1 + i,
    volume: 1 + i,
    nativeSymbol: '',
    source: n.group,
  }));

  const traderEdges: TraderEdge[] = (data.edges ?? []).map((e) => ({
    trader: e.source,
    tokenAddress: e.target,
    chain: 'default',
    trades: 1,
    volume: 1,
  }));

  return { topTokens, traderEdges };
}

// ---------------------------------------------------------------------------
// Swarming.create — main factory
// ---------------------------------------------------------------------------

function create(selector: string, options: SwarmingOptions = {}): SwarmingInstance {
  const container =
    typeof selector === 'string' ? document.querySelector<HTMLElement>(selector) : null;
  if (!container) {
    throw new Error(`Swarming: no element found for selector "${selector}"`);
  }

  // Event emitter
  const listeners = new Map<EventType, Set<EventCallback>>();
  function emit(event: EventType, payload?: unknown) {
    listeners.get(event)?.forEach((cb) => {
      try {
        cb(payload);
      } catch {
        // consumer error — ignore
      }
    });
  }

  // State
  let theme = options.theme ?? 'dark';
  let maxNodes = options.maxNodes ?? 2000;
  let topTokens: TopToken[] = [];
  let traderEdges: TraderEdge[] = [];
  let root: Root | null = null;
  let wsManager: WebSocketDataManager | null = null;

  // Hub colors from simulation config or defaults
  const hubColors = options.simulationConfig?.hubColors ?? [
    '#1a1a2e', '#16213e', '#0f3460', '#2c2c54',
    '#1b1b2f', '#3d3d6b', '#2a2d3e', '#1e3163',
  ];
  const darkHubColors = hubColors;
  const lightHubColors = [
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
    '#14b8a6', '#f59e0b', '#ef4444', '#22c55e',
  ];

  // Simulation config
  const simConfig: ForceGraphConfig = {
    maxAgentNodes: maxNodes,
    ...options.simulationConfig,
    hubColors: theme === 'dark' ? darkHubColors : lightHubColors,
  };

  // Render function
  function render() {
    if (!root) return;

    const bg = theme === 'dark' ? '#0a0a1a' : '#ffffff';
    const groundColor = theme === 'dark' ? '#0d0d1f' : '#f8f8fa';
    const postProcessing = options.postProcessing !== false
      ? { enabled: true, bloomIntensity: 1.2, bloomThreshold: 0.85, aoIntensity: 0.5 }
      : { enabled: false };

    root.render(
      React.createElement(SwarmingRenderer, {
        topTokens,
        traderEdges,
        background: bg,
        groundColor,
        simulationConfig: {
          ...simConfig,
          hubColors: theme === 'dark' ? darkHubColors : lightHubColors,
        },
        showLabels: options.showLabels !== false,
        fov: options.fov ?? 45,
        cameraPosition: options.cameraPosition ?? [0, 55, 12],
        postProcessing,
        onReady: () => emit('ready'),
      }),
    );
  }

  // Initialize React root
  root = createRoot(container);

  // Static data mode
  if (options.data) {
    const result = staticDataToGraph(options.data);
    topTokens = result.topTokens;
    traderEdges = result.traderEdges;
    render();
  }

  // WebSocket mode
  if (options.source) {
    wsManager = new WebSocketDataManager(
      options.source,
      maxNodes,
      (tokens, edges) => {
        topTokens = tokens;
        traderEdges = edges;
        render();
        emit('data', { nodeCount: tokens.length, edgeCount: edges.length });
      },
      (err) => emit('error', err),
    );
  }

  // If neither source nor data, render empty scene
  if (!options.source && !options.data) {
    render();
  }

  // Imperative API
  const instance: SwarmingInstance = {
    pause() {
      if (wsManager) wsManager.paused = true;
    },

    resume() {
      if (wsManager) wsManager.paused = false;
    },

    setTheme(newTheme: 'dark' | 'light') {
      theme = newTheme;
      render();
    },

    setMaxNodes(max: number) {
      maxNodes = max;
      if (wsManager) wsManager.setMaxNodes(max);
      simConfig.maxAgentNodes = max;
      render();
    },

    addNode(node: SwarmingNode) {
      const color = node.color ?? colorForGroup(node.group ?? 'default');
      topTokens.push({
        tokenAddress: node.id,
        symbol: node.label,
        name: node.label,
        chain: node.group ?? 'default',
        trades: 1,
        volume: 1,
        nativeSymbol: '',
        source: node.group,
      });
      render();
    },

    removeNode(id: string) {
      topTokens = topTokens.filter((t) => t.tokenAddress !== id);
      traderEdges = traderEdges.filter(
        (e) => e.tokenAddress !== id && e.trader !== id,
      );
      render();
    },

    on(event: EventType, callback: EventCallback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(callback);
    },

    off(event: EventType, callback: EventCallback) {
      listeners.get(event)?.delete(callback);
    },

    destroy() {
      wsManager?.dispose();
      wsManager = null;
      if (root) {
        root.unmount();
        root = null;
      }
      listeners.clear();
      container.innerHTML = '';
    },
  };

  return instance;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const Swarming = { create };

export default Swarming;
