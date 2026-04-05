// ============================================================================
// @swarming/engine — Force Simulation
//
// Pure d3-force-3d simulation. Framework-agnostic — can drive any renderer.
// ============================================================================

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum3D,
} from 'd3-force-3d';
import type { SimulationLinkDatum } from 'd3-force';
import type { SimNode, SimEdge, GroupData, LeafEdge, PhysicsConfig, SwarmingSimulation } from '../types';

// ---------------------------------------------------------------------------
// d3 internal types
// ---------------------------------------------------------------------------

interface ForceNode extends SimulationNodeDatum3D {
  id: string;
  type: 'hub' | 'leaf';
  label: string;
  radius: number;
  color: string;
  group?: string;
  meta?: Record<string, unknown>;
  hubId?: string;
}

interface ForceEdge extends SimulationLinkDatum<ForceNode> {
  sourceId: string;
  targetId: string;
}

// ---------------------------------------------------------------------------
// Default physics
// ---------------------------------------------------------------------------

const DEFAULTS: Required<PhysicsConfig> = {
  charge: -200,
  linkDistance: 25,
  damping: 0.4,
  maxNodes: 5000,
  hubBaseRadius: 0.8,
  hubMaxRadius: 3.0,
  leafRadius: 0.06,
  leafLinkDistance: 5,
  alphaDecay: 0.01,
};

// ---------------------------------------------------------------------------
// ForceSimulation
// ---------------------------------------------------------------------------

export class ForceSimulation implements SwarmingSimulation {
  nodes: SimNode[] = [];
  edges: SimEdge[] = [];

  private simulation: ReturnType<typeof forceSimulation<ForceNode>>;
  private nodeMap = new Map<string, ForceNode>();
  private config: Required<PhysicsConfig>;
  private hubColors: string[];

  constructor(physics: PhysicsConfig = {}, hubColors: string[] = ['#6366f1']) {
    this.config = { ...DEFAULTS, ...physics };
    this.hubColors = hubColors;
    const c = this.config;

    this.simulation = forceSimulation<ForceNode>([], 3)
      .force(
        'charge',
        forceManyBody<ForceNode>().strength((d) =>
          d.type === 'hub' ? c.charge : c.charge * 0.04,
        ),
      )
      .force('center', forceCenter<ForceNode>(0, 0, 0).strength(0.03))
      .force(
        'collide',
        forceCollide<ForceNode>()
          .radius((d) => d.radius + 0.3)
          .strength(0.7),
      )
      .force(
        'link',
        forceLink<ForceNode, ForceEdge>([])
          .id((d) => d.id)
          .distance((d) => {
            const src = d.source as ForceNode;
            const tgt = d.target as ForceNode;
            if (src.type === 'hub' && tgt.type === 'hub') return c.linkDistance;
            return c.leafLinkDistance + Math.random() * 3;
          })
          .strength((d) => {
            const src = d.source as ForceNode;
            const tgt = d.target as ForceNode;
            if (src.type === 'hub' && tgt.type === 'hub') return 0.1;
            return 0.3;
          }),
      )
      .alphaDecay(c.alphaDecay)
      .velocityDecay(c.damping);
  }

  /** Feed grouped data into the simulation */
  update(groups: GroupData[], leafEdges: LeafEdge[]): void {
    const c = this.config;
    let changed = false;

    // Hub nodes from groups
    const hubIds = new Set<string>();
    const maxSize = groups[0]?.totalSize || 1;

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      hubIds.add(g.id);
      const existing = this.nodeMap.get(g.id);
      const scaledRadius =
        c.hubBaseRadius + (g.totalSize / maxSize) * (c.hubMaxRadius - c.hubBaseRadius);

      if (existing) {
        existing.radius = scaledRadius;
        existing.label = g.label;
      } else {
        const phi = Math.acos(1 - 2 * (i + 0.5) / Math.max(groups.length, 1));
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const dist = 15 + Math.random() * 5;
        const node: ForceNode = {
          id: g.id,
          type: 'hub',
          label: g.label,
          radius: scaledRadius,
          color: this.hubColors[i % this.hubColors.length],
          group: g.id,
          x: Math.sin(phi) * Math.cos(theta) * dist,
          y: Math.sin(phi) * Math.sin(theta) * dist,
          z: Math.cos(phi) * dist,
        };
        this.nodeMap.set(g.id, node);
        this.nodes.push(node as SimNode);
        changed = true;
      }
    }

    // Leaf nodes from edges
    const leafCount = this.nodes.filter((n) => n.type === 'leaf').length;
    const budget = c.maxNodes - leafCount;
    let added = 0;

    for (const edge of leafEdges) {
      if (!hubIds.has(edge.hubId)) continue;
      if (this.nodeMap.has(edge.leafId)) continue;
      if (added >= budget) break;

      const hub = this.nodeMap.get(edge.hubId);
      const aPhi = Math.acos(1 - 2 * Math.random());
      const aTheta = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 4;
      const node: ForceNode = {
        id: edge.leafId,
        type: 'leaf',
        label: edge.leafId.slice(0, 6),
        radius: c.leafRadius,
        color: '#555566',
        hubId: edge.hubId,
        x: (hub?.x ?? 0) + Math.sin(aPhi) * Math.cos(aTheta) * dist,
        y: (hub?.y ?? 0) + Math.sin(aPhi) * Math.sin(aTheta) * dist,
        z: (hub?.z ?? 0) + Math.cos(aPhi) * dist,
      };
      this.nodeMap.set(edge.leafId, node);
      this.nodes.push(node as SimNode);
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

      // Leaf-to-hub
      for (const node of this.nodes) {
        if (node.type === 'leaf' && node.hubId && this.nodeMap.has(node.hubId)) {
          newEdges.push({
            sourceId: node.id,
            targetId: node.hubId,
            source: node.id,
            target: node.hubId,
          });
        }
      }

      this.edges = newEdges as SimEdge[];

      this.simulation.nodes(this.nodes as ForceNode[]);
      (this.simulation.force('link') as ReturnType<typeof forceLink<ForceNode, ForceEdge>>).links(
        newEdges,
      );
      this.simulation.alpha(0.3).restart();
    }
  }

  /** Advance one tick */
  tick(): void {
    this.simulation.tick();
  }

  /** Reheat the simulation */
  reheat(alpha = 0.5): void {
    this.simulation.alpha(alpha).restart();
  }

  /** Stop and clean up */
  dispose(): void {
    this.simulation.stop();
  }
}
