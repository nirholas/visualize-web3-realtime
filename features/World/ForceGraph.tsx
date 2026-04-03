'use client';

import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, MapControls } from '@react-three/drei';
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

import type { TopToken, TraderEdge } from '@/hooks/usePumpFun';

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
  hubMint?: string;
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

const HUB_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#2c2c54', '#1b1b2f',
  '#3d3d6b', '#2a2d3e', '#1e3163',
];

// ---------------------------------------------------------------------------
// Force simulation manager (runs outside React render cycle)
// ---------------------------------------------------------------------------

class ForceGraphSimulation {
  nodes: ForceNode[] = [];
  edges: ForceEdge[] = [];
  private simulation: ReturnType<typeof forceSimulation<ForceNode>>;
  private nodeMap = new Map<string, ForceNode>();

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
    const hubMints = new Set<string>();
    for (let i = 0; i < topTokens.length; i++) {
      const t = topTokens[i];
      hubMints.add(t.mint);
      const existing = this.nodeMap.get(t.mint);
      const maxVol = topTokens[0]?.volumeSol || 1;
      const scaledRadius = HUB_BASE_RADIUS + ((t.volumeSol / maxVol) * (HUB_MAX_RADIUS - HUB_BASE_RADIUS));
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
          color: HUB_COLORS[i % HUB_COLORS.length],
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
        };
        this.nodeMap.set(t.mint, node);
        this.nodes.push(node);
        changed = true;
      }
    }

    // --- Agent nodes from trader edges ---
    const agentCount = this.nodes.filter((n) => n.type === 'agent').length;
    const budget = MAX_AGENT_NODES - agentCount;
    let added = 0;

    for (const edge of traderEdges) {
      if (!hubMints.has(edge.mint)) continue;
      const agentId = `agent:${edge.trader}:${edge.mint}`;
      if (this.nodeMap.has(agentId)) continue;
      if (added >= budget) break;

      // Place near hub
      const hub = this.nodeMap.get(edge.mint);
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 4;
      const node: ForceNode = {
        id: agentId,
        type: 'agent',
        label: edge.trader.slice(0, 6),
        radius: AGENT_RADIUS,
        color: '#555566',
        hubMint: edge.mint,
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

      // Update simulation
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
// Three.js sub-components
// ---------------------------------------------------------------------------

/** InstancedMesh for hub nodes (large spheres) */
const HubNodes = memo<{ sim: ForceGraphSimulation }>(({ sim }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const labelGroupRef = useRef<THREE.Group>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  // Sphere geometry shared for hubs
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const hubs = sim.nodes.filter((n) => n.type === 'hub');
    mesh.count = hubs.length;

    for (let i = 0; i < hubs.length; i++) {
      const node = hubs[i];
      tempObj.position.set(node.x ?? 0, 0, node.y ?? 0);
      tempObj.scale.setScalar(node.radius);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);
      tempColor.set(node.color);
      mesh.setColorAt(i, tempColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, 20]} frustumCulled={false}>
      {/* Colors set per-instance in useFrame */}
    </instancedMesh>
  );
});
HubNodes.displayName = 'HubNodes';

/** Floating HTML labels for hub nodes */
const HubLabels = memo<{ sim: ForceGraphSimulation }>(({ sim }) => {
  const groupRef = useRef<THREE.Group>(null);
  const labelsRef = useRef<{ id: string; label: string; x: number; z: number; radius: number }[]>([]);

  useFrame(() => {
    const hubs = sim.nodes.filter((n) => n.type === 'hub');
    labelsRef.current = hubs.map((h) => ({
      id: h.id,
      label: h.label,
      x: h.x ?? 0,
      z: h.y ?? 0,
      radius: h.radius,
    }));
  });

  // Re-render labels at a lower rate via a state update
  const [labels, setLabels] = React.useState<typeof labelsRef.current>([]);
  useFrame(() => {
    // Throttle to ~10fps for label positions
    if (Math.random() < 0.15) {
      setLabels([...labelsRef.current]);
    }
  });

  return (
    <group ref={groupRef}>
      {labels.map((l) => (
        <Html
          key={l.id}
          position={[l.x, l.radius + 0.5, l.z]}
          center
          distanceFactor={50}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 700,
              color: '#1a1a2e',
              background: 'rgba(255,255,255,0.85)',
              padding: '2px 6px',
              borderRadius: 3,
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {l.label}
          </div>
        </Html>
      ))}
    </group>
  );
});
HubLabels.displayName = 'HubLabels';

/** InstancedMesh for agent nodes (tiny spheres) */
const AgentNodes = memo<{ sim: ForceGraphSimulation }>(({ sim }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const agents = sim.nodes.filter((n) => n.type === 'agent');
    const count = Math.min(agents.length, MAX_AGENT_NODES);
    mesh.count = count;

    for (let i = 0; i < count; i++) {
      const node = agents[i];
      tempObj.position.set(node.x ?? 0, 0, node.y ?? 0);
      tempObj.scale.setScalar(node.radius);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);
      tempColor.set(node.color);
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
const Edges = memo<{ sim: ForceGraphSimulation }>(({ sim }) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const posAttr = useRef<THREE.Float32BufferAttribute | null>(null);
  const colorAttr = useRef<THREE.Float32BufferAttribute | null>(null);
  const maxEdges = 20000;

  useEffect(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(maxEdges * 6); // 2 vertices * 3 coords
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

      // Hub-to-hub edges slightly darker
      const isHubEdge = src.type === 'hub' && tgt.type === 'hub';
      const gray = isHubEdge ? 0.45 : 0.75;
      cA.array[idx] = gray;
      cA.array[idx + 1] = gray;
      cA.array[idx + 2] = gray;
      cA.array[idx + 3] = gray;
      cA.array[idx + 4] = gray;
      cA.array[idx + 5] = gray;
    }

    pA.needsUpdate = true;
    cA.needsUpdate = true;
    lineRef.current.geometry.setDrawRange(0, count * 2);
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial vertexColors transparent opacity={0.25} />
    </lineSegments>
  );
});
Edges.displayName = 'Edges';

/** Ground plane for visual grounding */
const Ground = memo(() => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
    <planeGeometry args={[200, 200]} />
    <meshStandardMaterial color="#f8f8fa" />
  </mesh>
));
Ground.displayName = 'Ground';

// ---------------------------------------------------------------------------
// Scene: assembles all 3D sub-components + camera
// ---------------------------------------------------------------------------

import React from 'react';

const NetworkScene = memo<{ sim: ForceGraphSimulation }>(({ sim }) => {
  // Tick the d3-force simulation each frame
  useFrame(() => {
    sim.tick();
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[20, 40, 20]} intensity={0.6} />

      {/* Graph elements */}
      <Edges sim={sim} />
      <HubNodes sim={sim} />
      <AgentNodes sim={sim} />
      <HubLabels sim={sim} />
      <Ground />
    </>
  );
});
NetworkScene.displayName = 'NetworkScene';

/** Camera controller: top-down with pan/zoom, no rotation */
const CameraSetup = memo(() => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 55, 12);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <MapControls
      enableRotate={false}
      enableDamping
      dampingFactor={0.15}
      minDistance={10}
      maxDistance={150}
      screenSpacePanning
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
  height?: string | number;
}

function ForceGraph({ topTokens, traderEdges, height = '100%' }: ForceGraphProps) {
  const simRef = useRef<ForceGraphSimulation | null>(null);

  // Create simulation once
  if (!simRef.current) {
    simRef.current = new ForceGraphSimulation();
  }
  const sim = simRef.current;

  // Feed data into the simulation when it changes (debounced via useMemo dependency)
  const tokenKey = topTokens.map((t) => `${t.mint}:${t.trades}`).join(',');
  const edgeCount = traderEdges.length;
  useEffect(() => {
    sim.update(topTokens, traderEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenKey, edgeCount]);

  // Cleanup
  useEffect(() => {
    return () => {
      simRef.current?.dispose();
    };
  }, []);

  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 500, position: [0, 55, 12] }}
        style={{ background: '#ffffff' }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <CameraSetup />
        <NetworkScene sim={sim} />
      </Canvas>
    </div>
  );
}

export default memo(ForceGraph);
