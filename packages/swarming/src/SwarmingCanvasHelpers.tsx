'use client';

// ============================================================================
// swarming — Camera & snapshot helpers
//
// R3F sub-components that must live inside a Canvas context.
// Extracted to a separate file so both Swarming.tsx and SwarmingCanvas.tsx
// can import them without circular dependencies.
// ============================================================================

import React, { memo, useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Camera animation
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

export interface CameraApi {
  animateTo: (
    pos: [number, number, number],
    lookAt: [number, number, number],
    durationMs: number,
  ) => Promise<void>;
  setOrbitEnabled: (enabled: boolean) => void;
}

export const CameraSetup = memo<{
  apiRef: React.MutableRefObject<CameraApi | null>;
  initialPosition: [number, number, number];
}>(({ apiRef, initialPosition }) => {
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
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, camera]);

  useFrame(() => {
    const anim = animRef.current;
    if (!anim) return;

    const elapsed = performance.now() - anim.startedAt;
    const t = Math.min(elapsed / anim.durationMs, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(anim.fromPos, anim.toPos, eased);
    const lookTarget = new THREE.Vector3().lerpVectors(
      anim.fromLookAt,
      anim.toLookAt,
      eased,
    );
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

// ---------------------------------------------------------------------------
// Snapshot helper
// ---------------------------------------------------------------------------

export const SnapshotHelper = memo<{
  snapshotRef: React.MutableRefObject<(() => string | null) | null>;
}>(({ snapshotRef }) => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    snapshotRef.current = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png', 1.0);
    };
    return () => {
      snapshotRef.current = null;
    };
  }, [gl, scene, camera, snapshotRef]);

  return null;
});
SnapshotHelper.displayName = 'SnapshotHelper';
