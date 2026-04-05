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
import { ContactShadows, Environment, Html, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { ForceGraphSimulation, type ForceGraphConfig, type TopToken, type TraderEdge, type GraphHandle } from '@web3viz/core';
import PostProcessing, { type PostProcessingProps } from './PostProcessing';
import { useWebGPUSimulation } from './renderers/useWebGPUSimulation';
import { configureWebGLRenderer } from './renderers/webgl';
import type { RendererType } from './renderers/auto-detect';

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
  /** Whether to show the ground plane (default false for volumetric layout) */
  showGround?: boolean;
  /** Camera field of view */
  fov?: number;
  /** Initial camera position */
  cameraPosition?: [number, number, number];
  /** Label styles */
  labelStyle?: React.CSSProperties;
  /** Whether to show soft contact shadows beneath objects (default true) */
  showShadows?: boolean;
  /** Post-processing configuration */
  postProcessing?: PostProcessingProps;
  /**
   * Renderer backend:
   * - 'auto': Detect WebGPU, fall back to WebGL (default)
   * - 'webgpu': Force WebGPU (error if unavailable)
   * - 'webgl': Force WebGL (current behavior)
   */
  renderer?: RendererType;
  /** Called when the active renderer is determined */
  onRendererReady?: (activeRenderer: 'webgpu' | 'webgl') => void;
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
    () => new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.1,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 2.0,
      envMapIntensity: 1.2,
      toneMapped: false,
    }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const hubs = sim.nodes.filter((n) => n.type === 'hub');
    mesh.count = hubs.length;

    for (let i = 0; i < hubs.length; i++) {
      const node = hubs[i];
      tempObj.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
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
    const labelsRef = useRef<{ id: string; label: string; x: number; y: number; z: number; radius: number }[]>([]);
    const [labels, setLabels] = useState<typeof labelsRef.current>([]);

    useFrame(() => {
      const hubs = sim.nodes.filter((n) => n.type === 'hub');
      labelsRef.current = hubs.map((h) => ({
        id: h.id,
        label: h.label,
        x: h.x ?? 0,
        y: h.y ?? 0,
        z: h.z ?? 0,
        radius: h.radius,
      }));
      if (Math.random() < 0.15) {
        setLabels([...labelsRef.current]);
      }
    });

    return (
      <group ref={groupRef}>
        {labels.map((l) => (
          <Html key={l.id} position={[l.x, l.y + l.radius + 0.5, l.z]} center distanceFactor={50} style={{ pointerEvents: 'none' }}>
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
    () => new THREE.MeshStandardMaterial({
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

    const agents = sim.nodes.filter((n) => n.type === 'agent');
    const count = Math.min(agents.length, MAX_AGENT_NODES);
    mesh.count = count;

    for (let i = 0; i < count; i++) {
      const node = agents[i];
      tempObj.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
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
      pA.array[idx + 1] = src.y ?? 0;
      pA.array[idx + 2] = src.z ?? 0;
      pA.array[idx + 3] = tgt.x ?? 0;
      pA.array[idx + 4] = tgt.y ?? 0;
      pA.array[idx + 5] = tgt.z ?? 0;

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
      <lineBasicMaterial vertexColors transparent opacity={0.45} toneMapped={false} />
    </lineSegments>
  );
});
Edges.displayName = 'Edges';

const Ground = memo<{ color?: string }>(({ color = '#f8f8fa' }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
    <planeGeometry args={[200, 200]} />
    <meshPhysicalMaterial
      color={color}
      roughness={0.85}
      metalness={0.0}
      clearcoat={0.05}
      clearcoatRoughness={0.9}
    />
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
  showShadows: boolean;
  groundColor: string;
  labelStyle?: React.CSSProperties;
  onTick?: () => void;
}>(({ sim, showLabels, showGround, showShadows, groundColor, labelStyle, onTick }) => {
  useFrame(() => { if (onTick) onTick(); else sim.tick(); });

  return (
    <>
      <Environment preset="studio" environmentIntensity={0.4} background={false} />
      <directionalLight position={[20, 40, 20]} intensity={0.3} />
      <Edges sim={sim} />
      <HubNodes sim={sim} />
      <AgentNodes sim={sim} />
      {showLabels && <HubLabels sim={sim} labelStyle={labelStyle} />}
      {showGround && (
        <>
          <Ground color={groundColor} />
          {showShadows && (
            <ContactShadows
              position={[0, -0.49, 0]}
              scale={100}
              blur={2.5}
              far={4}
              opacity={0.35}
              resolution={256}
              color="#000000"
            />
          )}
        </>
      )}
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
  const controlsRef = useRef<OrbitControlsImpl>(null);
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
    <OrbitControls
      ref={controlsRef}
      enableRotate
      enableDamping
      dampingFactor={0.15}
      minDistance={10}
      maxDistance={150}
      enablePan
    />
  );
});
CameraSetup.displayName = 'CameraSetup';

// ============================================================================
// Snapshot helper — captures R3F context for synchronous WebGL screenshots
// ============================================================================

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
    showGround = false,
    showShadows = false,
    fov = 45,
    cameraPosition = [0, 55, 12],
    labelStyle,
    postProcessing,
    renderer = 'auto',
    onRendererReady,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraApiRef = useRef<CameraApi | null>(null);
  const snapshotRef = useRef<(() => string | null) | null>(null);

  // Use the WebGPU-aware simulation hook
  const gpuSim = useWebGPUSimulation(renderer, simulationConfig);
  const sim = gpuSim.sim;

  // Notify parent when renderer is determined
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (notifiedRef.current) return;
    const active = gpuSim.gpuActive ? 'webgpu' : 'webgl';
    if (renderer === 'webgl' || gpuSim.gpuActive) {
      notifiedRef.current = true;
      onRendererReady?.(active);
    }
  }, [gpuSim.gpuActive, renderer, onRendererReady]);

  useImperativeHandle(ref, () => ({
    getCanvasElement: () => containerRef.current?.querySelector('canvas') ?? null,
    getHubCount: () => sim.nodes.filter((n: any) => n.type === 'hub').length,
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
      const hubs = sim.nodes.filter((n: any) => n.type === 'hub');
      const hub = hubs[index];
      if (!hub) return;
      const hx = hub.x ?? 0;
      const hy = hub.y ?? 0;
      const hz = hub.z ?? 0;
      await api.animateTo([hx, hy + 15, hz + 12], [hx, hy, hz], durationMs);
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
    gpuSim.update(topTokens, traderEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenKey, edgeCount]);

  useEffect(() => {
    return () => { gpuSim.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height, position: 'relative' }}>
      <Canvas
        camera={{ fov, near: 0.1, far: 500, position: cameraPosition }}
        style={{ background }}
        gl={{ antialias: false, alpha: false, stencil: false }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          configureWebGLRenderer(gl);
        }}
      >
        <CameraSetup apiRef={cameraApiRef} initialPosition={cameraPosition} />
        <SnapshotHelper snapshotRef={snapshotRef} />
        <NetworkScene
          sim={sim}
          showLabels={showLabels}
          showGround={showGround}
          showShadows={showShadows}
          groundColor={groundColor}
          labelStyle={labelStyle}
          onTick={gpuSim.tick}
        />
        <PostProcessing {...postProcessing} />
      </Canvas>
    </div>
  );
});

export default memo(ForceGraph);
