'use client';

import React, {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, MapControls } from '@react-three/drei';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { ForceGraphSimulation, type ForceGraphConfig, type TopToken, type TraderEdge, type GraphHandle } from '@web3viz/core';

// ============================================================================
// Constants
// ============================================================================

const MAX_AGENT_NODES = 5000;

// ============================================================================
// Configuration
// ============================================================================

export interface ForceGraphProps {
  topTokens?: TopToken[];
  traderEdges?: TraderEdge[];
  height?: string | number;
  /** Canvas background color */
  background?: string;
  /** Ground plane color */
  groundColor?: string;
  /** Configuration for the force simulation engine */
  simulationConfig?: ForceGraphConfig;
  /** Whether to show hub labels */
  showLabels?: boolean;
  /** Whether to show the ground plane */
  showGround?: boolean;
  /** Camera field of view */
  fov?: number;
  /** Initial camera position */
  cameraPosition?: [number, number, number];
  /** Label styles */
  labelStyle?: React.CSSProperties;
}

// ============================================================================
// Sub-components: instanced meshes for performance
// ============================================================================

const HubNodes = memo<{ sim: ForceGraphSimulation }>(({ sim }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
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
    <instancedMesh ref={meshRef} args={[geometry, material, 20]} frustumCulled={false} />
  );
});
HubNodes.displayName = 'HubNodes';

const HubLabels = memo<{ sim: ForceGraphSimulation; labelStyle?: React.CSSProperties }>(
  ({ sim, labelStyle }) => {
    const groupRef = useRef<THREE.Group>(null);
    const labelsRef = useRef<{ id: string; label: string; x: number; z: number; radius: number }[]>([]);
    const [labels, setLabels] = useState<typeof labelsRef.current>([]);

    useFrame(() => {
      const hubs = sim.nodes.filter((n) => n.type === 'hub');
      labelsRef.current = hubs.map((h) => ({
        id: h.id,
        label: h.label,
        x: h.x ?? 0,
        z: h.y ?? 0,
        radius: h.radius,
      }));
      if (Math.random() < 0.15) {
        setLabels([...labelsRef.current]);
      }
    });

    return (
      <group ref={groupRef}>
        {labels.map((l) => (
          <Html key={l.id} position={[l.x, l.radius + 0.5, l.z]} center distanceFactor={50} style={{ pointerEvents: 'none' }}>
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
                ...labelStyle,
              }}
            >
              {l.label}
            </div>
          </Html>
        ))}
      </group>
    );
  },
);
HubLabels.displayName = 'HubLabels';

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
    <instancedMesh ref={meshRef} args={[geometry, material, MAX_AGENT_NODES]} frustumCulled={false} />
  );
});
AgentNodes.displayName = 'AgentNodes';

const Edges = memo<{ sim: ForceGraphSimulation }>(({ sim }) => {
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
      const src = edge.source as any;
      const tgt = edge.target as any;
      const idx = i * 6;

      pA.array[idx] = src.x ?? 0;
      pA.array[idx + 1] = 0;
      pA.array[idx + 2] = src.y ?? 0;
      pA.array[idx + 3] = tgt.x ?? 0;
      pA.array[idx + 4] = 0;
      pA.array[idx + 5] = tgt.y ?? 0;

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

const Ground = memo<{ color?: string }>(({ color = '#f8f8fa' }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
    <planeGeometry args={[200, 200]} />
    <meshStandardMaterial color={color} />
  </mesh>
));
Ground.displayName = 'Ground';

// ============================================================================
// Scene
// ============================================================================

const NetworkScene = memo<{
  sim: ForceGraphSimulation;
  showLabels: boolean;
  showGround: boolean;
  groundColor: string;
  labelStyle?: React.CSSProperties;
}>(({ sim, showLabels, showGround, groundColor, labelStyle }) => {
  useFrame(() => { sim.tick(); });

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[20, 40, 20]} intensity={0.6} />
      <Edges sim={sim} />
      <HubNodes sim={sim} />
      <AgentNodes sim={sim} />
      {showLabels && <HubLabels sim={sim} labelStyle={labelStyle} />}
      {showGround && <Ground color={groundColor} />}
    </>
  );
});
NetworkScene.displayName = 'NetworkScene';

// ============================================================================
// Camera
// ============================================================================

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

const CameraSetup = memo<{
  apiRef: React.MutableRefObject<CameraApi | null>;
  initialPosition?: [number, number, number];
}>(({ apiRef, initialPosition = [0, 55, 12] }) => {
  const { camera } = useThree();
  const controlsRef = useRef<MapControlsImpl>(null);
  const animRef = useRef<CameraAnimation | null>(null);

  useEffect(() => {
    camera.position.set(...initialPosition);
    camera.lookAt(0, 0, 0);
  }, [camera, initialPosition]);

  useEffect(() => {
    apiRef.current = {
      animateTo: (pos, lookAt, durationMs) =>
        new Promise<void>((resolve) => {
          const fromPos = camera.position.clone();
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
        if (controlsRef.current) controlsRef.current.enabled = enabled;
      },
    };
    return () => { apiRef.current = null; };
  }, [apiRef, camera]);

  useFrame(() => {
    const anim = animRef.current;
    if (!anim) return;

    const elapsed = performance.now() - anim.startedAt;
    const t = Math.min(elapsed / anim.durationMs, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(anim.fromPos, anim.toPos, eased);
    const lookTarget = new THREE.Vector3().lerpVectors(anim.fromLookAt, anim.toLookAt, eased);
    camera.lookAt(lookTarget);
    if (controlsRef.current) controlsRef.current.target.copy(lookTarget);

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

// ============================================================================
// Main ForceGraph component
// ============================================================================

const ForceGraph = forwardRef<GraphHandle, ForceGraphProps>(function ForceGraph(
  {
    topTokens = [],
    traderEdges = [],
    height = '100%',
    background = '#ffffff',
    groundColor = '#f8f8fa',
    simulationConfig,
    showLabels = true,
    showGround = true,
    fov = 45,
    cameraPosition = [0, 55, 12],
    labelStyle,
  },
  ref,
) {
  const simRef = useRef<ForceGraphSimulation | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraApiRef = useRef<CameraApi | null>(null);

  if (!simRef.current) {
    simRef.current = new ForceGraphSimulation(simulationConfig);
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
      await api.animateTo([x, 25, z + 12], [x, 0, z], durationMs);
    },
    setOrbitEnabled: (enabled) => {
      cameraApiRef.current?.setOrbitEnabled(enabled);
    },
  }));

  const tokenKey = topTokens.map((t) => `${t.mint}:${t.trades}`).join(',');
  const edgeCount = traderEdges.length;
  useEffect(() => {
    sim.update(topTokens, traderEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenKey, edgeCount]);

  useEffect(() => {
    return () => { simRef.current?.dispose(); };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height, position: 'relative' }}>
      <Canvas
        camera={{ fov, near: 0.1, far: 500, position: cameraPosition }}
        style={{ background }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        dpr={[1, 1.5]}
      >
        <CameraSetup apiRef={cameraApiRef} initialPosition={cameraPosition} />
        <NetworkScene
          sim={sim}
          showLabels={showLabels}
          showGround={showGround}
          groundColor={groundColor}
          labelStyle={labelStyle}
        />
      </Canvas>
    </div>
  );
});

export default memo(ForceGraph);
