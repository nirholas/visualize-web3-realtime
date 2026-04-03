// ============================================================================
// @web3viz/core — Force Graph Simulation Engine
//
// Pure d3-force simulation manager. Framework-agnostic — can drive any
// renderer (Three.js, Canvas 2D, SVG, etc.)
// ============================================================================

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';

import type { TopToken, TraderEdge, GraphNode, GraphEdge } from '../types';

// ---------------------------------------------------------------------------
// Internal node/edge types (extend d3-force interfaces)
// ---------------------------------------------------------------------------

interface ForceNode extends SimulationNodeDatum {
  id: string;
  type: 'hub' | 'agent';
  label: string;
  radius: number;
  color: string;
  hubMint?: string;
}

interface ForceEdge extends SimulationLinkDatum<ForceNode> {
  sourceId: string;
  targetId: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ForceGraphConfig {
  /** Maximum number of agent (non-hub) nodes */
  maxAgentNodes?: number;
  /** Base radius for hub nodes */
  hubBaseRadius?: number;
  /** Maximum radius for hub nodes */
  hubMaxRadius?: number;
  /** Radius for agent nodes */
  agentRadius?: number;
  /** Hub node colors (cycled through) */
  hubColors?: string[];
  /** Agent node color */
  agentColor?: string;
  /** Charge strength for hub nodes */
  hubChargeStrength?: number;
  /** Charge strength for agent nodes */
  agentChargeStrength?: number;
  /** Center force strength */
  centerStrength?: number;
  /** Collision force strength */
  collisionStrength?: number;
  /** Hub-to-hub link distance */
  hubLinkDistance?: number;
  /** Agent-to-hub link distance base */
  agentLinkDistanceBase?: number;
  /** Alpha decay rate */
  alphaDecay?: number;
  /** Velocity decay rate */
  velocityDecay?: number;
}

const DEFAULT_CONFIG: Required<ForceGraphConfig> = {
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
};

// ---------------------------------------------------------------------------
// Force Graph Simulation
// ---------------------------------------------------------------------------

export class ForceGraphSimulation {
  nodes: ForceNode[] = [];
  edges: ForceEdge[] = [];

  private simulation: ReturnType<typeof forceSimulation<ForceNode>>;
  private nodeMap = new Map<string, ForceNode>();
  private config: Required<ForceGraphConfig>;

  constructor(config: ForceGraphConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    const c = this.config;

    this.simulation = forceSimulation<ForceNode>([])
      .force(
        'charge',
        forceManyBody<ForceNode>().strength((d) =>
          d.type === 'hub' ? c.hubChargeStrength : c.agentChargeStrength,
        ),
      )
      .force('center', forceCenter(0, 0).strength(c.centerStrength))
      .force(
        'collide',
        forceCollide<ForceNode>()
          .radius((d) => d.radius + 0.3)
          .strength(c.collisionStrength),
      )
      .force(
        'link',
        forceLink<ForceNode, ForceEdge>([])
          .id((d) => d.id)
          .distance((d) => {
            const src = d.source as ForceNode;
            const tgt = d.target as ForceNode;
            if (src.type === 'hub' && tgt.type === 'hub') return c.hubLinkDistance;
            return c.agentLinkDistanceBase + Math.random() * 3;
          })
          .strength((d) => {
            const src = d.source as ForceNode;
            const tgt = d.target as ForceNode;
            if (src.type === 'hub' && tgt.type === 'hub') return 0.1;
            return 0.3;
          }),
      )
      .alphaDecay(c.alphaDecay)
      .velocityDecay(c.velocityDecay);
  }

  /** Feed new data into the simulation */
  update(topTokens: TopToken[], traderEdges: TraderEdge[]): void {
    const c = this.config;
    let changed = false;

    // Hub nodes from top tokens
    const hubMints = new Set<string>();
    for (let i = 0; i < topTokens.length; i++) {
      const t = topTokens[i];
      hubMints.add(t.mint);
      const existing = this.nodeMap.get(t.mint);
      const maxVol = topTokens[0]?.volumeSol || 1;
      const scaledRadius =
        c.hubBaseRadius + (t.volumeSol / maxVol) * (c.hubMaxRadius - c.hubBaseRadius);

      if (existing) {
        existing.radius = scaledRadius;
        existing.label = t.symbol || t.name;
      } else {
        const angle = (i / Math.max(topTokens.length, 1)) * Math.PI * 2;
        const dist = 15 + Math.random() * 5;
        const node: ForceNode = {
          id: t.mint,
          type: 'hub',
          label: t.symbol || t.name,
          radius: scaledRadius,
          color: c.hubColors[i % c.hubColors.length],
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
        };
        this.nodeMap.set(t.mint, node);
        this.nodes.push(node);
        changed = true;
      }
    }

    // Agent nodes from trader edges
    const agentCount = this.nodes.filter((n) => n.type === 'agent').length;
    const budget = c.maxAgentNodes - agentCount;
    let added = 0;

    for (const edge of traderEdges) {
      if (!hubMints.has(edge.mint)) continue;
      const agentId = `agent:${edge.trader}:${edge.mint}`;
      if (this.nodeMap.has(agentId)) continue;
      if (added >= budget) break;

      const hub = this.nodeMap.get(edge.mint);
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 4;
      const node: ForceNode = {
        id: agentId,
        type: 'agent',
        label: edge.trader.slice(0, 6),
        radius: c.agentRadius,
        color: c.agentColor,
        hubMint: edge.mint,
        x: (hub?.x ?? 0) + Math.cos(angle) * dist,
        y: (hub?.y ?? 0) + Math.sin(angle) * dist,
      };
      this.nodeMap.set(agentId, node);
      this.nodes.push(node);
      added++;
      changed = true;
    }

    // Rebuild edges
    if (changed) {
      const newEdges: ForceEdge[] = [];
      const hubNodes = this.nodes.filter((n) => n.type === 'hub');

      // Hub-to-hub (fully connected)
      for (let i = 0; i < hubNodes.length; i++) {
        for (let j = i + 1; j < hubNodes.length; j++) {
          newEdges.push({
            sourceId: hubNodes[i].id,
            targetId: hubNodes[j].id,
            source: hubNodes[i].id,
            target: hubNodes[j].id,
          });
        }
      }

      // Agent-to-hub
      for (const node of this.nodes) {
        if (node.type === 'agent' && node.hubMint && this.nodeMap.has(node.hubMint)) {
          newEdges.push({
            sourceId: node.id,
            targetId: node.hubMint,
            source: node.id,
            target: node.hubMint,
          });
        }
      }

      this.edges = newEdges;

      this.simulation.nodes(this.nodes);
      (this.simulation.force('link') as ReturnType<typeof forceLink<ForceNode, ForceEdge>>).links(
        this.edges,
      );
      this.simulation.alpha(0.3).restart();
    }
  }

  /** Advance the simulation by one tick */
  tick(): void {
    this.simulation.tick();
  }

  /** Get the current hub nodes */
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
      }));
  }

  /** Get the current agent nodes */
  getAgentNodes(): GraphNode[] {
    return this.nodes
      .filter((n) => n.type === 'agent')
      .map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        radius: n.radius,
        color: n.color,
        hubMint: n.hubMint,
        x: n.x,
        y: n.y,
      }));
  }

  /** Get all edges */
  getEdges(): GraphEdge[] {
    return this.edges.map((e) => ({
      sourceId: e.sourceId,
      targetId: e.targetId,
      source: e.source as string | GraphNode,
      target: e.target as string | GraphNode,
    }));
  }

  /** Get a node by ID */
  getNode(id: string): GraphNode | undefined {
    const n = this.nodeMap.get(id);
    if (!n) return undefined;
    return {
      id: n.id,
      type: n.type,
      label: n.label,
      radius: n.radius,
      color: n.color,
      hubMint: n.hubMint,
      x: n.x,
      y: n.y,
    };
  }

  /** Reheat the simulation (trigger new layout) */
  reheat(alpha = 0.5): void {
    this.simulation.alpha(alpha).restart();
  }

  /** Stop the simulation */
  dispose(): void {
    this.simulation.stop();
  }
}
