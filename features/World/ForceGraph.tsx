'use client';

import React, { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';

import type { TopToken, TraderEdge } from '@web3viz/core';
import type { ShareColors } from './SharePanel';

import { ProtocolLabel } from './ProtocolLabel';
import { CHAIN_COLORS, COLOR_PALETTE, PROTOCOL_COLORS } from './constants';
import YouAreHereMarker from './YouAreHereMarker';
import { PostProcessing } from '@web3viz/react-graph';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ForceNode extends SimulationNodeDatum {
  id: string;
  type: 'hub' | 'agent';
  label: string;
  radius: number;
  color: string;
  /** For agent nodes: which hub mint they belong to */
  hubTokenAddress?: string;
  /** Source provider that owns this node */
  source?: string;
}

interface ForceEdge extends SimulationLinkDatum<ForceNode> {
  sourceId: string;
  targetId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_AGENT_NODES = 5000;
const HUB_BASE_RADIUS = 0.8;
const HUB_MAX_RADIUS = 3.0;
const AGENT_RADIUS = 0.06;

// Edge highlight bloom color (overbright blue triggers selective bloom)
const EDGE_HIGHLIGHT_R = 0.48;
const EDGE_HIGHLIGHT_G = 0.78;
const EDGE_HIGHLIGHT_B = 2.0;

// Idle ambient constants
const IDLE_NODE_COUNT = 40;
const IDLE_SPEED = 0.08;
const IDLE_RADIUS_MIN = 0.15;
const IDLE_RADIUS_MAX = 0.5;
const IDLE_SPREAD = 30;

// ---------------------------------------------------------------------------
// Force simulation manager (runs outside React render cycle)
// ---------------------------------------------------------------------------

class ForceGraphSimulation {
  nodes: ForceNode[] = [];
  edges: ForceEdge[] = [];
  private simulation: ReturnType<typeof forceSimulation<ForceNode>>;
  nodeMap = new Map<string, ForceNode>();

  constructor() {
    this.simulation = forceSimulation<ForceNode>([])
      .force('charge', forceManyBody<ForceNode>().strength((d) => (d.type === 'hub' ? -200 : -8)))
      .force('center', forceCenter(0, 0).strength(0.03))
      .force('collide', forceCollide<ForceNode>().radius((d) => d.radius + 0.3).strength(0.7))
      .force(
        'link',
        forceLink<ForceNode, ForceEdge>([])
          .id((d) => d.id)
          .distance((d) => {
            const src = d.source as ForceNode;
            const tgt = d.target as ForceNode;
            if (src.type === 'hub' && tgt.type === 'hub') return 25;
            return 5 + Math.random() * 3;
          })
          .strength((d) => {
            const src = d.source as ForceNode;
            const tgt = d.target as ForceNode;
            if (src.type === 'hub' && tgt.type === 'hub') return 0.1;
            return 0.3;
          }),
      )
      .alphaDecay(0.01)
      .velocityDecay(0.4);
  }

  update(topTokens: TopToken[], traderEdges: TraderEdge[]) {
    let changed = false;

    // --- Hub nodes from top tokens ---
    const hubAddresses = new Set<string>();
    for (let i = 0; i < topTokens.length; i++) {
      const t = topTokens[i];
      hubAddresses.add(t.tokenAddress);
      const existing = this.nodeMap.get(t.tokenAddress);
      const maxVol = topTokens[0]?.volume || 1;
      const scaledRadius = HUB_BASE_RADIUS + ((t.volume / maxVol) * (HUB_MAX_RADIUS - HUB_BASE_RADIUS));
      if (existing) {
        existing.radius = scaledRadius;
        existing.label = t.symbol || t.name;
        existing.source = t.source;
      } else {
        const angle = (i / Math.max(topTokens.length, 1)) * Math.PI * 2;
        const dist = 15 + Math.random() * 5;
        const node: ForceNode = {
          id: t.tokenAddress,
          type: 'hub',
          label: t.symbol || t.name,
          radius: scaledRadius,
          color: CHAIN_COLORS[t.chain ?? ''] || COLOR_PALETTE[i % COLOR_PALETTE.length],
          source: t.source,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
        };
        this.nodeMap.set(t.tokenAddress, node);
        this.nodes.push(node);
        changed = true;
      }
    }

    // --- Agent nodes from trader edges ---
    const agentCount = this.nodes.filter((n) => n.type === 'agent').length;
    const budget = MAX_AGENT_NODES - agentCount;
    let added = 0;

    for (const edge of traderEdges) {
      if (!hubAddresses.has(edge.tokenAddress)) continue;
      const agentId = `agent:${edge.trader}:${edge.tokenAddress}`;
      if (this.nodeMap.has(agentId)) continue;
      if (added >= budget) break;

      const hub = this.nodeMap.get(edge.tokenAddress);
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 4;
      const node: ForceNode = {
        id: agentId,
        type: 'agent',
        label: edge.trader.slice(0, 6),
        radius: AGENT_RADIUS,
        color: '#555566',
        hubTokenAddress: edge.tokenAddress,
        source: edge.source,
        x: (hub?.x ?? 0) + Math.cos(angle) * dist,
        y: (hub?.y ?? 0) + Math.sin(angle) * dist,
      };
      this.nodeMap.set(agentId, node);
      this.nodes.push(node);
      added++;
      changed = true;
    }

    // --- Edges ---
    if (changed) {
      const newEdges: ForceEdge[] = [];

      // Hub-to-hub edges (fully connected between top tokens)
      const hubNodes = this.nodes.filter((n) => n.type === 'hub');
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

      // Agent-to-hub edges
      for (const node of this.nodes) {
        if (node.type === 'agent' && node.hubTokenAddress && this.nodeMap.has(node.hubTokenAddress)) {
          newEdges.push({
            sourceId: node.id,
            targetId: node.hubTokenAddress,
            source: node.id,
            target: node.hubTokenAddress,
          });
        }
      }

      this.edges = newEdges;

      this.simulation.nodes(this.nodes);
      (this.simulation.force('link') as ReturnType<typeof forceLink<ForceNode, ForceEdge>>)
        .links(this.edges);
      this.simulation.alpha(0.3).restart();
    }
  }

  tick() {
    this.simulation.tick();
  }

  dispose() {
    this.simulation.stop();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Three.js sub-components
// ---------------------------------------------------------------------------

/** Individual hub node mesh — hover detection + source-colored transitions */
function HubNodeMesh({
  sim,
  nodeId,
  paletteIndex,
  isActive,
  isDimmed,
  isHighlighted,
  isHovered,
  onPointerOver,
  onPointerOut,
  onClick,
  colorOverride,
}: {
  sim: ForceGraphSimulation;
  nodeId: string;
  paletteIndex: number;
  isActive: boolean;
  isDimmed: boolean;
  isHighlighted: boolean;
  isHovered: boolean;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onClick: () => void;
  colorOverride?: string;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const ringMaterialRef = useRef<THREE.MeshStandardMaterial>(null!);
  const targetColor = useRef(new THREE.Color(PROTOCOL_COLORS.default));
  const targetOpacity = useRef(1);
  const targetRingOpacity = useRef(0);
  const radiusRef = useRef(HUB_BASE_RADIUS);

  const node = useMemo(() => sim.nodeMap.get(nodeId), [sim, nodeId]);
  const isAgentHub = node?.source === 'agents';
  const AGENT_COLOR_PALETTE = ['#c084fc', '#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#fb923c', '#a78bfa', '#22d3ee'];

  useEffect(() => {
    if (isHighlighted) {
      targetColor.current.set('#3d63ff');
      targetOpacity.current = 1;
      targetRingOpacity.current = isAgentHub ? 0.8 : 0;
    } else if (isActive) {
      // Each hub gets its unique palette color when selected
      const color = colorOverride || (isAgentHub
        ? AGENT_COLOR_PALETTE[paletteIndex % AGENT_COLOR_PALETTE.length]
        : COLOR_PALETTE[paletteIndex % COLOR_PALETTE.length]);
      targetColor.current.set(color);
      targetOpacity.current = 1;
      targetRingOpacity.current = isAgentHub ? 0.5 : 0;
    } else if (isDimmed) {
      targetColor.current.set(PROTOCOL_COLORS.default);
      targetOpacity.current = 0.15;
      targetRingOpacity.current = 0;
    } else {
      // Default: solid sphere, with subtle ring for agent hubs
      if (isAgentHub) {
        targetColor.current.set(AGENT_COLOR_PALETTE[paletteIndex % AGENT_COLOR_PALETTE.length]);
        targetRingOpacity.current = 0.3;
      } else {
        targetColor.current.set(PROTOCOL_COLORS.default);
        targetRingOpacity.current = 0;
      }
      targetOpacity.current = 1;
    }
  }, [isActive, isDimmed, isHighlighted, paletteIndex, colorOverride, isAgentHub]);

  useFrame((state, delta) => {
    const nodeData = sim.nodeMap.get(nodeId);
    if (!nodeData || !groupRef.current || !meshRef.current || !materialRef.current) return;
    groupRef.current.position.set(nodeData.x ?? 0, 0, nodeData.y ?? 0);

    const baseScale = nodeData.radius;
    if (isHighlighted) {
      const pulse = 1 + Math.sin(state.clock.getElapsedTime() * Math.PI) * 0.05;
      meshRef.current.scale.setScalar(baseScale * 2 * pulse);
    } else {
      meshRef.current.scale.setScalar(baseScale);
    }
    radiusRef.current = nodeData.radius;

    const lerpFactor = 1 - Math.exp(-10 * delta);
    materialRef.current.color.lerp(targetColor.current, lerpFactor);
    materialRef.current.emissive.lerp(targetColor.current, lerpFactor);
    materialRef.current.opacity += (targetOpacity.current - materialRef.current.opacity) * lerpFactor;

    // Animate ring opacity for agent hubs
    if (ringMaterialRef.current) {
      ringMaterialRef.current.opacity += (targetRingOpacity.current - ringMaterialRef.current.opacity) * lerpFactor;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          onPointerOver();
        }}
        onPointerOut={onPointerOut}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          color={PROTOCOL_COLORS.default}
          transparent
          opacity={1}
          roughness={0.3}
          metalness={0.1}
          emissive={PROTOCOL_COLORS.default}
          emissiveIntensity={2.0}
          envMapIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      {isAgentHub && (
        <mesh
          ref={ringRef}
          rotation={[Math.PI * 0.15, 0, Math.PI * 0.3]}
          scale={1.4}
        >
          <torusGeometry args={[1, 0.12, 8, 32]} />
          <meshStandardMaterial
            ref={ringMaterialRef}
            color={AGENT_COLOR_PALETTE[paletteIndex % AGENT_COLOR_PALETTE.length]}
            transparent
            opacity={0}
            roughness={0.3}
            metalness={0.1}
            emissive={AGENT_COLOR_PALETTE[paletteIndex % AGENT_COLOR_PALETTE.length]}
            emissiveIntensity={2.5}
            toneMapped={false}
          />
        </mesh>
      )}
      {isHovered && (
        <ProtocolLabel
          name={`🤖 ${sim.nodeMap.get(nodeId)?.label ?? 'UNKNOWN'}`}
          position={[0, radiusRef.current + 1, 0]}
          visible
        />
      )}
    </group>
  );
}

/** InstancedMesh for agent nodes with active-protocol tinting + dimming */
const AgentNodes = memo<{
  sim: ForceGraphSimulation;
  activeProtocol: string | null;
  highlightedHubId?: string | null;
  /** Address of the specifically searched agent — gets its own highlighted treatment */
  highlightedAddress?: string | null;
  colorOverride?: string;
}>(({ sim, activeProtocol, highlightedHubId, highlightedAddress, colorOverride }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const dimColor = useMemo(() => new THREE.Color('#334155'), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({
      roughness: 0.4,
      metalness: 0.0,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 1.5,
      transparent: true,
      toneMapped: false,
    }),
    [],
  );

  // Cache the active hub's palette color by hub index
  const activeColorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeProtocol) {
      activeColorRef.current = null;
      return;
    }
    const hubs = sim.nodes.filter((n) => n.type === 'hub');
    const idx = hubs.findIndex((h) => h.id === activeProtocol);
    activeColorRef.current = idx >= 0 ? COLOR_PALETTE[idx % COLOR_PALETTE.length] : null;
  }, [activeProtocol, sim]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const agents = sim.nodes.filter((n) => n.type === 'agent');
    const count = Math.min(agents.length, MAX_AGENT_NODES);
    mesh.count = count;

    const ac = activeColorRef.current;
    const hasFilter = activeProtocol !== null;
    const searchLower = highlightedAddress?.toLowerCase() ?? null;

    for (let i = 0; i < count; i++) {
      const node = agents[i];

      // Check if this is the specifically searched agent
      let isSearchedAgent = false;
      if (searchLower) {
        const parts = node.id.split(':');
        isSearchedAgent = parts.length >= 2 && parts[1].toLowerCase() === searchLower;
      }

      if (isSearchedAgent) {
        // Searched agent: 3x size with gentle pulse, bright blue
        const pulse = 1 + Math.sin(state.clock.getElapsedTime() * Math.PI) * 0.05;
        tempObj.position.set(node.x ?? 0, 0, node.y ?? 0);
        tempObj.scale.setScalar(node.radius * 3 * pulse);
        tempObj.updateMatrix();
        mesh.setMatrixAt(i, tempObj.matrix);
        tempColor.set('#3d63ff');
      } else {
        tempObj.position.set(node.x ?? 0, 0, node.y ?? 0);
        tempObj.scale.setScalar(node.radius);
        tempObj.updateMatrix();
        mesh.setMatrixAt(i, tempObj.matrix);

        if (highlightedHubId && node.hubTokenAddress === highlightedHubId) {
          tempColor.set('#3d63ff').multiplyScalar(0.8);
        } else if (hasFilter) {
          if (ac && node.hubTokenAddress === activeProtocol) {
            // Agents near active protocol get a tint of its palette color
            tempColor.set(ac).multiplyScalar(0.7);
          } else {
            tempColor.copy(dimColor).multiplyScalar(0.15);
          }
        } else {
          // Default: dark gray agent spheres
          tempColor.set(PROTOCOL_COLORS.agentDefault);
        }
      }
      mesh.setColorAt(i, tempColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_AGENT_NODES]}
      frustumCulled={false}
    />
  );
});
AgentNodes.displayName = 'AgentNodes';

/** Batch-rendered edges via LineSegments */
const Edges = memo<{
  sim: ForceGraphSimulation;
  activeProtocol?: string | null;
  highlightedHubId?: string | null;
  /** When set, only the edge from this agent address is highlighted (not all hub edges) */
  highlightedAddress?: string | null;
}>(({ sim, activeProtocol, highlightedHubId, highlightedAddress }) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const posAttr = useRef<THREE.Float32BufferAttribute | null>(null);
  const colorAttr = useRef<THREE.Float32BufferAttribute | null>(null);
  const maxEdges = 20000;

  useEffect(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(maxEdges * 6);
    const colors = new Float32Array(maxEdges * 6);
    const pAttr = new THREE.Float32BufferAttribute(positions, 3);
    const cAttr = new THREE.Float32BufferAttribute(colors, 3);
    pAttr.setUsage(THREE.DynamicDrawUsage);
    cAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', pAttr);
    geo.setAttribute('color', cAttr);
    geo.setDrawRange(0, 0);
    posAttr.current = pAttr;
    colorAttr.current = cAttr;

    if (lineRef.current) {
      lineRef.current.geometry.dispose();
      lineRef.current.geometry = geo;
    }
  }, []);

  useFrame(() => {
    const pA = posAttr.current;
    const cA = colorAttr.current;
    if (!pA || !cA || !lineRef.current) return;

    const edges = sim.edges;
    const count = Math.min(edges.length, maxEdges);

    for (let i = 0; i < count; i++) {
      const edge = edges[i];
      const src = edge.source as ForceNode;
      const tgt = edge.target as ForceNode;
      const idx = i * 6;

      pA.array[idx] = src.x ?? 0;
      pA.array[idx + 1] = 0;
      pA.array[idx + 2] = src.y ?? 0;
      pA.array[idx + 3] = tgt.x ?? 0;
      pA.array[idx + 4] = 0;
      pA.array[idx + 5] = tgt.y ?? 0;

      const isHubEdge = src.type === 'hub' && tgt.type === 'hub';

      // When a specific address is searched, only highlight that agent's edge
      let isHighlightEdge: boolean;
      if (highlightedAddress) {
        const searchLower = highlightedAddress.toLowerCase();
        const srcParts = src.id.split(':');
        const tgtParts = tgt.id.split(':');
        isHighlightEdge =
          (srcParts.length >= 2 && srcParts[1].toLowerCase() === searchLower) ||
          (tgtParts.length >= 2 && tgtParts[1].toLowerCase() === searchLower);
      } else {
        isHighlightEdge = !!(highlightedHubId && (
          src.id === highlightedHubId || tgt.id === highlightedHubId ||
          src.hubTokenAddress === highlightedHubId || tgt.hubTokenAddress === highlightedHubId
        ));
      }

      if (isHighlightEdge) {
        // Bright values > 1.0 trigger selective bloom via toneMapped={false}
        cA.array[idx] = EDGE_HIGHLIGHT_R; cA.array[idx + 1] = EDGE_HIGHLIGHT_G; cA.array[idx + 2] = EDGE_HIGHLIGHT_B;
        cA.array[idx + 3] = EDGE_HIGHLIGHT_R; cA.array[idx + 4] = EDGE_HIGHLIGHT_G; cA.array[idx + 5] = EDGE_HIGHLIGHT_B;
      } else {
        let gray: number;
        if (activeProtocol) {
          const srcRelated = src.id === activeProtocol || src.hubTokenAddress === activeProtocol;
          const tgtRelated = tgt.id === activeProtocol || tgt.hubTokenAddress === activeProtocol;
          gray = (srcRelated || tgtRelated) ? (isHubEdge ? 0.45 : 0.35) : 0.08;
        } else {
          gray = isHubEdge ? 0.4 : 0.2;
        }
        cA.array[idx] = gray; cA.array[idx + 1] = gray; cA.array[idx + 2] = gray;
        cA.array[idx + 3] = gray; cA.array[idx + 4] = gray; cA.array[idx + 5] = gray;
      }
    }

    pA.needsUpdate = true;
    cA.needsUpdate = true;
    lineRef.current.geometry.setDrawRange(0, count * 2);
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial vertexColors transparent opacity={0.45} toneMapped={false} />
    </lineSegments>
  );
});
Edges.displayName = 'Edges';

/** Scene background color controller */
const SceneBackground = memo<{ color: string }>(({ color }) => {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(color);
  }, [color, scene]);
  return null;
});
SceneBackground.displayName = 'SceneBackground';



// ---------------------------------------------------------------------------
// Idle ambient scene — gentle drifting orbs when no data is active
// ---------------------------------------------------------------------------

interface IdleNode {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  gray: number; // 0..1 lightness
}

function createIdleNodes(): IdleNode[] {
  const nodes: IdleNode[] = [];
  for (let i = 0; i < IDLE_NODE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * IDLE_SPREAD;
    nodes.push({
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * IDLE_SPEED,
      vz: (Math.random() - 0.5) * IDLE_SPEED,
      radius: IDLE_RADIUS_MIN + Math.random() * (IDLE_RADIUS_MAX - IDLE_RADIUS_MIN),
      gray: 0.5 + Math.random() * 0.4,
    });
  }
  return nodes;
}

const IdleAmbientScene = memo(() => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const nodesRef = useRef<IdleNode[]>(createIdleNodes());
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({
      roughness: 0.4,
      metalness: 0.0,
      emissive: new THREE.Color('#60a5fa'),
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.7,
      toneMapped: false,
    }),
    [],
  );

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const nodes = nodesRef.current;
    mesh.count = nodes.length;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      // Drift
      n.x += n.vx * delta * 60;
      n.z += n.vz * delta * 60;
      // Soft boundary: gently pull back toward center
      const dist = Math.sqrt(n.x * n.x + n.z * n.z);
      if (dist > IDLE_SPREAD) {
        const pull = 0.001 * (dist - IDLE_SPREAD);
        n.vx -= (n.x / dist) * pull;
        n.vz -= (n.z / dist) * pull;
      }
      // Damping
      n.vx *= 0.998;
      n.vz *= 0.998;

      tempObj.position.set(n.x, 0, n.z);
      tempObj.scale.setScalar(n.radius);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);

      tempColor.setRGB(n.gray, n.gray, n.gray);
      mesh.setColorAt(i, tempColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <Environment preset="studio" environmentIntensity={0.4} background={false} />
      <directionalLight position={[20, 40, 20]} intensity={0.3} />
      <instancedMesh ref={meshRef} args={[geometry, material, IDLE_NODE_COUNT]} frustumCulled={false} />
    </>
  );
});
IdleAmbientScene.displayName = 'IdleAmbientScene';

// ---------------------------------------------------------------------------
// Scene: assembles all 3D sub-components + camera
// ---------------------------------------------------------------------------

const NetworkScene = memo<{
  sim: ForceGraphSimulation;
  topTokens: TopToken[];
  activeProtocol: string | null;
  highlightedHubIndex: number | null;
  /** Address of the searched agent — overrides hub-level highlighting */
  highlightedAddress?: string | null;
  onSelectProtocol: (mint: string | null) => void;
  onDismissHighlight?: () => void;
  shareColors?: ShareColors;
}>(({ sim, topTokens, activeProtocol, highlightedHubIndex, highlightedAddress, onSelectProtocol, onDismissHighlight, shareColors }) => {
  const [hoveredHub, setHoveredHub] = useState<string | null>(null);

  const hubIds = useMemo(
    () => topTokens.map((t) => ({ id: t.tokenAddress, label: t.symbol || t.name })),
    [topTokens],
  );

  // Hub-level highlight only used when there's no address search active
  const highlightedHubId = (!highlightedAddress && highlightedHubIndex != null)
    ? hubIds[highlightedHubIndex]?.id ?? null
    : null;

  // Track the highlighted agent's 3D position for the YouAreHereMarker
  const agentPositionRef = useRef<THREE.Vector3 | null>(null);

  // Tick simulation and update tracked positions each frame
  useFrame(() => {
    sim.tick();

    // Track highlighted agent position
    if (highlightedAddress) {
      const searchLower = highlightedAddress.toLowerCase();
      let found = false;
      for (const node of sim.nodes) {
        if (node.type !== 'agent') continue;
        const parts = node.id.split(':');
        if (parts.length >= 2 && parts[1].toLowerCase() === searchLower) {
          if (!agentPositionRef.current) agentPositionRef.current = new THREE.Vector3();
          agentPositionRef.current.set(node.x ?? 0, 0, node.y ?? 0);
          found = true;
          break;
        }
      }
      if (!found) agentPositionRef.current = null;
    } else {
      agentPositionRef.current = null;
    }
  });

  return (
    <>
      {shareColors && <SceneBackground color={shareColors.background} />}

      <Environment preset="studio" environmentIntensity={0.4} background={false} />
      <directionalLight position={[20, 40, 20]} intensity={0.3} />

      <Edges
        sim={sim}
        activeProtocol={activeProtocol}
        highlightedHubId={highlightedHubId}
        highlightedAddress={highlightedAddress}
      />
      {hubIds.map((hub, i) => (
        <HubNodeMesh
          key={hub.id}
          sim={sim}
          nodeId={hub.id}
          paletteIndex={i}
          isActive={activeProtocol === hub.id}
          isDimmed={activeProtocol !== null && activeProtocol !== hub.id}
          isHighlighted={highlightedHubId === hub.id}
          isHovered={hoveredHub === hub.id}
          onPointerOver={() => setHoveredHub(hub.id)}
          onPointerOut={() => setHoveredHub(null)}
          onClick={() =>
            onSelectProtocol(activeProtocol === hub.id ? null : hub.id)
          }
          colorOverride={shareColors?.protocol}
        />
      ))}
      <AgentNodes
        sim={sim}
        activeProtocol={activeProtocol}
        highlightedHubId={highlightedHubId}
        highlightedAddress={highlightedAddress}
        colorOverride={shareColors?.user}
      />
      {/* Show YouAreHereMarker above the searched agent node */}
      {highlightedAddress && onDismissHighlight && (
        <YouAreHereMarker
          positionRef={agentPositionRef}
          onDismiss={onDismissHighlight}
        />
      )}
    </>
  );
});
NetworkScene.displayName = 'NetworkScene';

// ---------------------------------------------------------------------------
// Camera animation state
// ---------------------------------------------------------------------------

interface CameraApi {
  animateTo: (pos: [number, number, number], lookAt: [number, number, number], durationMs: number) => Promise<void>;
  setOrbitEnabled: (enabled: boolean) => void;
}

/** Camera controller: unrestricted 360° spherical rotation with smooth damping */
const CameraSetup = memo<{ apiRef: React.MutableRefObject<CameraApi | null> }>(({ apiRef }) => {
  const controlsRef = useRef<CameraControlsImpl>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Angled orbital view — ~35° from horizontal, looking at the node cluster
    // This gives a 3D perspective where you can see depth and height of nodes
    controls.setLookAt(0, 30, 50, 0, 0, 0, false);

    // Smooth damping for premium feel (matches world.gizatech.xyz)
    controls.smoothTime = 0.35;
    controls.draggingSmoothTime = 0.15;

    // Distance constraints
    controls.minDistance = 10;
    controls.maxDistance = 200;

    // Unrestricted polar angle — full 360° vertical rotation (no floor clamp)
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;

    // Unrestricted azimuth — full horizontal rotation
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;

    // Interaction tuning
    controls.dollySpeed = 0.5;
    controls.truckSpeed = 1.0;
  }, []);

  useEffect(() => {
    apiRef.current = {
      animateTo: (pos, lookAt, durationMs) =>
        new Promise<void>((resolve) => {
          const controls = controlsRef.current;
          if (!controls) { resolve(); return; }

          // Use camera-controls built-in smooth transition
          controls.setLookAt(
            pos[0], pos[1], pos[2],
            lookAt[0], lookAt[1], lookAt[2],
            true, // enable transition
          ).then(() => resolve());

          // Override transition duration
          controls.smoothTime = durationMs / 1000;

          // Restore default smooth time after animation
          setTimeout(() => {
            if (controlsRef.current) {
              controlsRef.current.smoothTime = 0.35;
            }
          }, durationMs + 50);
        }),
      setOrbitEnabled: (enabled) => {
        if (controlsRef.current) {
          controlsRef.current.enabled = enabled;
        }
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
    />
  );
});
CameraSetup.displayName = 'CameraSetup';

// ---------------------------------------------------------------------------
// Main ForceGraph component
// ---------------------------------------------------------------------------

export interface ForceGraphProps {
  topTokens: TopToken[];
  traderEdges: TraderEdge[];
  activeProtocol?: string | null;
  highlightedHubIndex?: number | null;
  /** Address of the specifically searched agent — agent gets its own marker + highlight */
  highlightedAddress?: string | null;
  onSelectProtocol?: (mint: string | null) => void;
  onDismissHighlight?: () => void;
  height?: string | number;
  shareColors?: ShareColors;
  /** When true, show gentle ambient drifting nodes instead of real data */
  idle?: boolean;
}

export interface ForceGraphHandle {
  animateCameraTo: (request: { position: [number, number, number]; lookAt?: [number, number, number]; durationMs?: number }) => Promise<void>;
  focusHub: (index: number, durationMs?: number) => Promise<void>;
  /** Zoom camera to a specific agent node by trader address */
  focusAgent: (address: string, durationMs?: number) => Promise<void>;
  getCanvasElement: () => HTMLCanvasElement | null;
  getHubCount: () => number;
  getHubPosition: (index: number) => [number, number, number] | null;
  findAgentHub: (address: string) => { hubIndex: number; hubTokenAddress: string } | null;
  setOrbitEnabled: (enabled: boolean) => void;
  /** Capture the current 3D view as a PNG data URL via synchronous WebGL render */
  takeSnapshot: () => string | null;
}

/**
 * Invisible R3F child that captures the Three.js context for snapshot capture.
 * Must live inside <Canvas> to access useThree().
 */
const SnapshotHelper = memo<{ snapshotRef: React.MutableRefObject<(() => string | null) | null> }>(
  ({ snapshotRef }) => {
    const { gl, scene, camera } = useThree();

    useEffect(() => {
      snapshotRef.current = () => {
        gl.render(scene, camera);
        return gl.domElement.toDataURL('image/png', 1.0);
      };
      return () => { snapshotRef.current = null; };
    }, [gl, scene, camera, snapshotRef]);

    return null;
  },
);
SnapshotHelper.displayName = 'SnapshotHelper';

const ForceGraphInner = forwardRef<ForceGraphHandle, ForceGraphProps>(function ForceGraph(
  { topTokens, traderEdges, activeProtocol = null, highlightedHubIndex = null, highlightedAddress = null, onSelectProtocol, onDismissHighlight, height = '100%', shareColors, idle = false },
  ref,
) {
  const simRef = useRef<ForceGraphSimulation | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraApiRef = useRef<CameraApi | null>(null);
  const snapshotRef = useRef<(() => string | null) | null>(null);

  if (!simRef.current) {
    simRef.current = new ForceGraphSimulation();
  }
  const sim = simRef.current;

  useImperativeHandle(ref, () => ({
    getCanvasElement: () => containerRef.current?.querySelector('canvas') ?? null,
    getHubCount: () => sim.nodes.filter((n) => n.type === 'hub').length,
    getHubPosition: (index: number) => {
      const hubs = sim.nodes.filter((n) => n.type === 'hub');
      const hub = hubs[index];
      return hub ? [hub.x ?? 0, 0, hub.y ?? 0] as [number, number, number] : null;
    },
    findAgentHub: (address: string) => {
      const lower = address.toLowerCase();
      for (const node of sim.nodes) {
        if (node.type !== 'agent') continue;
        const parts = node.id.split(':');
        if (parts.length >= 2 && parts[1].toLowerCase() === lower) {
          const hubTokenAddress = node.hubTokenAddress;
          if (!hubTokenAddress) continue;
          const hubs = sim.nodes.filter((n) => n.type === 'hub');
          const hubIndex = hubs.findIndex((h) => h.id === hubTokenAddress);
          if (hubIndex >= 0) return { hubIndex, hubTokenAddress };
        }
      }
      return null;
    },
    animateCameraTo: async (request) => {
      const api = cameraApiRef.current;
      if (!api) return;
      await api.animateTo(
        request.position,
        request.lookAt ?? [0, 0, 0],
        request.durationMs ?? 1200,
      );
    },
    focusHub: async (index, durationMs = 1200) => {
      const api = cameraApiRef.current;
      if (!api) return;
      const hubs = sim.nodes.filter((n) => n.type === 'hub');
      const hub = hubs[index];
      if (!hub) return;
      const x = hub.x ?? 0;
      const z = hub.y ?? 0;
      await api.animateTo([x, 25, z + 12], [x, 0, z], durationMs);
    },
    focusAgent: async (address, durationMs = 800) => {
      const api = cameraApiRef.current;
      if (!api) return;
      const lower = address.toLowerCase();
      let agentNode: ForceNode | undefined;
      for (const node of sim.nodes) {
        if (node.type !== 'agent') continue;
        const parts = node.id.split(':');
        if (parts.length >= 2 && parts[1].toLowerCase() === lower) {
          agentNode = node;
          break;
        }
      }
      if (!agentNode) return;
      const x = agentNode.x ?? 0;
      const z = agentNode.y ?? 0;
      // Zoom in closer than hub view to show the agent in its local cluster
      await api.animateTo([x, 18, z + 10], [x, 0, z], durationMs);
    },
    setOrbitEnabled: (enabled) => {
      cameraApiRef.current?.setOrbitEnabled(enabled);
    },
    takeSnapshot: () => {
      return snapshotRef.current?.() ?? null;
    },
  }));

  const tokenKey = topTokens.map((t) => `${t.tokenAddress}:${t.trades}`).join(',');
  const edgeCount = traderEdges.length;
  useEffect(() => {
    sim.update(topTokens, traderEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenKey, edgeCount]);

  useEffect(() => {
    return () => {
      simRef.current?.dispose();
    };
  }, []);

  const [webglSupported, setWebglSupported] = useState(true);
  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      const supported = !!(c.getContext('webgl2') || c.getContext('webgl'));
      setWebglSupported(supported);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  if (!webglSupported) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14,
            fontWeight: 400,
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          WebGL Not Supported
        </span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: '#666',
          }}
        >
          Your browser or device does not support WebGL, which is required for this visualization.
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height, position: 'relative' }}>
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 500, position: [0, 30, 50] }}
        style={{ background: shareColors?.background ?? '#0a0a0f' }}
        gl={{ antialias: false, alpha: false, stencil: false }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <CameraSetup apiRef={cameraApiRef} />
        <SnapshotHelper snapshotRef={snapshotRef} />
        {idle ? (
          <IdleAmbientScene />
        ) : (
          <NetworkScene
            sim={sim}
            topTokens={topTokens}
            activeProtocol={activeProtocol ?? null}
            highlightedHubIndex={highlightedHubIndex}
            highlightedAddress={highlightedAddress}
            onSelectProtocol={onSelectProtocol ?? (() => {})}
            onDismissHighlight={onDismissHighlight}
            shareColors={shareColors}
          />
        )}
        <PostProcessing />
      </Canvas>
    </div>
  );
});

export default memo(ForceGraphInner);
