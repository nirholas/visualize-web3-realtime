// ============================================================================
// swarming — useSwarmingEngine hook
//
// Headless mode: manages the force simulation, WebSocket connection, and
// data mapping without rendering anything. Users own the Canvas.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ForceGraphSimulation,
  type ForceGraphConfig,
  type TopToken,
  type TraderEdge,
  type GraphNode,
  type GraphEdge,
} from '@web3viz/core';

import {
  type PhysicsConfig,
  type MappedNode,
  type MappedEdge,
  type StaticGraphData,
  type SwarmingTheme,
  type ThemePreset,
  DEFAULT_PHYSICS,
  defaultMapEvent,
  resolveTheme,
} from '../defaults';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseSwarmingEngineOptions {
  /** WebSocket URL for streaming data */
  source?: string;
  /** Static graph data (alternative to source) */
  data?: StaticGraphData;
  /** Map raw WebSocket messages to nodes */
  mapEvent?: (raw: Record<string, unknown>) => MappedNode;
  /** Physics configuration */
  physics?: PhysicsConfig;
  /** Theme preset or custom theme */
  theme?: ThemePreset | SwarmingTheme;
  /** Maximum number of nodes. Default: 5000 */
  maxNodes?: number;
  /** Whether the engine is paused. Default: false */
  paused?: boolean;
}

export interface SwarmingEngineState {
  /** All current graph nodes */
  nodes: GraphNode[];
  /** All current graph edges */
  edges: GraphEdge[];
  /** The underlying simulation instance */
  simulation: ForceGraphSimulation;
  /** WebSocket connection state */
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  /** Add a node programmatically */
  addNode: (node: MappedNode) => void;
  /** Remove a node by ID */
  removeNode: (id: string) => void;
  /** Reheat the simulation */
  reheat: (alpha?: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers: convert mapped data → TopToken/TraderEdge for the simulation
// ---------------------------------------------------------------------------

function mappedNodesToTopTokens(nodes: MappedNode[], theme: SwarmingTheme): TopToken[] {
  // Group nodes by their group field to create hub tokens
  const groups = new Map<string, { count: number; totalValue: number; label: string }>();

  for (const node of nodes) {
    const group = node.group ?? 'default';
    const existing = groups.get(group);
    if (existing) {
      existing.count++;
      existing.totalValue += node.value ?? 1;
    } else {
      groups.set(group, { count: 1, totalValue: node.value ?? 1, label: node.label ?? group });
    }
  }

  return Array.from(groups.entries()).map(([group, info]) => ({
    tokenAddress: `group:${group}`,
    symbol: info.label || group,
    name: group,
    chain: 'custom',
    trades: info.count,
    volume: info.totalValue,
    nativeSymbol: '',
    source: 'swarming',
  }));
}

function mappedNodesToTraderEdges(nodes: MappedNode[]): TraderEdge[] {
  return nodes.map((node) => ({
    trader: node.id,
    tokenAddress: `group:${node.group ?? 'default'}`,
    chain: 'custom',
    trades: 1,
    volume: node.value ?? 1,
    source: 'swarming',
  }));
}

function staticEdgesToTraderEdges(edges: MappedEdge[]): TraderEdge[] {
  return edges.map((edge) => ({
    trader: edge.source,
    tokenAddress: edge.target,
    chain: 'custom',
    trades: 1,
    volume: 1,
    source: 'swarming',
  }));
}

function staticNodesToTopTokens(nodes: MappedNode[]): TopToken[] {
  return nodes.map((node) => ({
    tokenAddress: node.id,
    symbol: node.label ?? node.id,
    name: node.label ?? node.id,
    chain: 'custom',
    trades: 1,
    volume: node.value ?? 1,
    nativeSymbol: '',
    source: 'swarming',
  }));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSwarmingEngine(options: UseSwarmingEngineOptions): SwarmingEngineState {
  const {
    source,
    data,
    mapEvent = defaultMapEvent,
    physics,
    maxNodes,
    paused = false,
    theme,
  } = options;

  const resolvedTheme = resolveTheme(theme);

  // Build simulation config from physics props
  const simConfig = useMemo<ForceGraphConfig>(() => ({
    maxAgentNodes: maxNodes ?? physics?.maxNodes ?? DEFAULT_PHYSICS.maxNodes,
    hubBaseRadius: physics?.hubBaseRadius ?? DEFAULT_PHYSICS.hubBaseRadius,
    hubMaxRadius: physics?.hubMaxRadius ?? DEFAULT_PHYSICS.hubMaxRadius,
    agentRadius: physics?.agentRadius ?? DEFAULT_PHYSICS.agentRadius,
    hubColors: resolvedTheme.hubColors,
    agentColor: resolvedTheme.agentColor,
    hubChargeStrength: physics?.charge ?? DEFAULT_PHYSICS.charge,
    agentChargeStrength: Math.round((physics?.charge ?? DEFAULT_PHYSICS.charge) / 25),
    hubLinkDistance: physics?.linkDistance ?? DEFAULT_PHYSICS.linkDistance,
    agentLinkDistanceBase: physics?.agentLinkDistance ?? DEFAULT_PHYSICS.agentLinkDistance,
    velocityDecay: physics?.damping ?? DEFAULT_PHYSICS.damping,
    alphaDecay: physics?.alphaDecay ?? DEFAULT_PHYSICS.alphaDecay,
  }), [physics, maxNodes, resolvedTheme]);

  // Create simulation once
  const simRef = useRef<ForceGraphSimulation | null>(null);
  if (!simRef.current) {
    simRef.current = new ForceGraphSimulation(simConfig);
  }
  const sim = simRef.current;

  // Accumulated mapped nodes from WebSocket
  const nodesBuffer = useRef<MappedNode[]>([]);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  // Expose nodes/edges as reactive state (updated by tick in the render loop)
  const [graphState, setGraphState] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    nodes: [],
    edges: [],
  });

  // --- Static data mode ---
  useEffect(() => {
    if (!data) return;
    if (data.edges && data.edges.length > 0) {
      // Direct node-to-node graph: each node is a hub, edges are explicit
      const topTokens = staticNodesToTopTokens(data.nodes);
      const traderEdges = staticEdgesToTraderEdges(data.edges);
      sim.update(topTokens, traderEdges);
    } else {
      // Grouped mode: nodes cluster by group
      const topTokens = mappedNodesToTopTokens(data.nodes, resolvedTheme);
      const traderEdges = mappedNodesToTraderEdges(data.nodes);
      sim.update(topTokens, traderEdges);
    }
    sim.reheat();
  }, [data, sim, resolvedTheme]);

  // --- WebSocket streaming mode ---
  useEffect(() => {
    if (!source || paused) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let disposed = false;

    function connect() {
      if (disposed) return;
      setConnectionState(retryCount > 0 ? 'connecting' : 'connecting');

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
          const mapped = mapEvent(raw);
          nodesBuffer.current.push(mapped);

          // Trim to maxNodes
          const limit = maxNodes ?? physics?.maxNodes ?? DEFAULT_PHYSICS.maxNodes;
          if (nodesBuffer.current.length > limit) {
            nodesBuffer.current = nodesBuffer.current.slice(-limit);
          }

          // Update simulation
          const topTokens = mappedNodesToTopTokens(nodesBuffer.current, resolvedTheme);
          const traderEdges = mappedNodesToTraderEdges(nodesBuffer.current);
          sim.update(topTokens, traderEdges);
        } catch {
          // Skip unparseable messages
        }
      };

      ws.onerror = () => {
        setConnectionState('error');
      };

      ws.onclose = () => {
        if (!disposed) {
          scheduleReconnect();
        }
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
  }, [source, paused, mapEvent, sim, maxNodes, physics?.maxNodes, resolvedTheme]);

  // Tick the simulation periodically and update state
  useEffect(() => {
    if (paused) return;
    let raf: number;
    function tick() {
      sim.tick();
      setGraphState({
        nodes: [...sim.getHubNodes(), ...sim.getAgentNodes()],
        edges: sim.getEdges(),
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

  const addNode = useCallback((node: MappedNode) => {
    nodesBuffer.current.push(node);
    const topTokens = mappedNodesToTopTokens(nodesBuffer.current, resolvedTheme);
    const traderEdges = mappedNodesToTraderEdges(nodesBuffer.current);
    sim.update(topTokens, traderEdges);
  }, [sim, resolvedTheme]);

  const removeNode = useCallback((id: string) => {
    nodesBuffer.current = nodesBuffer.current.filter((n) => n.id !== id);
    const topTokens = mappedNodesToTopTokens(nodesBuffer.current, resolvedTheme);
    const traderEdges = mappedNodesToTraderEdges(nodesBuffer.current);
    sim.update(topTokens, traderEdges);
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
