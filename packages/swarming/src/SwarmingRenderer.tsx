// ============================================================================
// SwarmingRenderer — Standalone React component for the UMD bundle
//
// Self-contained Three.js force graph renderer. Does NOT depend on
// @web3viz/react-graph at runtime — it inlines the necessary rendering
// logic so the UMD bundle has zero workspace peer dependencies.
// ============================================================================

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, OrbitControls } from '@react-three/drei';
import { EffectComposer, SMAA, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import {
  ForceGraphSimulation,
  type ForceGraphConfig,
  type TopToken,
  type TraderEdge,
} from '@web3viz/core';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_AGENT_NODES = 5000;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SwarmingRendererProps {
  topTokens: TopToken[];
  traderEdges: TraderEdge[];
  background: string;
  groundColor: string;
  simulationConfig?: ForceGraphConfig;
  showLabels?: boolean;
  fov?: number;
  cameraPosition?: [number, number, number];
  postProcessing?: { enabled?: boolean; bloomIntensity?: number; bloomThreshold?: number };
  onReady?: () => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const HubNodes = memo<{ sim: ForceGraphSimulation }>(({ sim }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
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

  return <instancedMesh ref={meshRef} args={[geometry, material, 100]} frustumCulled={false} />;
});
HubNodes.displayName = 'HubNodes';

const AgentNodes = memo<{ sim: ForceGraphSimulation }>(({ sim }) => {
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

const HubLabels = memo<{ sim: ForceGraphSimulation }>(({ sim }) => {
  const labelsRef = useRef<
    { id: string; label: string; x: number; y: number; z: number; radius: number }[]
  >([]);
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
    if (Math.random() < 0.15) setLabels([...labelsRef.current]);
  });

  return (
    <group>
      {labels.map((l) => (
        <Html
          key={l.id}
          position={[l.x, l.y + l.radius + 0.5, l.z]}
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

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

const NetworkScene = memo<{
  sim: ForceGraphSimulation;
  showLabels: boolean;
}>(({ sim, showLabels }) => {
  useFrame(() => {
    sim.tick();
  });

  return (
    <>
      <Environment preset="studio" environmentIntensity={0.4} background={false} />
      <directionalLight position={[20, 40, 20]} intensity={0.3} />
      <Edges sim={sim} />
      <HubNodes sim={sim} />
      <AgentNodes sim={sim} />
      {showLabels && <HubLabels sim={sim} />}
    </>
  );
});
NetworkScene.displayName = 'NetworkScene';

// ---------------------------------------------------------------------------
// Post-processing
// ---------------------------------------------------------------------------

const PostFX = memo<{
  enabled: boolean;
  bloomIntensity: number;
  bloomThreshold: number;
}>(({ enabled, bloomIntensity, bloomThreshold }) => {
  if (!enabled) return null;
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.2}
        mipmapBlur
      />
    </EffectComposer>
  );
});
PostFX.displayName = 'PostFX';

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

const CameraSetup = memo<{ initialPosition: [number, number, number] }>(
  ({ initialPosition }) => {
    const { camera } = useThree();

    useEffect(() => {
      camera.position.set(...initialPosition);
      camera.lookAt(0, 0, 0);
    }, [camera, initialPosition]);

    return (
      <OrbitControls
        enableRotate
        enableDamping
        dampingFactor={0.15}
        minDistance={10}
        maxDistance={150}
        enablePan
      />
    );
  },
);
CameraSetup.displayName = 'CameraSetup';

// ---------------------------------------------------------------------------
// Ready notifier
// ---------------------------------------------------------------------------

const ReadyNotifier = memo<{ onReady?: () => void }>(({ onReady }) => {
  const called = useRef(false);
  useFrame(() => {
    if (!called.current && onReady) {
      called.current = true;
      // Defer to next microtask so the scene is painted
      Promise.resolve().then(onReady);
    }
  });
  return null;
});
ReadyNotifier.displayName = 'ReadyNotifier';

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

function SwarmingRenderer({
  topTokens,
  traderEdges,
  background,
  groundColor: _groundColor,
  simulationConfig,
  showLabels = true,
  fov = 45,
  cameraPosition = [0, 55, 12],
  postProcessing,
  onReady,
}: SwarmingRendererProps) {
  const simRef = useRef<ForceGraphSimulation | null>(null);

  if (!simRef.current) {
    simRef.current = new ForceGraphSimulation(simulationConfig);
  }
  const sim = simRef.current;

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

  const pp = postProcessing ?? { enabled: true, bloomIntensity: 1.2, bloomThreshold: 0.85 };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ fov, near: 0.1, far: 500, position: cameraPosition }}
        style={{ background }}
        gl={{ antialias: false, alpha: false, stencil: false }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <CameraSetup initialPosition={cameraPosition} />
        <ReadyNotifier onReady={onReady} />
        <NetworkScene sim={sim} showLabels={showLabels} />
        <PostFX
          enabled={pp.enabled !== false}
          bloomIntensity={pp.bloomIntensity ?? 1.2}
          bloomThreshold={pp.bloomThreshold ?? 0.85}
        />
      </Canvas>
    </div>
  );
}

export default memo(SwarmingRenderer);
