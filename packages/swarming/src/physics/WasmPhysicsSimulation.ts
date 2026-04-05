// ============================================================================
// WasmPhysicsSimulation — drop-in replacement for ForceGraphSimulation
//
// Uses the WASM physics engine via Web Worker for off-thread simulation.
// Falls back to main-thread WASM or d3-force-3d JavaScript as needed.
//
// API is compatible with @web3viz/core ForceGraphSimulation:
//   - update(topTokens, traderEdges)
//   - tick()
//   - getHubNodes(), getAgentNodes(), getEdges()
//   - getNode(id)
//   - reheat(alpha)
//   - dispose()
// ============================================================================

import type { PhysicsBackend, PhysicsMode } from './auto-detect';
import { resolvePhysicsMode } from './auto-detect';
import { PhysicsWorkerBridge } from './worker';
import type { WasmSimulation } from './wasm-loader';

// Re-export types that match @web3viz/core
export interface GraphNode {
  id: string;
  type: 'hub' | 'agent';
  label: string;
  radius: number;
  color: string;
  hubTokenAddress?: string;
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface TopToken {
  tokenAddress: string;
  symbol: string;
  name: string;
  chain: string;
  trades: number;
  volume: number;
  nativeSymbol: string;
  source?: string;
}

export interface TraderEdge {
  trader: string;
  tokenAddress: string;
  chain: string;
  trades: number;
  volume: number;
  source?: string;
}

export interface WasmPhysicsConfig {
  /** Physics mode: 'auto', 'wasm', or 'js' */
  physics?: PhysicsMode;
  /** Maximum number of agent nodes */
  maxAgentNodes?: number;
  /** Hub base radius */
  hubBaseRadius?: number;
  /** Hub max radius */
  hubMaxRadius?: number;
  /** Agent radius */
  agentRadius?: number;
  /** Hub node colors */
  hubColors?: string[];
  /** Agent node color */
  agentColor?: string;
  /** Charge strength for hubs */
  hubChargeStrength?: number;
  /** Charge strength for agents */
  agentChargeStrength?: number;
  /** Center force strength */
  centerStrength?: number;
  /** Collision force strength */
  collisionStrength?: number;
  /** Hub-to-hub link distance */
  hubLinkDistance?: number;
  /** Agent-to-hub link distance */
  agentLinkDistanceBase?: number;
  /** Alpha decay rate */
  alphaDecay?: number;
  /** Velocity decay rate */
  velocityDecay?: number;
  /** Barnes-Hut theta (higher = faster but less accurate) */
  theta?: number;
  /** URL to WASM file (optional) */
  wasmUrl?: string;
}

const DEFAULT_CONFIG = {
  maxAgentNodes: 5000,
  hubBaseRadius: 0.8,
  hubMaxRadius: 3.0,
  agentRadius: 0.06,
  hubColors: [
    '#1a1a2e', '#16213e', '#0f3460', '#2c2c54',
    '#1b1b2f', '#3d3d6b', '#2a2d3e', '#1e3163',
  ],
  agentColor: '#555566',
  hubChargeStrength: -200,
  agentChargeStrength: -8,
  centerStrength: 0.03,
  collisionStrength: 0.7,
  hubLinkDistance: 25,
  agentLinkDistanceBase: 5,
  alphaDecay: 0.01,
  velocityDecay: 0.4,
  theta: 0.9,
};

interface InternalNode {
  id: string;
  type: 'hub' | 'agent';
  label: string;
  radius: number;
  color: string;
  hubTokenAddress?: string;
  x: number;
  y: number;
  z: number;
}

interface InternalEdge {
  sourceId: string;
  targetId: string;
}

/**
 * WASM-accelerated force graph simulation with the same API as ForceGraphSimulation.
 *
 * Internally manages a WASM simulation (via Worker or main-thread) and keeps
 * a mirror of the node/edge state for querying.
 */
export class WasmPhysicsSimulation {
  // Public state (mirrors ForceGraphSimulation)
  nodes: InternalNode[] = [];
  edges: InternalEdge[] = [];

  private config: typeof DEFAULT_CONFIG & { physics?: PhysicsMode; wasmUrl?: string };
  private nodeMap = new Map<string, InternalNode>();
  private nodeIndexMap = new Map<string, number>(); // id -> insertion order index
  private insertionOrder: string[] = [];

  // WASM backend
  private backend: PhysicsBackend;
  private worker: PhysicsWorkerBridge | null = null;
  private wasmSim: WasmSimulation | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  // Latest positions from WASM
  private latestPositions: Float64Array | null = null;

  constructor(config: WasmPhysicsConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.backend = resolvePhysicsMode(config.physics ?? 'auto');
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    const wasmConfig = {
      chargeStrength: this.config.hubChargeStrength,
      agentChargeStrength: this.config.agentChargeStrength,
      linkDistance: this.config.hubLinkDistance,
      agentLinkDistance: this.config.agentLinkDistanceBase,
      linkStrength: 0.1,
      agentLinkStrength: 0.3,
      centerPull: this.config.centerStrength,
      collisionRadius: 0.3,
      collisionStrength: this.config.collisionStrength,
      alphaDecay: this.config.alphaDecay,
      velocityDecay: this.config.velocityDecay,
      theta: this.config.theta ?? 0.9,
    };

    if (this.backend === 'wasm-worker') {
      try {
        this.worker = new PhysicsWorkerBridge({
          config: wasmConfig,
          wasmUrl: this.config.wasmUrl,
          onPositions: (positions) => {
            this.latestPositions = positions;
            this.syncPositionsFromWasm(positions);
          },
        });
        await this.worker.waitReady();
        this.initialized = true;
        return;
      } catch {
        // Fall back to main-thread WASM
        this.backend = 'wasm';
      }
    }

    if (this.backend === 'wasm') {
      try {
        const { loadWasmPhysics } = await import('./wasm-loader');
        const wasm = await loadWasmPhysics(this.config.wasmUrl);
        this.wasmSim = new wasm.Simulation(wasmConfig);
        this.initialized = true;
        return;
      } catch {
        // Fall back to JS
        this.backend = 'js';
      }
    }

    // JS fallback — no WASM available, simulation will be a no-op
    // The consumer should use ForceGraphSimulation from @web3viz/core instead
    this.initialized = true;
    console.warn(
      '[WasmPhysicsSimulation] WASM not available. ' +
      'Falling back to no-op. Use ForceGraphSimulation from @web3viz/core for JS fallback.'
    );
  }

  /** Wait for WASM initialization to complete. */
  async ready(): Promise<void> {
    if (this.initPromise) await this.initPromise;
  }

  /** Which backend is active? */
  get activeBackend(): PhysicsBackend {
    return this.backend;
  }

  /** Feed new data into the simulation (same API as ForceGraphSimulation). */
  update(topTokens: TopToken[], traderEdges: TraderEdge[]): void {
    const c = this.config;
    let changed = false;

    // Hub nodes from top tokens
    const hubAddresses = new Set<string>();
    for (let i = 0; i < topTokens.length; i++) {
      const t = topTokens[i];
      hubAddresses.add(t.tokenAddress);
      const existing = this.nodeMap.get(t.tokenAddress);
      const maxVol = topTokens[0]?.volume || 1;
      const scaledRadius =
        c.hubBaseRadius + (t.volume / maxVol) * (c.hubMaxRadius - c.hubBaseRadius);

      if (existing) {
        existing.radius = scaledRadius;
        existing.label = t.symbol || t.name;
      } else {
        // Spherical distribution using golden angle
        const phi = Math.acos(1 - 2 * (i + 0.5) / Math.max(topTokens.length, 1));
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const dist = 15 + Math.random() * 5;
        const node: InternalNode = {
          id: t.tokenAddress,
          type: 'hub',
          label: t.symbol || t.name,
          radius: scaledRadius,
          color: c.hubColors[i % c.hubColors.length],
          x: Math.sin(phi) * Math.cos(theta) * dist,
          y: Math.sin(phi) * Math.sin(theta) * dist,
          z: Math.cos(phi) * dist,
        };
        this.nodeMap.set(t.tokenAddress, node);
        this.nodes.push(node);
        this.nodeIndexMap.set(node.id, this.insertionOrder.length);
        this.insertionOrder.push(node.id);
        changed = true;

        // Send to WASM
        this.wasmAddNode(node.id, node.x, node.y, node.z, 0, node.radius);
      }
    }

    // Agent nodes
    const agentCount = this.nodes.filter((n) => n.type === 'agent').length;
    const budget = c.maxAgentNodes - agentCount;
    let added = 0;

    for (const edge of traderEdges) {
      if (!hubAddresses.has(edge.tokenAddress)) continue;
      const agentId = `agent:${edge.trader}:${edge.tokenAddress}`;
      if (this.nodeMap.has(agentId)) continue;
      if (added >= budget) break;

      const hub = this.nodeMap.get(edge.tokenAddress);
      const aPhi = Math.acos(1 - 2 * Math.random());
      const aTheta = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 4;
      const node: InternalNode = {
        id: agentId,
        type: 'agent',
        label: edge.trader.slice(0, 6),
        radius: c.agentRadius,
        color: c.agentColor,
        hubTokenAddress: edge.tokenAddress,
        x: (hub?.x ?? 0) + Math.sin(aPhi) * Math.cos(aTheta) * dist,
        y: (hub?.y ?? 0) + Math.sin(aPhi) * Math.sin(aTheta) * dist,
        z: (hub?.z ?? 0) + Math.cos(aPhi) * dist,
      };
      this.nodeMap.set(agentId, node);
      this.nodes.push(node);
      this.nodeIndexMap.set(node.id, this.insertionOrder.length);
      this.insertionOrder.push(node.id);
      added++;
      changed = true;

      this.wasmAddNode(node.id, node.x, node.y, node.z, 1, node.radius);
    }

    // Rebuild edges
    if (changed) {
      // Clear edges in WASM (we'll rebuild)
      const newEdges: InternalEdge[] = [];
      const hubNodes = this.nodes.filter((n) => n.type === 'hub');

      // Hub-to-hub (fully connected)
      for (let i = 0; i < hubNodes.length; i++) {
        for (let j = i + 1; j < hubNodes.length; j++) {
          newEdges.push({ sourceId: hubNodes[i].id, targetId: hubNodes[j].id });
        }
      }

      // Agent-to-hub
      for (const node of this.nodes) {
        if (node.type === 'agent' && node.hubTokenAddress && this.nodeMap.has(node.hubTokenAddress)) {
          newEdges.push({ sourceId: node.id, targetId: node.hubTokenAddress });
        }
      }

      this.edges = newEdges;

      // Sync edges to WASM
      this.wasmSyncEdges(newEdges);
      this.wasmSetAlpha(0.3);
    }
  }

  /** Advance the simulation by one tick. */
  tick(): void {
    if (this.backend === 'wasm-worker' && this.worker) {
      this.worker.tick();
      // Positions will arrive async via onPositions callback
      // For synchronous access, use the latest cached positions
      if (this.latestPositions) {
        this.syncPositionsFromWasm(this.latestPositions);
      }
    } else if (this.backend === 'wasm' && this.wasmSim) {
      const positions = this.wasmSim.tick();
      this.syncPositionsFromWasm(positions);
    }
    // JS fallback: no-op (use ForceGraphSimulation instead)
  }

  /** Get hub nodes with current positions. */
  getHubNodes(): GraphNode[] {
    return this.nodes
      .filter((n) => n.type === 'hub')
      .map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        radius: n.radius,
        color: n.color,
        x: n.x,
        y: n.y,
        z: n.z,
      }));
  }

  /** Get agent nodes with current positions. */
  getAgentNodes(): GraphNode[] {
    return this.nodes
      .filter((n) => n.type === 'agent')
      .map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        radius: n.radius,
        color: n.color,
        hubTokenAddress: n.hubTokenAddress,
        x: n.x,
        y: n.y,
        z: n.z,
      }));
  }

  /** Get all edges. */
  getEdges(): GraphEdge[] {
    return this.edges.map((e) => ({
      sourceId: e.sourceId,
      targetId: e.targetId,
      source: e.sourceId,
      target: e.targetId,
    }));
  }

  /** Get a single node by ID. */
  getNode(id: string): GraphNode | undefined {
    const n = this.nodeMap.get(id);
    if (!n) return undefined;
    return {
      id: n.id,
      type: n.type,
      label: n.label,
      radius: n.radius,
      color: n.color,
      hubTokenAddress: n.hubTokenAddress,
      x: n.x,
      y: n.y,
      z: n.z,
    };
  }

  /** Reheat the simulation. */
  reheat(alpha = 0.5): void {
    this.wasmSetAlpha(alpha);
  }

  /** Set mouse repulsion force. */
  setMouseRepulsion(x: number, y: number, z: number, strength: number, radius: number): void {
    if (this.worker) {
      this.worker.setMouseRepulsion(x, y, z, strength, radius);
    } else if (this.wasmSim) {
      this.wasmSim.set_mouse_repulsion(x, y, z, strength, radius);
    }
  }

  /** Stop and clean up. */
  dispose(): void {
    if (this.worker) {
      this.worker.dispose();
      this.worker = null;
    }
    this.wasmSim = null;
    this.nodes = [];
    this.edges = [];
    this.nodeMap.clear();
    this.nodeIndexMap.clear();
    this.insertionOrder = [];
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private syncPositionsFromWasm(positions: Float64Array | number[]): void {
    for (let i = 0; i < this.insertionOrder.length; i++) {
      const id = this.insertionOrder[i];
      const node = this.nodeMap.get(id);
      if (node && i * 3 + 2 < positions.length) {
        node.x = positions[i * 3];
        node.y = positions[i * 3 + 1];
        node.z = positions[i * 3 + 2];
      }
    }
  }

  private wasmAddNode(id: string, x: number, y: number, z: number, nodeType: number, radius: number): void {
    if (this.worker) {
      this.worker.addNode(id, x, y, z, nodeType, radius);
    } else if (this.wasmSim) {
      this.wasmSim.add_node(id, x, y, z, nodeType, radius);
    }
  }

  private wasmSyncEdges(edges: InternalEdge[]): void {
    if (this.worker) {
      // Batch edge additions for efficiency
      const commands = edges.map((e) => ({
        type: 'addEdge' as const,
        source: e.sourceId,
        target: e.targetId,
      }));
      this.worker.batch(commands);
    } else if (this.wasmSim) {
      for (const e of edges) {
        this.wasmSim.add_edge(e.sourceId, e.targetId);
      }
    }
  }

  private wasmSetAlpha(alpha: number): void {
    if (this.worker) {
      this.worker.setAlpha(alpha);
    } else if (this.wasmSim) {
      this.wasmSim.set_alpha(alpha);
    }
  }
}
