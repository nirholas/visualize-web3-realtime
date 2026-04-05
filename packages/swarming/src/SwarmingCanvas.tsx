'use client';

// ============================================================================
// swarming — SwarmingCanvas
//
// R3F Canvas wrapper that renders the force graph scene. Used internally
// by <Swarming /> and exported for advanced composition.
// ============================================================================

import React, { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { SwarmingSimulation } from './core/physics';
import type { ThemeConfig, SwarmingHandle } from './types';
import { SwarmingScene } from './core/ForceGraph';
import { PostProcessing } from './PostProcessing';
import { useMouseRepulsion } from './hooks/useMouseRepulsion';
import type { CameraConfig } from './defaults';
import { DEFAULT_CAMERA } from './defaults';
import { CameraSetup, SnapshotHelper, type CameraApi } from './SwarmingCanvasHelpers';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SwarmingCanvasProps {
  sim: SwarmingSimulation;
  theme: ThemeConfig;
  maxNodes: number;
  camera?: CameraConfig;
  showLabels?: boolean;
  bloom?: boolean;
  interactive?: boolean;
  onFrame?: () => void;
}

// ---------------------------------------------------------------------------
// Inner scene with hooks (must be inside Canvas)
// ---------------------------------------------------------------------------

const InnerScene = memo<{
  sim: SwarmingSimulation;
  theme: ThemeConfig;
  maxNodes: number;
  showLabels: boolean;
  interactive: boolean;
  bloom: boolean;
  cameraApiRef: React.MutableRefObject<CameraApi | null>;
  snapshotRef: React.MutableRefObject<(() => string | null) | null>;
}>(({ sim, theme, maxNodes, showLabels, interactive, bloom, cameraApiRef, snapshotRef }) => {
  useMouseRepulsion(sim, interactive);

  return (
    <>
      <CameraSetup apiRef={cameraApiRef} initialPosition={DEFAULT_CAMERA.position} />
      <SnapshotHelper snapshotRef={snapshotRef} />
      <SwarmingScene
        sim={sim}
        theme={theme}
        maxNodes={maxNodes}
        showLabels={showLabels}
      />
      <PostProcessing
        enabled={bloom}
        bloomIntensity={theme.bloomIntensity}
        bloomThreshold={theme.bloomThreshold}
      />
    </>
  );
});
InnerScene.displayName = 'InnerScene';

// ---------------------------------------------------------------------------
// Main canvas component
// ---------------------------------------------------------------------------

const SwarmingCanvas = forwardRef<SwarmingHandle, SwarmingCanvasProps>(function SwarmingCanvas(
  {
    sim,
    theme,
    maxNodes,
    camera,
    showLabels = true,
    bloom = true,
    interactive = true,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraApiRef = useRef<CameraApi | null>(null);
  const snapshotRef = useRef<(() => string | null) | null>(null);

  const fov = camera?.fov ?? DEFAULT_CAMERA.fov;
  const cameraPosition = camera?.position ?? DEFAULT_CAMERA.position;

  useImperativeHandle(ref, () => ({
    animateCameraTo: async (position, lookAt, durationMs) => {
      const api = cameraApiRef.current;
      if (!api) return;
      await api.animateTo(position, lookAt ?? [0, 0, 0], durationMs ?? 1200);
    },
    focusGroup: async (index, durationMs = 1200) => {
      const api = cameraApiRef.current;
      if (!api) return;
      const hubs = sim.nodes.filter((n) => n.type === 'hub');
      const hub = hubs[index];
      if (!hub) return;
      const hx = hub.x ?? 0;
      const hy = hub.y ?? 0;
      const hz = hub.z ?? 0;
      await api.animateTo([hx, hy + 15, hz + 12], [hx, hy, hz], durationMs);
    },
    getCanvasElement: () => containerRef.current?.querySelector('canvas') ?? null,
    takeSnapshot: () => snapshotRef.current?.() ?? null,
    reheat: (alpha?: number) => sim.reheat(alpha),
  }));

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ fov, near: 0.1, far: 500, position: cameraPosition }}
        style={{ background: theme.background }}
        gl={{ antialias: false, alpha: false, stencil: false }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <InnerScene
          sim={sim}
          theme={theme}
          maxNodes={maxNodes}
          showLabels={showLabels}
          interactive={interactive}
          bloom={bloom}
          cameraApiRef={cameraApiRef}
          snapshotRef={snapshotRef}
        />
      </Canvas>
    </div>
  );
});

const SwarmingCanvasMemo = memo(SwarmingCanvas);
export { SwarmingCanvasMemo as SwarmingCanvas };
