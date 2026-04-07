'use client';

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Environment } from '@react-three/drei';
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

import type { PumpGraphData, PumpNode, PumpLink } from './types';

// ---------------------------------------------------------------------------
// Simulation types
// ---------------------------------------------------------------------------

interface SimNode extends SimulationNodeDatum3D {
  id: string;
  type: 'token' | 'trade';
  ticker?: string;
  isBuy?: boolean;
  solAmount?: number;
  timestamp: number;
}

interface SimEdge extends SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const TOKEN_COLOR = new THREE.Color('#22d3ee'); // cyan-400
const BUY_COLOR = new THREE.Color('#4ade80');   // green-400
const SELL_COLOR = new THREE.Color('#f87171');   // red-400
const EDGE_COLOR = new THREE.Color('#ffffff');

// ---------------------------------------------------------------------------
// Force simulation wrapper
// ---------------------------------------------------------------------------

class PumpSimulation {
  nodes: SimNode[] = [];
  edges: SimEdge[] = [];
  private simulation: ReturnType<typeof forceSimulation<SimNode>>;
  private nodeMap = new Map<string, SimNode>();

  private nodeId(nodeRef: string | PumpNode): string {
    return typeof nodeRef === 'string' ? nodeRef : nodeRef.id;
  }

  constructor() {
    this.simulation = forceSimulation<SimNode>([], 3)
      .numDimensions(3)
      // 1. Charge (Repulsion): Tokens push each other away, trades slightly buzz
      .force(
        'charge',
        forceManyBody<SimNode>().strength((d) => {
          if (d.type === 'token') return -400;
          if (d.type === 'trade') return -3;
          return -30;
        }),
      )
      // 2. Center gravity: keeps the system from floating off-screen
      .force('center', forceCenter<SimNode>(0, 0, 0).strength(0.05))
      // 3. Collision: prevents overlap with HTML text labels
      .force(
        'collide',
        forceCollide<SimNode>().radius((d) => {
          if (d.type === 'token') return 30;
          if (d.type === 'trade') return 2;
          return 1;
        }),
      )
      // 4. Link distance: pulls trades tightly to their tokens
      .force(
        'link',
        forceLink<SimNode, SimEdge>([])
          .id((d) => d.id)
          .distance((d) => {
            const src = typeof d.source === 'object' ? d.source : null;
            return src?.type === 'trade' ? 15 : 50;
          }),
      )
      .alphaDecay(0.01)
      .velocityDecay(0.4);
  }

  update(graphData: PumpGraphData) {
    let changed = false;

    // Sync nodes
    const activeIds = new Set<string>();
    for (const n of graphData.nodes) {
      activeIds.add(n.id);
      if (!this.nodeMap.has(n.id)) {
        const simNode: SimNode = {
          id: n.id,
          type: n.type,
          ticker: n.ticker,
          isBuy: n.isBuy,
          solAmount: n.solAmount,
          timestamp: n.timestamp,
          x: (Math.random() - 0.5) * 60,
          y: (Math.random() - 0.5) * 60,
          z: (Math.random() - 0.5) * 60,
        };
        this.nodeMap.set(n.id, simNode);
        this.nodes.push(simNode);
        changed = true;
      }
    }

    // Remove GC'd nodes
    const before = this.nodes.length;
    this.nodes = this.nodes.filter((n) => activeIds.has(n.id));
    if (this.nodes.length !== before) {
      for (const [id] of this.nodeMap) {
        if (!activeIds.has(id)) this.nodeMap.delete(id);
      }
      changed = true;
    }

    // Sync edges
    this.edges = graphData.links
      .filter((l) => {
        const src = this.nodeId(l.source);
        const tgt = this.nodeId(l.target);
        return this.nodeMap.has(src) && this.nodeMap.has(tgt);
      })
      .map((l) => ({
        source: this.nodeId(l.source),
        target: this.nodeId(l.target),
      }));

    if (changed) {
      this.simulation.nodes(this.nodes);
      this.simulation.numDimensions(3);
      (
        this.simulation.force('link') as ReturnType<typeof forceLink<SimNode, SimEdge>>
      ).links(this.edges);
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
// Node rendering (instanced meshes for performance)
// ---------------------------------------------------------------------------

const Nodes = memo<{ sim: PumpSimulation }>(({ sim }) => {
  const tokenMeshRef = useRef<THREE.InstancedMesh>(null);
  const tradeMeshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const tokenGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const tradeGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);

  const tokenMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.3,
        metalness: 0.1,
        emissive: TOKEN_COLOR,
        emissiveIntensity: 0.6,
        toneMapped: false,
      }),
    [],
  );

  const tradeMat = useMemo(
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
    const tokenMesh = tokenMeshRef.current;
    const tradeMesh = tradeMeshRef.current;
    if (!tokenMesh || !tradeMesh) return;

    let ti = 0;
    let tri = 0;
    for (const node of sim.nodes) {
      tempObj.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);

      if (node.type === 'token') {
        tempObj.scale.setScalar(2.5);
        tempObj.updateMatrix();
        tokenMesh.setMatrixAt(ti, tempObj.matrix);
        tokenMesh.setColorAt(ti, TOKEN_COLOR);
        ti++;
      } else {
        const size = 0.3 + Math.min((node.solAmount ?? 0) * 0.15, 1.2);
        tempObj.scale.setScalar(size);
        tempObj.updateMatrix();
        tradeMesh.setMatrixAt(tri, tempObj.matrix);
        tempColor.copy(node.isBuy ? BUY_COLOR : SELL_COLOR);
        tradeMesh.setColorAt(tri, tempColor);
        tri++;
      }
    }

    tokenMesh.count = ti;
    tradeMesh.count = tri;
    tokenMesh.instanceMatrix.needsUpdate = true;
    tradeMesh.instanceMatrix.needsUpdate = true;
    if (tokenMesh.instanceColor) tokenMesh.instanceColor.needsUpdate = true;
    if (tradeMesh.instanceColor) tradeMesh.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={tokenMeshRef} args={[tokenGeo, tokenMat, 200]} frustumCulled={false} />
      <instancedMesh ref={tradeMeshRef} args={[tradeGeo, tradeMat, 5000]} frustumCulled={false} />
    </>
  );
});
Nodes.displayName = 'PumpNodes';

// ---------------------------------------------------------------------------
// Edge rendering
// ---------------------------------------------------------------------------

const Edges = memo<{ sim: PumpSimulation }>(({ sim }) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const positionsRef = useRef(new Float32Array(0));

  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;
    const geo = line.geometry;

    const edgeCount = sim.edges.length;
    const needed = edgeCount * 6; // 2 vertices × 3 components
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
      <lineBasicMaterial color={EDGE_COLOR} transparent opacity={0.08} />
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
      <Environment preset="night" environmentIntensity={0.3} background={false} />
      <directionalLight position={[20, 40, 20]} intensity={0.3} />
      <Nodes sim={sim} />
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
      camera={{ position: [0, 60, 120], fov: 55, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%' }}
    >
      <PumpScene sim={simRef.current} />
    </Canvas>
  );
}
