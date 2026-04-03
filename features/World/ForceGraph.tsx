'use client';

import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
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

import { ProtocolLabel } from './ProtocolLabel';
import { COLOR_PALETTE, PROTOCOL_COLORS } from './constants';

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
          color: PROTOCOL_COLORS.default,
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

/** Individual hub node mesh — hover detection + protocol color transitions */
function HubNodeMesh({
  sim,
  nodeId,
  paletteIndex,
  isActive,
  isHovered,
  onPointerOver,
  onPointerOut,
  onClick,
}: {
  sim: ForceGraphSimulation;
  nodeId: string;
  paletteIndex: number;
  isActive: boolean;
  isHovered: boolean;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
  const targetColor = useRef(new THREE.Color(PROTOCOL_COLORS.default));
  const radiusRef = useRef(HUB_BASE_RADIUS);

  useEffect(() => {
    targetColor.current.set(
      isActive
        ? COLOR_PALETTE[paletteIndex % COLOR_PALETTE.length]
        : PROTOCOL_COLORS.default,
    );
  }, [isActive, paletteIndex]);

  useFrame((_, delta) => {
    const node = sim.nodeMap.get(nodeId);
    if (!node || !groupRef.current || !meshRef.current || !materialRef.current) return;
    groupRef.current.position.set(node.x ?? 0, 0, node.y ?? 0);
    meshRef.current.scale.setScalar(node.radius);
    radiusRef.current = node.radius;
    // Smooth ~300 ms color lerp (framerate-independent exponential approach)
    materialRef.current.color.lerp(targetColor.current, 1 - Math.exp(-10 * delta));
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
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      {isHovered && (
        <ProtocolLabel
          name={sim.nodeMap.get(nodeId)?.label ?? 'UNKNOWN'}
          position={[0, radiusRef.current + 1, 0]}
          visible
        />
      )}
    </group>
  );
}

/** InstancedMesh for agent nodes with active-protocol tinting */
const AgentNodes = memo<{ sim: ForceGraphSimulation; activeProtocol: string | null }>(
  ({ sim, activeProtocol }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const tempObj = useMemo(() => new THREE.Object3D(), []);
    const tempColor = useMemo(() => new THREE.Color(), []);
    const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
    const material = useMemo(
      () => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 }),
      [],
    );

    // Cache the active hub's brand color
    const activeColorRef = useRef<string | null>(null);
    useEffect(() => {
      if (!activeProtocol) {
        activeColorRef.current = null;
        return;
      }
      const hubs = sim.nodes.filter((n) => n.type === 'hub');
      const idx = hubs.findIndex((h) => h.id === activeProtocol);
      activeColorRef.current =
        idx >= 0 ? COLOR_PALETTE[idx % COLOR_PALETTE.length] : null;
    }, [activeProtocol, sim]);

    useFrame(() => {
      const mesh = meshRef.current;
      if (!mesh) return;

      const agents = sim.nodes.filter((n) => n.type === 'agent');
      const count = Math.min(agents.length, MAX_AGENT_NODES);
      mesh.count = count;

      const ac = activeColorRef.current;

      for (let i = 0; i < count; i++) {
        const node = agents[i];
        tempObj.position.set(node.x ?? 0, 0, node.y ?? 0);
        tempObj.scale.setScalar(node.radius);
        tempObj.updateMatrix();
        mesh.setMatrixAt(i, tempObj.matrix);

        // Tint agents connected to the active protocol hub
        if (ac && node.hubMint === activeProtocol) {
          tempColor.set(ac).multiplyScalar(0.7);
        } else {
          tempColor.set(node.color);
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
  },
);
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

const NetworkScene = memo<{
  sim: ForceGraphSimulation;
  topTokens: TopToken[];
  activeProtocol: string | null;
  onSelectProtocol: (mint: string | null) => void;
}>(({ sim, topTokens, activeProtocol, onSelectProtocol }) => {
  const [hoveredHub, setHoveredHub] = useState<string | null>(null);

  const hubIds = useMemo(
    () => topTokens.map((t) => ({ id: t.mint, label: t.symbol || t.name })),
    [topTokens],
  );

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
      {hubIds.map((hub, i) => (
        <HubNodeMesh
          key={hub.id}
          sim={sim}
          nodeId={hub.id}
          paletteIndex={i}
          isActive={activeProtocol === hub.id}
          isHovered={hoveredHub === hub.id}
          onPointerOver={() => setHoveredHub(hub.id)}
          onPointerOut={() => setHoveredHub(null)}
          onClick={() =>
            onSelectProtocol(activeProtocol === hub.id ? null : hub.id)
          }
        />
      ))}
      <AgentNodes sim={sim} activeProtocol={activeProtocol} />
      <Ground />
    </>
  );
});
NetworkScene.displayName = 'NetworkScene';

// ---------------------------------------------------------------------------
// Camera animation state (shared between CameraSetup and parent)
// ---------------------------------------------------------------------------

interface CameraAnimation {
  durationMs: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromLookAt: THREE.Vector3;
  toLookAt: THREE.Vector3;
  startedAt: number;
  onDone?: () => void;
}

interface CameraApi {
  animateTo: (pos: [number, number, number], lookAt: [number, number, number], durationMs: number) => Promise<void>;
  setOrbitEnabled: (enabled: boolean) => void;
}

/** Camera controller: top-down with pan/zoom, no rotation */
const CameraSetup = memo<{ apiRef: React.MutableRefObject<CameraApi | null> }>(({ apiRef }) => {
  const { camera } = useThree();
  const controlsRef = useRef<MapControlsImpl>(null);
  const animRef = useRef<CameraAnimation | null>(null);

  useEffect(() => {
    camera.position.set(0, 55, 12);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Expose camera API to parent via mutable ref
  useEffect(() => {
    apiRef.current = {
      animateTo: (pos, lookAt, durationMs) =>
        new Promise<void>((resolve) => {
          const fromPos = camera.position.clone();
          // Approximate current lookAt from camera direction
          const dir = new THREE.Vector3();
          camera.getWorldDirection(dir);
          const fromLookAt = fromPos.clone().add(dir.multiplyScalar(50));
          animRef.current = {
            durationMs,
            fromPos,
            toPos: new THREE.Vector3(...pos),
            fromLookAt,
            toLookAt: new THREE.Vector3(...lookAt),
            startedAt: performance.now(),
            onDone: resolve,
          };
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
  }, [apiRef, camera]);

  // Drive camera animation
  useFrame(() => {
    const anim = animRef.current;
    if (!anim) return;

    const elapsed = performance.now() - anim.startedAt;
    const t = Math.min(elapsed / anim.durationMs, 1);
    // ease-in-out cubic
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(anim.fromPos, anim.toPos, eased);
    const lookTarget = new THREE.Vector3().lerpVectors(anim.fromLookAt, anim.toLookAt, eased);
    camera.lookAt(lookTarget);

    if (controlsRef.current) {
      controlsRef.current.target.copy(lookTarget);
    }

    if (t >= 1) {
      animRef.current = null;
      anim.onDone?.();
    }
  });

  return (
    <MapControls
      ref={controlsRef}
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

export interface ForceGraphHandle {
  animateCameraTo: (request: { position: [number, number, number]; lookAt?: [number, number, number]; durationMs?: number }) => Promise<void>;
  focusHub: (index: number, durationMs?: number) => Promise<void>;
  getCanvasElement: () => HTMLCanvasElement | null;
  getHubCount: () => number;
  setOrbitEnabled: (enabled: boolean) => void;
}

const ForceGraphInner = forwardRef<ForceGraphHandle, ForceGraphProps>(function ForceGraph(
  { topTokens, traderEdges, height = '100%' },
  ref,
) {
  const simRef = useRef<ForceGraphSimulation | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraApiRef = useRef<CameraApi | null>(null);

  // Create simulation once
  if (!simRef.current) {
    simRef.current = new ForceGraphSimulation();
  }
  const sim = simRef.current;

  useImperativeHandle(ref, () => ({
    getCanvasElement: () => containerRef.current?.querySelector('canvas') ?? null,
    getHubCount: () => sim.nodes.filter((n) => n.type === 'hub').length,
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
      // Position camera above and slightly behind the hub
      await api.animateTo([x, 25, z + 12], [x, 0, z], durationMs);
    },
    setOrbitEnabled: (enabled) => {
      cameraApiRef.current?.setOrbitEnabled(enabled);
    },
  }));

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
    <div ref={containerRef} style={{ width: '100%', height, position: 'relative' }}>
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 500, position: [0, 55, 12] }}
        style={{ background: '#ffffff' }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        dpr={[1, 1.5]}
      >
        <CameraSetup apiRef={cameraApiRef} />
        <NetworkScene sim={sim} />
      </Canvas>
    </div>
  );
});

export default memo(ForceGraphInner);
