import { memo, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SwarmingSimulation } from './physics';
import { HubNodes, LeafNodes } from './InstancedNodes';
import type { ThemeConfig } from '../types';

// ---------------------------------------------------------------------------
// Edges — dynamic line segments updated each frame
// ---------------------------------------------------------------------------

const Edges = memo<{ sim: SwarmingSimulation; theme: ThemeConfig }>(
  ({ sim, theme }) => {
    const lineRef = useRef<THREE.LineSegments>(null);
    const posAttr = useRef<THREE.Float32BufferAttribute | null>(null);
    const colorAttr = useRef<THREE.Float32BufferAttribute | null>(null);
    const maxEdges = 20_000;

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

      const hubEdgeCol = new THREE.Color(theme.hubEdgeColor);
      const leafEdgeCol = new THREE.Color(theme.leafEdgeColor);

      for (let i = 0; i < count; i++) {
        const edge = edges[i];
        const src = edge.source as { x?: number; y?: number; z?: number; type?: string };
        const tgt = edge.target as { x?: number; y?: number; z?: number; type?: string };
        const idx = i * 6;

        pA.array[idx] = src.x ?? 0;
        pA.array[idx + 1] = src.y ?? 0;
        pA.array[idx + 2] = src.z ?? 0;
        pA.array[idx + 3] = tgt.x ?? 0;
        pA.array[idx + 4] = tgt.y ?? 0;
        pA.array[idx + 5] = tgt.z ?? 0;

        const isHubEdge = src.type === 'hub' && tgt.type === 'hub';
        const col = isHubEdge ? hubEdgeCol : leafEdgeCol;
        cA.array[idx] = col.r;
        cA.array[idx + 1] = col.g;
        cA.array[idx + 2] = col.b;
        cA.array[idx + 3] = col.r;
        cA.array[idx + 4] = col.g;
        cA.array[idx + 5] = col.b;
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
  },
);
Edges.displayName = 'Edges';

// ---------------------------------------------------------------------------
// Hub Labels — HTML overlays that track hub positions
// ---------------------------------------------------------------------------

const HubLabels = memo<{ sim: SwarmingSimulation; theme: ThemeConfig }>(
  ({ sim, theme }) => {
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
      // Update React state at ~9 FPS to avoid excessive re-renders
      if (Math.random() < 0.15) {
        setLabels([...labelsRef.current]);
      }
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
                color: theme.labelColor,
                background: theme.labelBackground,
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
  },
);
HubLabels.displayName = 'HubLabels';

// ---------------------------------------------------------------------------
// Scene — composes all rendering elements
// ---------------------------------------------------------------------------

export const SwarmingScene = memo<{
  sim: SwarmingSimulation;
  theme: ThemeConfig;
  maxNodes: number;
  showLabels: boolean;
}>(({ sim, theme, maxNodes, showLabels }) => {
  useFrame(() => {
    sim.tick();
  });

  return (
    <>
      <Environment preset="studio" environmentIntensity={0.4} background={false} />
      <directionalLight position={[20, 40, 20]} intensity={0.3} />
      <Edges sim={sim} theme={theme} />
      <HubNodes sim={sim} emissiveIntensity={theme.hubEmissive} />
      <LeafNodes sim={sim} maxNodes={maxNodes} emissiveIntensity={theme.leafEmissive} />
      {showLabels && <HubLabels sim={sim} theme={theme} />}
    </>
  );
});
SwarmingScene.displayName = 'SwarmingScene';
