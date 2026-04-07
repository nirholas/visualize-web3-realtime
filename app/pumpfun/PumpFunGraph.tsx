'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import {
  CSS2DRenderer,
  CSS2DObject,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { PumpGraphData, PumpNode } from './types';

// ---------------------------------------------------------------------------
// Glow Texture Factory
// ---------------------------------------------------------------------------

function createGlowTexture(color: string): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Lazy-initialized singletons — created once on first access (client only)
let _buyTexture: THREE.CanvasTexture | null = null;
let _sellTexture: THREE.CanvasTexture | null = null;

function getBuyTexture(): THREE.CanvasTexture {
  if (!_buyTexture) _buyTexture = createGlowTexture('#00ff00');
  return _buyTexture;
}

function getSellTexture(): THREE.CanvasTexture {
  if (!_sellTexture) _sellTexture = createGlowTexture('#ff0000');
  return _sellTexture;
}

// ---------------------------------------------------------------------------
// useWindowSize Hook
// ---------------------------------------------------------------------------

function useWindowSize(): { width: number; height: number } {
  const [size, setSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return size;
}

// ---------------------------------------------------------------------------
// PumpFunGraph Component
// ---------------------------------------------------------------------------

interface PumpFunGraphProps {
  graphData: PumpGraphData;
}

export function PumpFunGraph({ graphData }: PumpFunGraphProps) {
  const { width, height } = useWindowSize();

  // Create CSS2DRenderer once and persist across renders
  const extraRenderers = useMemo(
    () => [new CSS2DRenderer() as unknown as THREE.WebGLRenderer],
    [],
  );

  // ------------------------------------------------------------------
  // nodeThreeObject: token → CSS2D pill badge,  trade → glow Sprite
  // ------------------------------------------------------------------
  const nodeThreeObject = useCallback((node: PumpNode) => {
    if (node.type === 'token') {
      const div = document.createElement('div');
      div.textContent = node.ticker ?? node.id.slice(0, 6);
      Object.assign(div.style, {
        padding: '3px 10px',
        borderRadius: '999px',
        background: 'rgba(15, 15, 25, 0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        color: '#ffffff',
        fontSize: '11px',
        fontFamily:
          "'SF Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace",
        fontWeight: '600',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        userSelect: 'none',
        textShadow: '0 0 6px rgba(255,255,255,0.25)',
      } satisfies Partial<CSSStyleDeclaration>);

      return new CSS2DObject(div);
    }

    // trade node → neon glow sprite
    const material = new THREE.SpriteMaterial({
      map: node.isBuy ? getBuyTexture() : getSellTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 3, 3);
    return sprite;
  }, []);

  return (
    <ForceGraph3D
      graphData={graphData}
      width={width}
      height={height}
      backgroundColor="#030303"
      showNavInfo={false}
      linkOpacity={0.02}
      extraRenderers={extraRenderers}
      nodeThreeObject={nodeThreeObject}
    />
  );
}

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from 'd3-force-3d';
import type { SimulationNodeDatum } from 'd3-force';

import type { PumpGraphData, PumpNode, PumpLink } from './types';

// ---------------------------------------------------------------------------
// Types for the 3D simulation
// ---------------------------------------------------------------------------

interface SimNode extends SimulationNodeDatum {
  id: string;
  type: 'token' | 'trade';
  ticker?: string;
  isBuy?: boolean;
  solAmount?: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
}

interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN_RADIUS = 2.0;
const TRADE_RADIUS = 0.3;
const CAMERA_DISTANCE = 80;
const ORBIT_SPEED = 0.08;
const ORBIT_RADIUS = 120;

// ---------------------------------------------------------------------------
// Simulation manager (runs outside React render cycle)
// ---------------------------------------------------------------------------

class PumpSimulation {
  nodes: SimNode[] = [];
  links: SimLink[] = [];
  private simulation: ReturnType<typeof forceSimulation>;
  private nodeMap = new Map<string, SimNode>();

  constructor() {
    this.simulation = forceSimulation([], 3)
      .numDimensions(3)
      .force('charge', forceManyBody().strength((d: SimNode) => (d.type === 'token' ? -80 : -2)))
      .force('center', forceCenter(0, 0, 0).strength(0.05))
      .force(
        'collide',
        forceCollide().radius((d: SimNode) => (d.type === 'token' ? TOKEN_RADIUS + 1 : TRADE_RADIUS + 0.1)).strength(0.4),
      )
      .force(
        'link',
        forceLink([])
          .id((d: SimNode) => d.id)
          .distance(8)
          .strength(0.3),
      )
      .alphaDecay(0.01)
      .velocityDecay(0.4);
  }

  update(graphData: PumpGraphData) {
    let changed = false;
    const seenIds = new Set<string>();

    for (const n of graphData.nodes) {
      seenIds.add(n.id);
      if (!this.nodeMap.has(n.id)) {
        const simNode: SimNode = {
          id: n.id,
          type: n.type,
          ticker: n.ticker,
          isBuy: n.isBuy,
          solAmount: n.solAmount,
        };
        this.nodeMap.set(n.id, simNode);
        this.nodes.push(simNode);
        changed = true;
      }
    }

    // Remove GC'd nodes
    const before = this.nodes.length;
    this.nodes = this.nodes.filter((n) => {
      if (seenIds.has(n.id)) return true;
      this.nodeMap.delete(n.id);
      return false;
    });
    if (this.nodes.length !== before) changed = true;

    if (changed) {
      this.links = graphData.links.map((l) => ({ source: l.source, target: l.target }));
      this.simulation.nodes(this.nodes);
      this.simulation.numDimensions(3);
      (this.simulation.force('link') as ReturnType<typeof forceLink>).links(this.links);
      this.simulation.alpha(0.3).restart();
    }
  }

  tick() {
    this.simulation.tick();
  }

  getNode(id: string): SimNode | undefined {
    return this.nodeMap.get(id);
  }

  dispose() {
    this.simulation.stop();
  }
}

// ---------------------------------------------------------------------------
// Token node mesh (sphere with emissive glow)
// ---------------------------------------------------------------------------

const TokenMesh = memo<{
  sim: PumpSimulation;
  nodeId: string;
  ticker?: string;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onClick: () => void;
}>(({ sim, nodeId, ticker, onPointerOver, onPointerOut, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const node = sim.getNode(nodeId);
    const mesh = meshRef.current;
    if (!node || !mesh) return;
    mesh.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
  });

  return (
    <mesh
      ref={meshRef}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <sphereGeometry args={[TOKEN_RADIUS, 24, 24]} />
      <meshStandardMaterial
        color="#9945FF"
        emissive="#9945FF"
        emissiveIntensity={0.6}
        roughness={0.3}
        metalness={0.1}
        transparent
        opacity={0.9}
        toneMapped={false}
      />
    </mesh>
  );
});
TokenMesh.displayName = 'TokenMesh';

// ---------------------------------------------------------------------------
// Trade nodes (instanced — many small particles)
// ---------------------------------------------------------------------------

const TradeNodes = memo<{ sim: PumpSimulation }>(({ sim }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const maxCount = 2000;

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const tradeNodes = sim.nodes.filter((n) => n.type === 'trade');
    mesh.count = Math.min(tradeNodes.length, maxCount);

    for (let i = 0; i < mesh.count; i++) {
      const n = tradeNodes[i];
      tempObj.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
      tempObj.scale.setScalar(TRADE_RADIUS);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);

      tempColor.set(n.isBuy ? '#00d395' : '#ff6b6b');
      mesh.setColorAt(i, tempColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0.0,
        emissive: new THREE.Color('#60a5fa'),
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.7,
        toneMapped: false,
      }),
    [],
  );

  return <instancedMesh ref={meshRef} args={[geometry, material, maxCount]} frustumCulled={false} />;
});
TradeNodes.displayName = 'TradeNodes';

// ---------------------------------------------------------------------------
// Edges (line segments between trades and tokens)
// ---------------------------------------------------------------------------

const Edges = memo<{ sim: PumpSimulation }>(({ sim }) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const maxSegments = 4000;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(maxSegments * 6), 3));
    return geo;
  }, []);

  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    let idx = 0;
    for (const link of sim.links) {
      if (idx >= maxSegments * 6) break;
      const src = typeof link.source === 'string' ? sim.getNode(link.source) : link.source;
      const tgt = typeof link.target === 'string' ? sim.getNode(link.target) : link.target;
      if (!src || !tgt) continue;

      arr[idx++] = src.x ?? 0;
      arr[idx++] = src.y ?? 0;
      arr[idx++] = src.z ?? 0;
      arr[idx++] = tgt.x ?? 0;
      arr[idx++] = tgt.y ?? 0;
      arr[idx++] = tgt.z ?? 0;
    }

    // Zero remaining
    arr.fill(0, idx);
    posAttr.needsUpdate = true;
    geometry.setDrawRange(0, idx / 3);
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color="#334155" transparent opacity={0.15} />
    </lineSegments>
  );
});
Edges.displayName = 'Edges';

// ---------------------------------------------------------------------------
// Scene: camera orbit, click logic, all 3D children
// ---------------------------------------------------------------------------

const PumpScene = memo<{
  sim: PumpSimulation;
  graphData: PumpGraphData;
}>(({ sim, graphData }) => {
  const cameraControlsRef = useRef<CameraControlsImpl>(null!);
  const [isCameraLocked, setIsCameraLocked] = useState(false);
  const orbitAngleRef = useRef(0);

  // Keep the simulation in sync with incoming data
  useEffect(() => {
    sim.update(graphData);
  }, [sim, graphData]);

  // --- Cinematic auto-orbit ---
  useFrame((_, delta) => {
    sim.tick();

    if (isCameraLocked) return;

    orbitAngleRef.current += ORBIT_SPEED * delta;
    const angle = orbitAngleRef.current;
    const x = Math.cos(angle) * ORBIT_RADIUS;
    const z = Math.sin(angle) * ORBIT_RADIUS;
    const y = 30 + Math.sin(angle * 0.5) * 15;

    cameraControlsRef.current?.setLookAt(x, y, z, 0, 0, 0, false);
  });

  // --- Token node list for rendering ---
  const tokenNodes = useMemo(
    () => graphData.nodes.filter((n) => n.type === 'token'),
    [graphData.nodes],
  );

  // --- Node-click camera zoom (token hubs only) ---
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const node = sim.getNode(nodeId);
      if (!node || node.type !== 'token') return;

      const nx = node.x ?? 0;
      const ny = node.y ?? 0;
      const nz = node.z ?? 0;

      // Offset camera slightly so the node doesn't clip
      const offsetX = nx;
      const offsetY = ny + CAMERA_DISTANCE * 0.25;
      const offsetZ = nz + CAMERA_DISTANCE;

      setIsCameraLocked(true);

      // Smooth tween over 1.5 seconds
      cameraControlsRef.current?.setLookAt(offsetX, offsetY, offsetZ, nx, ny, nz, true);
    },
    [sim],
  );

  // --- Background click: unlock camera ---
  const handleBackgroundClick = useCallback((e: THREE.Event) => {
    // Only trigger when clicking empty space (no object intersections)
    if ((e as unknown as { intersections?: unknown[] }).intersections?.length === 0) {
      setIsCameraLocked(false);
    }
  }, []);

  // --- Hover states: cursor polish ---
  const handlePointerOver = useCallback(() => {
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = 'default';
  }, []);

  return (
    <>
      <Environment preset="night" environmentIntensity={0.3} background={false} />
      <directionalLight position={[20, 40, 20]} intensity={0.3} />
      <directionalLight position={[-15, 25, -20]} intensity={0.15} color="#a78bfa" />
      <ambientLight intensity={0.1} />

      {/* Clickable background plane to detect void clicks */}
      <mesh
        position={[0, 0, -500]}
        onClick={handleBackgroundClick}
        visible={false}
      >
        <planeGeometry args={[5000, 5000]} />
        <meshBasicMaterial />
      </mesh>

      {/* Token hub spheres — clickable, hoverable */}
      {tokenNodes.map((n) => (
        <TokenMesh
          key={n.id}
          sim={sim}
          nodeId={n.id}
          ticker={n.ticker}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={() => handleNodeClick(n.id)}
        />
      ))}

      {/* Trade particles */}
      <TradeNodes sim={sim} />

      {/* Edges */}
      <Edges sim={sim} />

      <CameraControls
        ref={cameraControlsRef}
        minDistance={10}
        maxDistance={300}
        truckSpeed={0}
        mouseButtons={{ left: 1, middle: 0, right: 2, wheel: 8 }}
        touches={{ one: 32, two: 1024, three: 0 }}
      />
    </>
  );
});
PumpScene.displayName = 'PumpScene';

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface PumpFunGraphProps {
  graphData: PumpGraphData;
}

export default function PumpFunGraph({ graphData }: PumpFunGraphProps) {
  const sim = useMemo(() => new PumpSimulation(), []);

  useEffect(() => {
    return () => sim.dispose();
  }, [sim]);

  return (
    <Canvas
      camera={{ position: [0, 30, ORBIT_RADIUS], fov: 50, near: 0.1, far: 2000 }}
      gl={{ preserveDrawingBuffer: true, antialias: false, stencil: false }}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={() => {
        // Reset cursor when clicking empty canvas
        document.body.style.cursor = 'default';
      }}
    >
      <PumpScene sim={sim} graphData={graphData} />
    </Canvas>
  );
}
