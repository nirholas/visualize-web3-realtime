// ============================================================================
// @swarming/engine — SwarmingEngine
//
// The main entry point for vanilla JS usage. Creates a simulation + renderer
// and manages WebSocket connections and data flow.
//
// Usage:
//   import { createSwarming } from '@swarming/engine'
//   const viz = createSwarming(document.getElementById('container'), {
//     source: 'wss://...',
//     theme: 'dark',
//   })
// ============================================================================

import { ForceSimulation } from './physics/ForceSimulation';
import { ThreeRenderer } from './renderers/ThreeRenderer';
import { resolveTheme } from './themes';
import type {
  SwarmingConfig,
  SwarmingInstance,
  SwarmingEventType,
  SwarmingEventMap,
  SwarmingNode,
  GroupData,
  LeafEdge,
  ThemeInput,
} from './types';

// ---------------------------------------------------------------------------
// WebSocket data manager
// ---------------------------------------------------------------------------

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private disposed = false;

  paused = false;

  constructor(
    private url: string,
    private maxNodes: number,
    private onChange: (nodes: SwarmingNode[]) => void,
    private onError: (err: Error) => void,
  ) {
    this.connect();
  }

  private connect() {
    if (this.disposed) return;
    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      this.onError(err instanceof Error ? err : new Error(String(err)));
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => { this.reconnectDelay = 1000; };

    this.ws.onmessage = (event) => {
      if (this.paused) return;
      try {
        const msg = JSON.parse(event.data);
        const nodes: SwarmingNode[] = Array.isArray(msg) ? msg : [msg];
        this.onChange(nodes);
      } catch {
        // ignore malformed
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
    this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  setMaxNodes(max: number) { this.maxNodes = max; }

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
// Node → group aggregation
// ---------------------------------------------------------------------------

function aggregateNodes(nodes: SwarmingNode[]): { groups: GroupData[]; leafEdges: LeafEdge[] } {
  const groupMap = new Map<string, { count: number; totalSize: number; label: string }>();
  const leafEdges: LeafEdge[] = [];

  for (const node of nodes) {
    const group = node.group ?? 'default';
    const existing = groupMap.get(group);
    if (existing) {
      existing.count++;
      existing.totalSize += node.size ?? 1;
    } else {
      groupMap.set(group, { count: 1, totalSize: node.size ?? 1, label: node.label ?? group });
    }

    if (node.connections) {
      for (const conn of node.connections) {
        leafEdges.push({ leafId: `leaf:${node.id}`, hubId: conn });
      }
    } else {
      leafEdges.push({ leafId: `leaf:${node.id}`, hubId: group });
    }
  }

  const groups: GroupData[] = [...groupMap.entries()]
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.totalSize - a.totalSize);

  return { groups, leafEdges };
}

// ---------------------------------------------------------------------------
// createSwarming — main factory
// ---------------------------------------------------------------------------

export function createSwarming(
  container: HTMLElement | string,
  config: SwarmingConfig = {},
): SwarmingInstance {
  const el = typeof container === 'string'
    ? document.querySelector<HTMLElement>(container)
    : container;
  if (!el) throw new Error(`Swarming: no element found for "${container}"`);

  // Ensure container has relative positioning for label overlay
  if (getComputedStyle(el).position === 'static') {
    el.style.position = 'relative';
  }

  const theme = resolveTheme(config.theme);
  const maxNodes = config.nodes ?? 2000;

  // Simulation
  const simulation = new ForceSimulation(config.physics, theme.hubColors);

  // Renderer
  const renderer = new ThreeRenderer(el, {
    theme,
    fov: config.fov ?? 45,
    cameraPosition: config.cameraPosition ?? [0, 55, 12],
    showLabels: config.showLabels !== false,
  });

  // Event emitter
  const listeners = new Map<string, Set<(payload: unknown) => void>>();
  function emit<E extends SwarmingEventType>(event: E, payload: SwarmingEventMap[E]) {
    listeners.get(event)?.forEach((cb) => { try { cb(payload); } catch { /* */ } });
  }

  // Node accumulator
  let allNodes: SwarmingNode[] = [];

  function pushNodes(nodes: SwarmingNode[]) {
    allNodes.push(...nodes);
    if (allNodes.length > maxNodes) allNodes = allNodes.slice(-maxNodes);
    const { groups, leafEdges } = aggregateNodes(allNodes);
    simulation.update(groups, leafEdges);
    emit('data', { nodeCount: simulation.nodes.length, edgeCount: simulation.edges.length });
  }

  // Static data
  if (config.data) pushNodes(config.data);

  // WebSocket
  let wsManager: WebSocketManager | null = null;
  if (config.source) {
    wsManager = new WebSocketManager(
      config.source,
      maxNodes,
      (nodes) => pushNodes(nodes),
      (err) => emit('error', err),
    );
  }

  // Animation loop
  let disposed = false;
  function animate() {
    if (disposed) return;
    simulation.tick();
    renderer.render(simulation.nodes, simulation.edges);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // Emit ready
  queueMicrotask(() => emit('ready', undefined as never));

  // Instance API
  const instance: SwarmingInstance = {
    pause() { if (wsManager) wsManager.paused = true; },
    resume() { if (wsManager) wsManager.paused = false; },

    setTheme(t: ThemeInput) {
      const resolved = resolveTheme(t);
      renderer.setTheme(resolved);
    },

    setMaxNodes(max: number) {
      wsManager?.setMaxNodes(max);
    },

    addNodes(nodes: SwarmingNode[]) {
      pushNodes(nodes);
    },

    removeNode(id: string) {
      allNodes = allNodes.filter((n) => n.id !== id);
      const { groups, leafEdges } = aggregateNodes(allNodes);
      simulation.update(groups, leafEdges);
    },

    setConfig(newConfig: Partial<SwarmingConfig>) {
      if (newConfig.theme) instance.setTheme(newConfig.theme);
      if (newConfig.data) pushNodes(newConfig.data);
    },

    on<E extends SwarmingEventType>(event: E, callback: (payload: SwarmingEventMap[E]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(callback as (payload: unknown) => void);
    },

    off<E extends SwarmingEventType>(event: E, callback: (payload: SwarmingEventMap[E]) => void) {
      listeners.get(event)?.delete(callback as (payload: unknown) => void);
    },

    reheat(alpha?: number) { simulation.reheat(alpha); },

    destroy() {
      disposed = true;
      wsManager?.dispose();
      simulation.dispose();
      renderer.destroy();
      listeners.clear();
    },

    getContainer() { return el; },
    getSimulation() { return simulation; },
  };

  return instance;
}
