'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
} from 'd3-force-3d';
import type { PumpGraphData, PumpNode, PumpLink } from '@/app/pumpfun/types';
import { usePumpFunSocket } from '@/app/pumpfun/usePumpFunSocket';
import { useGraphMetrics } from '@/app/pumpfun/useGraphMetrics';

// ============================================================================
// Simulation node / link with mutable x/y/z from d3-force-3d
// ============================================================================

interface SimNode extends PumpNode {
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  index?: number;
}

interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
}

// ============================================================================
// Colors
// ============================================================================

const TOKEN_COLOR = '#00e5ff';
const BUY_COLOR = '#00e676';
const SELL_COLOR = '#ff1744';
const EDGE_COLOR_R = 0.35;
const EDGE_COLOR_G = 0.35;
const EDGE_COLOR_B = 0.45;

// ============================================================================
// Force simulation manager
// ============================================================================

class PumpSimulation {
  sim: ReturnType<typeof forceSimulation>;
  nodeMap = new Map<string, SimNode>();
  simNodes: SimNode[] = [];
  simLinks: SimLink[] = [];

  constructor() {
    this.sim = forceSimulation([], 3)
      .force('charge', forceManyBody().strength(-30))
      .force('center', forceCenter(0, 0, 0).strength(0.05))
      .force(
        'link',
        forceLink<SimNode, SimLink>([])
          .id((d: SimNode) => d.id)
          .distance(8)
          .strength(0.3),
      )
      .alphaDecay(0.02)
      .velocityDecay(0.3);
  }

  update(data: PumpGraphData) {
    // Reconcile nodes — reuse existing positions
    const nextMap = new Map<string, SimNode>();
    for (const n of data.nodes) {
      const existing = this.nodeMap.get(n.id);
      if (existing) {
        // Keep positions, update data fields
        existing.type = n.type;
        existing.ticker = n.ticker;
        existing.isBuy = n.isBuy;
        existing.solAmount = n.solAmount;
        existing.timestamp = n.timestamp;
        nextMap.set(n.id, existing);
      } else {
        const simNode: SimNode = { ...n };
        nextMap.set(n.id, simNode);
      }
    }

    this.nodeMap = nextMap;
    this.simNodes = Array.from(nextMap.values());
    this.simLinks = data.links
      .filter((l) => nextMap.has(l.source) && nextMap.has(l.target))
      .map((l) => ({ source: l.source, target: l.target }));

    this.sim.nodes(this.simNodes);
    (this.sim.force('link') as ReturnType<typeof forceLink>)
      .links(this.simLinks);
    this.sim.alpha(0.5).restart();
  }

  tick() {
    this.sim.tick();
  }

  dispose() {
    this.sim.stop();
  }
}

// ============================================================================
// Instanced token nodes (larger spheres, cyan)
// ============================================================================

const MAX_TOKENS = 500;

const TokenNodes = memo<{ pumpSim: PumpSimulation }>(({ pumpSim }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.3,
        metalness: 0.1,
        emissive: new THREE.Color(TOKEN_COLOR),
        emissiveIntensity: 2.0,
        toneMapped: false,
      }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const tokens = pumpSim.simNodes.filter((n) => n.type === 'token');
    const count = Math.min(tokens.length, MAX_TOKENS);
    mesh.count = count;

    for (let i = 0; i < count; i++) {
      const node = tokens[i];
      tempObj.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
      tempObj.scale.setScalar(1.8);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);
      tempColor.set(TOKEN_COLOR);
      mesh.setColorAt(i, tempColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_TOKENS]}
      frustumCulled={false}
    />
  );
});
TokenNodes.displayName = 'TokenNodes';

// ============================================================================
// Instanced trade nodes (smaller spheres, green=buy, red=sell)
// ============================================================================

const MAX_TRADES = 5000;

const TradeNodes = memo<{ pumpSim: PumpSimulation }>(({ pumpSim }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.4,
        metalness: 0.0,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 1.5,
        toneMapped: false,
      }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const trades = pumpSim.simNodes.filter((n) => n.type === 'trade');
    const count = Math.min(trades.length, MAX_TRADES);
    mesh.count = count;

    for (let i = 0; i < count; i++) {
      const node = trades[i];
      const radius = 0.3 + Math.min((node.solAmount ?? 0) * 0.5, 1.2);
      tempObj.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
      tempObj.scale.setScalar(radius);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);
      tempColor.set(node.isBuy ? BUY_COLOR : SELL_COLOR);
      mesh.setColorAt(i, tempColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_TRADES]}
      frustumCulled={false}
    />
  );
});
TradeNodes.displayName = 'TradeNodes';

// ============================================================================
// Edges (line segments connecting trades to tokens)
// ============================================================================

const MAX_EDGES = 10000;

const Edges = memo<{ pumpSim: PumpSimulation }>(({ pumpSim }) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const posAttr = useRef<THREE.Float32BufferAttribute | null>(null);
  const colorAttr = useRef<THREE.Float32BufferAttribute | null>(null);

  useEffect(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_EDGES * 6);
    const colors = new Float32Array(MAX_EDGES * 6);
    const pA = new THREE.Float32BufferAttribute(positions, 3);
    const cA = new THREE.Float32BufferAttribute(colors, 3);
    pA.setUsage(THREE.DynamicDrawUsage);
    cA.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', pA);
    geo.setAttribute('color', cA);
    geo.setDrawRange(0, 0);
    posAttr.current = pA;
    colorAttr.current = cA;

    if (lineRef.current) {
      lineRef.current.geometry.dispose();
      lineRef.current.geometry = geo;
    }
  }, []);

  useFrame(() => {
    const pA = posAttr.current;
    const cA = colorAttr.current;
    if (!pA || !cA || !lineRef.current) return;

    const links = pumpSim.simLinks;
    const count = Math.min(links.length, MAX_EDGES);

    for (let i = 0; i < count; i++) {
      const link = links[i];
      const src = link.source as SimNode;
      const tgt = link.target as SimNode;
      const idx = i * 6;

      pA.array[idx] = src.x ?? 0;
      pA.array[idx + 1] = src.y ?? 0;
      pA.array[idx + 2] = src.z ?? 0;
      pA.array[idx + 3] = tgt.x ?? 0;
      pA.array[idx + 4] = tgt.y ?? 0;
      pA.array[idx + 5] = tgt.z ?? 0;

      cA.array[idx] = EDGE_COLOR_R;
      cA.array[idx + 1] = EDGE_COLOR_G;
      cA.array[idx + 2] = EDGE_COLOR_B;
      cA.array[idx + 3] = EDGE_COLOR_R;
      cA.array[idx + 4] = EDGE_COLOR_G;
      cA.array[idx + 5] = EDGE_COLOR_B;
    }

    pA.needsUpdate = true;
    cA.needsUpdate = true;
    lineRef.current.geometry.setDrawRange(0, count * 2);
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.3}
        toneMapped={false}
      />
    </lineSegments>
  );
});
Edges.displayName = 'Edges';

// ============================================================================
// Scene orchestrator
// ============================================================================

const PumpScene = memo<{ pumpSim: PumpSimulation }>(({ pumpSim }) => {
  useFrame(() => {
    pumpSim.tick();
  });

  return (
    <>
      <Environment preset="night" environmentIntensity={0.3} background={false} />
      <directionalLight position={[20, 40, 20]} intensity={0.2} />
      <ambientLight intensity={0.1} />
      <Edges pumpSim={pumpSim} />
      <TokenNodes pumpSim={pumpSim} />
      <TradeNodes pumpSim={pumpSim} />
    </>
  );
});
PumpScene.displayName = 'PumpScene';

// ============================================================================
// Main exported component
// ============================================================================

export default function PumpFunGraph() {
  const { graphData, connected } = usePumpFunSocket();
  const metrics = useGraphMetrics(graphData);

  const pumpSimRef = useRef<PumpSimulation | null>(null);
  if (!pumpSimRef.current) {
    pumpSimRef.current = new PumpSimulation();
  }
  const pumpSim = pumpSimRef.current;

  // Push new graph data into the simulation on each flush
  useEffect(() => {
    pumpSim.update(graphData);
  }, [graphData, pumpSim]);

  // Cleanup
  useEffect(() => {
    return () => {
      pumpSim.dispose();
    };
  }, [pumpSim]);

  return (
    <>
      {/* Connection status badge */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            connected ? 'bg-green-400' : 'bg-red-500'
          }`}
        />
        {connected ? 'Live' : 'Connecting…'}
      </div>

      {/* Metrics HUD */}
      <div className="absolute right-4 top-4 z-10 flex gap-4 rounded-full bg-black/60 px-4 py-1.5 text-xs tabular-nums text-white/50 backdrop-blur">
        <span>{metrics.activeTokens} tokens</span>
        <span>{metrics.liveSwaps} swaps</span>
        <span>{metrics.totalVolume.toFixed(2)} SOL</span>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 2000, position: [0, 80, 120] }}
        style={{ background: '#050505' }}
        gl={{ antialias: false, alpha: false, stencil: false }}
        dpr={[1, 1.5]}
      >
        <OrbitControls
          enableRotate
          enableDamping
          dampingFactor={0.15}
          minDistance={10}
          maxDistance={500}
          enablePan
        />
        <PumpScene pumpSim={pumpSim} />
      </Canvas>
    </>
  );
}
