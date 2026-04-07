'use client';

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum3D,
} from 'd3-force-3d';
import type { SimulationLinkDatum } from 'd3-force';

import {
  type PumpGraphData,
  type PumpNode,
  type PumpLink,
  HUB_CENTRAL_ID,
  HUB_NODES,
  HUB_IDS,
} from './types';

// ---------------------------------------------------------------------------
// Simulation types
// ---------------------------------------------------------------------------

interface SimNode extends SimulationNodeDatum3D {
  id: string;
  type: 'token' | 'trade' | 'hub' | 'central';
  ticker?: string;
  isBuy?: boolean;
  solAmount?: number;
  label?: string;
  timestamp: number;
  // Fixed position flags for d3-force
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
}

interface SimEdge extends SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const CENTRAL_COLOR = new THREE.Color('#a855f7'); // purple-500
const HUB_COLOR = new THREE.Color('#22d3ee');     // cyan-400
const BUY_COLOR = new THREE.Color('#4ade80');      // green-400
const SELL_COLOR = new THREE.Color('#f87171');      // red-400
const TOKEN_COLOR = new THREE.Color('#facc15');    // yellow-400
const EDGE_COLOR = new THREE.Color('#ffffff');

// Hub-specific colors
const HUB_COLORS: Record<string, THREE.Color> = {
  'hub:buys': new THREE.Color('#4ade80'),
  'hub:sells': new THREE.Color('#f87171'),
  'hub:creates': new THREE.Color('#facc15'),
  'hub:whales': new THREE.Color('#3b82f6'),
  'hub:github_claims': new THREE.Color('#a855f7'),
  'hub:social_claims': new THREE.Color('#f472b6'),
};

// ---------------------------------------------------------------------------
// Hub layout — distribute 6 hubs in a circle on the XZ plane
// ---------------------------------------------------------------------------

const HUB_ORBIT_RADIUS = 55;

function hubPosition(index: number, total: number): [number, number, number] {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return [
    Math.cos(angle) * HUB_ORBIT_RADIUS,
    0,
    Math.sin(angle) * HUB_ORBIT_RADIUS,
  ];
}

// ---------------------------------------------------------------------------
// Force simulation wrapper
// ---------------------------------------------------------------------------

class PumpSimulation {
  nodes: SimNode[] = [];
  edges: SimEdge[] = [];
  private simulation: ReturnType<typeof forceSimulation<SimNode>>;
  private nodeMap = new Map<string, SimNode>();
  private hubsInitialized = false;

  private nodeId(nodeRef: string | PumpNode): string {
    return typeof nodeRef === 'string' ? nodeRef : nodeRef.id;
  }

  constructor() {
    this.simulation = forceSimulation<SimNode>([], 3)
      .numDimensions(3)
      .force(
        'charge',
        forceManyBody<SimNode>().strength((d) => {
          if (d.type === 'central') return -800;
          if (d.type === 'hub') return -500;
          if (d.type === 'token') return -20;
          if (d.type === 'trade') return -3;
          return -30;
        }),
      )
      .force('center', forceCenter<SimNode>(0, 0, 0).strength(0.02))
      .force(
        'collide',
        forceCollide<SimNode>().radius((d) => {
          if (d.type === 'central') return 12;
          if (d.type === 'hub') return 8;
          if (d.type === 'token') return 3;
          if (d.type === 'trade') return 1.5;
          return 1;
        }),
      )
      .force(
        'link',
        forceLink<SimNode, SimEdge>([])
          .id((d) => d.id)
          .distance((d) => {
            const src = typeof d.source === 'object' ? d.source : null;
            const tgt = typeof d.target === 'object' ? d.target : null;
            // Hub-to-central links: keep orbital distance
            if (
              (src?.type === 'hub' && tgt?.type === 'central') ||
              (src?.type === 'central' && tgt?.type === 'hub')
            )
              return HUB_ORBIT_RADIUS;
            // Trade/token-to-hub links: tight clustering
            if (tgt?.type === 'hub' || src?.type === 'hub') return 18;
            return 40;
          })
          .strength((d) => {
            const src = typeof d.source === 'object' ? d.source : null;
            const tgt = typeof d.target === 'object' ? d.target : null;
            if (
              (src?.type === 'hub' && tgt?.type === 'central') ||
              (src?.type === 'central' && tgt?.type === 'hub')
            )
              return 0.05;
            return 0.3;
          }),
      )
      .alphaDecay(0.008)
      .velocityDecay(0.4);
  }

  private initHubs() {
    if (this.hubsInitialized) return;
    this.hubsInitialized = true;

    // Central node
    const central: SimNode = {
      id: HUB_CENTRAL_ID,
      type: 'central',
      label: 'PUMPFUN',
      timestamp: Date.now(),
      x: 0,
      y: 0,
      z: 0,
      fx: 0,
      fy: 0,
      fz: 0,
    };
    this.nodeMap.set(central.id, central);
    this.nodes.push(central);

    // Category hubs
    HUB_NODES.forEach((hub, i) => {
      const [hx, hy, hz] = hubPosition(i, HUB_NODES.length);
      const simNode: SimNode = {
        id: hub.id,
        type: 'hub',
        label: hub.label,
        timestamp: Date.now(),
        x: hx,
        y: hy,
        z: hz,
        fx: hx,
        fy: hy,
        fz: hz,
      };
      this.nodeMap.set(hub.id, simNode);
      this.nodes.push(simNode);
    });

    // Links from central to each hub
    for (const hub of HUB_NODES) {
      this.edges.push({ source: hub.id, target: HUB_CENTRAL_ID });
    }
  }

  update(graphData: PumpGraphData) {
    this.initHubs();
    let changed = false;

    // Sync non-hub nodes from graph data
    const activeIds = new Set<string>(HUB_IDS);
    for (const n of graphData.nodes) {
      if (HUB_IDS.has(n.id)) continue; // skip hub/central — managed internally
      activeIds.add(n.id);
      if (!this.nodeMap.has(n.id)) {
        // Place new nodes near their target hub for visual coherence
        const hubId = this.findTargetHub(n, graphData.links);
        const hubNode = hubId ? this.nodeMap.get(hubId) : null;
        const baseX = hubNode?.x ?? 0;
        const baseZ = hubNode?.z ?? 0;

        const simNode: SimNode = {
          id: n.id,
          type: n.type,
          ticker: n.ticker,
          isBuy: n.isBuy,
          solAmount: n.solAmount,
          label: n.label,
          timestamp: n.timestamp,
          x: baseX + (Math.random() - 0.5) * 30,
          y: (Math.random() - 0.5) * 20,
          z: baseZ + (Math.random() - 0.5) * 30,
        };
        this.nodeMap.set(n.id, simNode);
        this.nodes.push(simNode);
        changed = true;
      }
    }

    // Remove GC'd nodes (but never hubs)
    const before = this.nodes.length;
    this.nodes = this.nodes.filter((n) => activeIds.has(n.id));
    if (this.nodes.length !== before) {
      for (const [id] of this.nodeMap) {
        if (!activeIds.has(id)) this.nodeMap.delete(id);
      }
      changed = true;
    }

    // Sync edges — keep hub-to-central edges, add data edges
    const hubEdges = this.edges.filter((e) => {
      const src = typeof e.source === 'object' ? e.source.id : e.source;
      const tgt = typeof e.target === 'object' ? e.target.id : e.target;
      return (
        (HUB_IDS.has(src) && tgt === HUB_CENTRAL_ID) ||
        (src === HUB_CENTRAL_ID && HUB_IDS.has(tgt))
      );
    });

    const dataEdges = graphData.links
      .filter((l) => {
        const src = this.nodeId(l.source);
        const tgt = this.nodeId(l.target);
        return this.nodeMap.has(src) && this.nodeMap.has(tgt);
      })
      .map((l) => ({
        source: this.nodeId(l.source),
        target: this.nodeId(l.target),
      }));

    this.edges = [...hubEdges, ...dataEdges];

    if (changed) {
      this.simulation.nodes(this.nodes);
      this.simulation.numDimensions(3);
      (
        this.simulation.force('link') as ReturnType<typeof forceLink<SimNode, SimEdge>>
      ).links(this.edges);
      this.simulation.alpha(0.3).restart();
    }
  }

  /** Find which hub a node links to */
  private findTargetHub(
    node: PumpNode,
    links: PumpLink[],
  ): string | null {
    for (const l of links) {
      const src = typeof l.source === 'string' ? l.source : l.source.id;
      const tgt = typeof l.target === 'string' ? l.target : l.target.id;
      if (src === node.id && HUB_IDS.has(tgt)) return tgt;
      if (tgt === node.id && HUB_IDS.has(src)) return src;
    }
    return null;
  }

  tick() {
    this.simulation.tick();
  }

  dispose() {
    this.simulation.stop();
  }

  getHubNodes(): SimNode[] {
    return this.nodes.filter((n) => n.type === 'hub' || n.type === 'central');
  }
}

// ---------------------------------------------------------------------------
// Hub label (DOM overlay like Giza ProtocolLabel)
// ---------------------------------------------------------------------------

const HubLabel = memo<{ label: string; position: [number, number, number] }>(
  ({ label, position }) => (
    <Html position={position} center style={{ pointerEvents: 'none' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: 'translateY(-14px)',
        }}
      >
        <div
          style={{
            background: '#1a1a1a',
            color: '#ffffff',
            padding: '6px 14px',
            borderRadius: 20,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
          }}
        >
          {label}
        </div>
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1a1a1a',
            marginTop: -1,
          }}
        />
      </div>
    </Html>
  ),
);
HubLabel.displayName = 'HubLabel';

// ---------------------------------------------------------------------------
// Central orb rendering
// ---------------------------------------------------------------------------

const CentralOrb = memo<{ sim: PumpSimulation }>(({ sim }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const node = sim.nodes.find((n) => n.id === HUB_CENTRAL_ID);
    if (!node || !meshRef.current) return;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const z = node.z ?? 0;
    meshRef.current.position.set(x, y, z);
    // Gentle pulse
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.2) * 0.05;
    meshRef.current.scale.setScalar(6 * pulse);

    if (glowRef.current) {
      glowRef.current.position.set(x, y, z);
      glowRef.current.scale.setScalar(8 * pulse);
    }
  });

  return (
    <>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial
          color={CENTRAL_COLOR}
          emissive={CENTRAL_COLOR}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.3}
          toneMapped={false}
        />
      </mesh>
      {/* Glow halo */}
      <mesh ref={glowRef}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial
          color={CENTRAL_COLOR}
          emissive={CENTRAL_COLOR}
          emissiveIntensity={0.3}
          transparent
          opacity={0.15}
          toneMapped={false}
        />
      </mesh>
    </>
  );
});
CentralOrb.displayName = 'CentralOrb';

// ---------------------------------------------------------------------------
// Hub node spheres + labels
// ---------------------------------------------------------------------------

const HubNodes = memo<{ sim: PumpSimulation }>(({ sim }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const labelPositions = useRef<[number, number, number][]>(
    HUB_NODES.map(() => [0, 0, 0] as [number, number, number]),
  );

  // Force re-render for label updates
  const [, forceUpdate] = React.useState(0);

  useFrame(({ clock }) => {
    let posChanged = false;
    HUB_NODES.forEach((hub, i) => {
      const node = sim.nodes.find((n) => n.id === hub.id);
      const mesh = meshRefs.current[i];
      if (!node || !mesh) return;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const z = node.z ?? 0;
      mesh.position.set(x, y, z);
      const pulse = 1 + Math.sin(clock.elapsedTime * 0.8 + i * 1.1) * 0.04;
      mesh.scale.setScalar(3.5 * pulse);

      const newLabelPos: [number, number, number] = [x, y + 6, z];
      const old = labelPositions.current[i];
      if (
        Math.abs(old[0] - newLabelPos[0]) > 0.1 ||
        Math.abs(old[1] - newLabelPos[1]) > 0.1 ||
        Math.abs(old[2] - newLabelPos[2]) > 0.1
      ) {
        labelPositions.current[i] = newLabelPos;
        posChanged = true;
      }
    });
    // Update labels periodically (every ~30 frames)
    if (posChanged && Math.random() < 0.1) forceUpdate((c) => c + 1);
  });

  // Central label
  const centralNode = sim.nodes.find((n) => n.id === HUB_CENTRAL_ID);
  const centralLabelPos: [number, number, number] = [
    centralNode?.x ?? 0,
    (centralNode?.y ?? 0) + 10,
    centralNode?.z ?? 0,
  ];

  return (
    <group ref={groupRef}>
      {HUB_NODES.map((hub, i) => {
        const color = HUB_COLORS[hub.id] || HUB_COLOR;
        return (
          <React.Fragment key={hub.id}>
            <mesh ref={(el) => { meshRefs.current[i] = el; }}>
              <icosahedronGeometry args={[1, 2]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.6}
                roughness={0.3}
                metalness={0.1}
                toneMapped={false}
              />
            </mesh>
            <HubLabel label={hub.label} position={labelPositions.current[i]} />
          </React.Fragment>
        );
      })}
      <HubLabel label="PUMPFUN" position={centralLabelPos} />
    </group>
  );
});
HubNodes.displayName = 'HubNodes';

// ---------------------------------------------------------------------------
// Trade / token particle nodes (instanced meshes)
// ---------------------------------------------------------------------------

const ParticleNodes = memo<{ sim: PumpSimulation }>(({ sim }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0.0,
        transparent: true,
        opacity: 0.85,
        toneMapped: false,
      }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let idx = 0;
    for (const node of sim.nodes) {
      if (node.type === 'hub' || node.type === 'central') continue;
      tempObj.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);

      if (node.type === 'token') {
        tempObj.scale.setScalar(1.5);
        tempColor.copy(TOKEN_COLOR);
      } else {
        const size = 0.3 + Math.min((node.solAmount ?? 0) * 0.15, 1.2);
        tempObj.scale.setScalar(size);
        tempColor.copy(node.isBuy ? BUY_COLOR : SELL_COLOR);
      }

      tempObj.updateMatrix();
      mesh.setMatrixAt(idx, tempObj.matrix);
      mesh.setColorAt(idx, tempColor);
      idx++;
    }

    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, 5000]} frustumCulled={false} />
  );
});
ParticleNodes.displayName = 'ParticleNodes';

// ---------------------------------------------------------------------------
// Edge rendering — white lines
// ---------------------------------------------------------------------------

const Edges = memo<{ sim: PumpSimulation }>(({ sim }) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const positionsRef = useRef(new Float32Array(0));

  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;
    const geo = line.geometry;

    const edgeCount = sim.edges.length;
    const needed = edgeCount * 6;
    if (positionsRef.current.length < needed) {
      positionsRef.current = new Float32Array(needed);
      geo.setAttribute('position', new THREE.BufferAttribute(positionsRef.current, 3));
    }

    const pos = positionsRef.current;
    let idx = 0;
    for (const edge of sim.edges) {
      const src = typeof edge.source === 'object' ? edge.source : null;
      const tgt = typeof edge.target === 'object' ? edge.target : null;
      if (!src || !tgt) continue;
      pos[idx++] = src.x ?? 0;
      pos[idx++] = src.y ?? 0;
      pos[idx++] = src.z ?? 0;
      pos[idx++] = tgt.x ?? 0;
      pos[idx++] = tgt.y ?? 0;
      pos[idx++] = tgt.z ?? 0;
    }

    geo.setDrawRange(0, idx / 3);
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (posAttr) posAttr.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color={EDGE_COLOR} transparent opacity={0.25} />
    </lineSegments>
  );
});
Edges.displayName = 'PumpEdges';

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

const PumpScene = memo<{ sim: PumpSimulation }>(({ sim }) => {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = new THREE.Color('#050505');
  }, [scene]);

  useFrame(() => {
    sim.tick();
  });

  return (
    <>
      <directionalLight position={[20, 40, 20]} intensity={0.4} />
      <ambientLight intensity={0.15} />
      <CentralOrb sim={sim} />
      <HubNodes sim={sim} />
      <ParticleNodes sim={sim} />
      <Edges sim={sim} />
      <CameraControls makeDefault />
    </>
  );
});
PumpScene.displayName = 'PumpScene';

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export function PumpForceGraph({ graphData }: { graphData: PumpGraphData }) {
  const simRef = useRef<PumpSimulation | null>(null);
  if (!simRef.current) simRef.current = new PumpSimulation();

  useEffect(() => {
    simRef.current!.update(graphData);
  }, [graphData]);

  useEffect(() => {
    return () => simRef.current?.dispose();
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 60, 140], fov: 55, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%' }}
    >
      <PumpScene sim={simRef.current} />
    </Canvas>
  );
}
