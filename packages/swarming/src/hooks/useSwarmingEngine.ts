// ============================================================================
// swarming — useSwarmingEngine hook
//
// Headless mode: manages the force simulation, WebSocket connection, and
// data mapping without rendering anything. Users own the Canvas.
//
// Usage:
//   import { useSwarmingEngine } from 'swarming'
//
//   function CustomVisualization() {
//     const { nodes, edges, simulation, addNode, removeNode } = useSwarmingEngine({
//       source: 'wss://...',
//     })
//     return (
//       <Canvas>
//         {nodes.map(node => <MyNode key={node.id} {...node} />)}
//       </Canvas>
//     )
//   }
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { SwarmingSimulation, type PhysicsConfig } from '../core/physics';
import type { SwarmingNode, SimNode, SimEdge, ThemeConfig, DataProvider } from '../types';
import { dark } from '../themes/dark';
import { light } from '../themes/light';
import { defaultMapEvent } from '../defaults';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseSwarmingEngineOptions {
  /** WebSocket URL for streaming data */
  source?: string;
  /** Custom data provider */
  provider?: DataProvider;
  /** Static node data */
  data?: SwarmingNode[];
  /** Map raw WebSocket messages to nodes */
  mapEvent?: (raw: Record<string, unknown>) => SwarmingNode;
  /** Theme preset or custom config */
  theme?: 'dark' | 'light' | ThemeConfig;
  /** Physics configuration overrides */
  physics?: Partial<PhysicsConfig>;
  /** Maximum nodes. Default: 2000 */
  maxNodes?: number;
  /** Whether the engine is paused. Default: false */
  paused?: boolean;
}

export interface SwarmingEngineState {
  /** All current simulation nodes */
  nodes: SimNode[];
  /** All current simulation edges */
  edges: SimEdge[];
  /** The underlying simulation instance */
  simulation: SwarmingSimulation;
  /** WebSocket connection state */
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  /** Add a node programmatically */
  addNode: (node: SwarmingNode) => void;
  /** Remove a node by ID */
  removeNode: (id: string) => void;
  /** Reheat the simulation */
  reheat: (alpha?: number) => void;
}

// ---------------------------------------------------------------------------
// Theme resolution
// ---------------------------------------------------------------------------

function resolveTheme(theme: UseSwarmingEngineOptions['theme']): ThemeConfig {
  if (!theme || theme === 'dark') return dark;
  if (theme === 'light') return light;
  return theme;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSwarmingEngine(options: UseSwarmingEngineOptions): SwarmingEngineState {
  const {
    source,
    provider,
    data,
    mapEvent = defaultMapEvent,
    theme: themeProp,
    physics,
    maxNodes,
    paused = false,
  } = options;

  const resolvedTheme = resolveTheme(themeProp);

  const simConfig: Partial<PhysicsConfig> = {
    maxNodes: maxNodes ?? physics?.maxNodes ?? 2000,
    ...physics,
  };

  // Create simulation once
  const simRef = useRef<SwarmingSimulation | null>(null);
  if (!simRef.current) {
    simRef.current = new SwarmingSimulation(simConfig);
  }
  const sim = simRef.current;

  // Accumulated nodes
  const allNodesRef = useRef<SwarmingNode[]>(data ? [...data] : []);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [graphState, setGraphState] = useState<{ nodes: SimNode[]; edges: SimEdge[] }>({
    nodes: [],
    edges: [],
  });

  // --- Static data ---
  useEffect(() => {
    if (data) {
      allNodesRef.current = [...data];
      sim.update(data, resolvedTheme);
    }
  }, [data, sim, resolvedTheme]);

  // --- Custom provider ---
  useEffect(() => {
    if (!provider) return;
    const cleanup = provider.connect((newNodes) => {
      for (const node of newNodes) {
        const idx = allNodesRef.current.findIndex((n) => n.id === node.id);
        if (idx >= 0) {
          allNodesRef.current[idx] = node;
        } else {
          allNodesRef.current.push(node);
        }
      }
      sim.update(allNodesRef.current, resolvedTheme);
    });
    setConnectionState('connected');
    return cleanup ?? undefined;
  }, [provider, sim, resolvedTheme]);

  // --- WebSocket streaming ---
  useEffect(() => {
    if (!source || paused || provider) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let disposed = false;

    function connect() {
      if (disposed) return;
      setConnectionState('connecting');

      try {
        ws = new WebSocket(source!);
      } catch {
        setConnectionState('error');
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        retryCount = 0;
        setConnectionState('connected');
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;
        try {
          const raw = JSON.parse(event.data);
          const node = mapEvent(raw);
          allNodesRef.current.push(node);

          const limit = maxNodes ?? physics?.maxNodes ?? 2000;
          if (allNodesRef.current.length > limit) {
            allNodesRef.current = allNodesRef.current.slice(-limit);
          }

          sim.update(allNodesRef.current, resolvedTheme);
        } catch {
          // Skip unparseable messages
        }
      };

      ws.onerror = () => { setConnectionState('error'); };
      ws.onclose = () => {
        if (!disposed) scheduleReconnect();
      };
    }

    function scheduleReconnect() {
      if (disposed || retryCount >= 10) return;
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      retryCount++;
      reconnectTimer = setTimeout(connect, delay);
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.onopen = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, 'Unmount');
        }
      }
    };
  }, [source, paused, provider, mapEvent, sim, maxNodes, physics?.maxNodes, resolvedTheme]);

  // Tick simulation and update state
  useEffect(() => {
    if (paused) return;
    let raf: number;
    function tick() {
      sim.tick();
      setGraphState({
        nodes: [...sim.getHubNodes(), ...sim.getLeafNodes()],
        edges: [...sim.edges] as SimEdge[],
      });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sim, paused]);

  // Cleanup
  useEffect(() => {
    return () => { simRef.current?.dispose(); };
  }, []);

  const addNode = useCallback((node: SwarmingNode) => {
    allNodesRef.current.push(node);
    sim.update(allNodesRef.current, resolvedTheme);
  }, [sim, resolvedTheme]);

  const removeNode = useCallback((id: string) => {
    allNodesRef.current = allNodesRef.current.filter((n) => n.id !== id);
    sim.update(allNodesRef.current, resolvedTheme);
  }, [sim, resolvedTheme]);

  const reheat = useCallback((alpha?: number) => {
    sim.reheat(alpha);
  }, [sim]);

  return {
    nodes: graphState.nodes,
    edges: graphState.edges,
    simulation: sim,
    connectionState,
    addNode,
    removeNode,
    reheat,
  };
}
