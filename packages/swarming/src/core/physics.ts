/**
 * Physics simulation engine powered by d3-force-3d.
 *
 * Manages a 3D force-directed layout with hub nodes (groups) and
 * leaf nodes (individual items). Framework-agnostic — can drive any renderer.
 */

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum3D,
} from 'd3-force-3d';
import type { SimulationLinkDatum } from 'd3-force';

import type { SimNode, SimEdge, SwarmingNode, ThemeConfig } from '../types';

// ---------------------------------------------------------------------------
// Internal d3-force compatible types
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
// Configuration
// ---------------------------------------------------------------------------

export interface PhysicsConfig {
  /** Maximum total nodes (default: 2000) */
  maxNodes: number;
  /** Hub repulsion strength (default: -200) */
  hubCharge: number;
  /** Leaf repulsion strength (default: -8) */
  leafCharge: number;
  /** Center gravity (default: 0.03) */
  centerStrength: number;
  /** Collision avoidance strength (default: 0.7) */
  collisionStrength: number;
  /** Hub-to-hub link distance (default: 25) */
  hubLinkDistance: number;
  /** Leaf-to-hub link distance (default: 5) */
  leafLinkDistance: number;
  /** Simulation cooling rate (default: 0.01) */
  alphaDecay: number;
  /** Friction (default: 0.4) */
  velocityDecay: number;
}

const DEFAULT_PHYSICS: PhysicsConfig = {
  maxNodes: 2000,
  hubCharge: -200,
  leafCharge: -8,
  centerStrength: 0.03,
  collisionStrength: 0.7,
  hubLinkDistance: 25,
  leafLinkDistance: 5,
  alphaDecay: 0.01,
  velocityDecay: 0.4,
};

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export class SwarmingSimulation {
  nodes: ForceNode[] = [];
  edges: ForceEdge[] = [];

  private simulation: ReturnType<typeof forceSimulation<ForceNode>>;
  private nodeMap = new Map<string, ForceNode>();
  private config: PhysicsConfig;

  constructor(config: Partial<PhysicsConfig> = {}) {
    this.config = { ...DEFAULT_PHYSICS, ...config };
    const c = this.config;

    this.simulation = forceSimulation<ForceNode>([], 3)
      .force(
        'charge',
        forceManyBody<ForceNode>().strength((d) =>
          d.type === 'hub' ? c.hubCharge : c.leafCharge,
        ),
      )
      .force('center', forceCenter<ForceNode>(0, 0, 0).strength(c.centerStrength))
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
      .velocityDecay(c.velocityDecay);
  }

  /**
   * Ingest SwarmingNode[] and rebuild the graph topology.
   *
   * Nodes are classified as "hub" (one per unique group) or "leaf" (individual).
   * Hubs are distributed on a sphere using the golden-angle algorithm.
   * Leaves orbit their parent hub.
   */
  update(inputNodes: SwarmingNode[], theme: ThemeConfig): void {
    let changed = false;

    // --- Identify groups → hubs ---
    const groupMap = new Map<string, SwarmingNode[]>();
    const ungrouped: SwarmingNode[] = [];

    for (const node of inputNodes) {
      if (node.group) {
        const list = groupMap.get(node.group) ?? [];
        list.push(node);
        groupMap.set(node.group, list);
      } else {
        ungrouped.push(node);
      }
    }

    // Create hub nodes for each group
    const hubIds = new Set<string>();
    let hubIndex = 0;
    for (const [groupName, members] of groupMap) {
      const hubId = `hub:${groupName}`;
      hubIds.add(hubId);
      const existing = this.nodeMap.get(hubId);

      if (existing) {
        existing.radius = 0.8 + Math.min(members.length / 20, 2.2);
        existing.label = groupName;
      } else {
        const phi = Math.acos(1 - 2 * (hubIndex + 0.5) / Math.max(groupMap.size, 1));
        const theta = Math.PI * (1 + Math.sqrt(5)) * hubIndex;
        const dist = 15 + Math.random() * 5;
        const node: ForceNode = {
          id: hubId,
          type: 'hub',
          label: groupName,
          radius: 0.8 + Math.min(members.length / 20, 2.2),
          color: theme.hubColors[hubIndex % theme.hubColors.length],
          group: groupName,
          x: Math.sin(phi) * Math.cos(theta) * dist,
          y: Math.sin(phi) * Math.sin(theta) * dist,
          z: Math.cos(phi) * dist,
        };
        this.nodeMap.set(hubId, node);
        this.nodes.push(node);
        changed = true;
      }
      hubIndex++;

      // Create leaf nodes for group members
      const budget = this.config.maxNodes - this.nodes.length;
      let added = 0;
      for (const member of members) {
        if (added >= budget) break;
        if (this.nodeMap.has(member.id)) continue;

        const hub = this.nodeMap.get(hubId);
        const aPhi = Math.acos(1 - 2 * Math.random());
        const aTheta = Math.random() * Math.PI * 2;
        const d = 2 + Math.random() * 4;
        const leaf: ForceNode = {
          id: member.id,
          type: 'leaf',
          label: member.label ?? member.id.slice(0, 6),
          radius: member.size ?? 0.06,
          color: member.color ?? theme.leafColor,
          group: groupName,
          meta: member.meta,
          hubId: hubId,
          x: (hub?.x ?? 0) + Math.sin(aPhi) * Math.cos(aTheta) * d,
          y: (hub?.y ?? 0) + Math.sin(aPhi) * Math.sin(aTheta) * d,
          z: (hub?.z ?? 0) + Math.cos(aPhi) * d,
        };
        this.nodeMap.set(member.id, leaf);
        this.nodes.push(leaf);
        added++;
        changed = true;
      }
    }

    // Ungrouped nodes become standalone hubs
    for (const node of ungrouped) {
      if (this.nodeMap.has(node.id)) continue;
      if (this.nodes.length >= this.config.maxNodes) break;
      const idx = this.nodes.length;
      const phi = Math.acos(1 - 2 * (idx + 0.5) / Math.max(inputNodes.length, 1));
      const theta = Math.PI * (1 + Math.sqrt(5)) * idx;
      const dist = 10 + Math.random() * 8;
      const fNode: ForceNode = {
        id: node.id,
        type: 'hub',
        label: node.label ?? node.id.slice(0, 6),
        radius: node.size ?? 0.3,
        color: node.color ?? theme.hubColors[idx % theme.hubColors.length],
        meta: node.meta,
        x: Math.sin(phi) * Math.cos(theta) * dist,
        y: Math.sin(phi) * Math.sin(theta) * dist,
        z: Math.cos(phi) * dist,
      };
      this.nodeMap.set(node.id, fNode);
      this.nodes.push(fNode);
      hubIds.add(node.id);
      changed = true;
    }

    // Rebuild edges from connections + hub topology
    if (changed) {
      const newEdges: ForceEdge[] = [];
      const hubNodes = this.nodes.filter((n) => n.type === 'hub');

      // Hub-to-hub fully connected
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

      // Explicit connections from input data
      for (const inputNode of inputNodes) {
        if (!inputNode.connections) continue;
        for (const targetId of inputNode.connections) {
          if (
            this.nodeMap.has(inputNode.id) &&
            this.nodeMap.has(targetId) &&
            !newEdges.some(
              (e) =>
                (e.sourceId === inputNode.id && e.targetId === targetId) ||
                (e.sourceId === targetId && e.targetId === inputNode.id),
            )
          ) {
            newEdges.push({
              sourceId: inputNode.id,
              targetId: targetId,
              source: inputNode.id,
              target: targetId,
            });
          }
        }
      }

      this.edges = newEdges;
      this.simulation.nodes(this.nodes);
      (
        this.simulation.force('link') as ReturnType<typeof forceLink<ForceNode, ForceEdge>>
      ).links(this.edges);
      this.simulation.alpha(0.3).restart();
    }
  }

  /** Advance simulation by one tick */
  tick(): void {
    this.simulation.tick();
  }

  /** Get hub (group) nodes */
  getHubNodes(): SimNode[] {
    return this.nodes
      .filter((n) => n.type === 'hub')
      .map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        radius: n.radius,
        color: n.color,
        group: n.group,
        meta: n.meta,
        x: n.x,
        y: n.y,
        z: n.z,
      }));
  }

  /** Get leaf nodes */
  getLeafNodes(): SimNode[] {
    return this.nodes
      .filter((n) => n.type === 'leaf')
      .map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        radius: n.radius,
        color: n.color,
        group: n.group,
        meta: n.meta,
        hubId: n.hubId,
        x: n.x,
        y: n.y,
        z: n.z,
      }));
  }

  /** Get a node by ID */
  getNode(id: string): SimNode | undefined {
    const n = this.nodeMap.get(id);
    if (!n) return undefined;
    return {
      id: n.id,
      type: n.type,
      label: n.label,
      radius: n.radius,
      color: n.color,
      group: n.group,
      meta: n.meta,
      hubId: n.hubId,
      x: n.x,
      y: n.y,
      z: n.z,
    };
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
