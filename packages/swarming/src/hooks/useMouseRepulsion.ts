import { useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SwarmingSimulation } from '../core/physics';
import { SpatialHash } from '../core/SpatialHash';

const REPULSION_RADIUS = 8;
const REPULSION_STRENGTH = 0.15;

/**
 * Hook that repels nearby nodes from the mouse cursor in 3D space.
 *
 * Projects the mouse position onto a plane at z=0 using raycasting,
 * then uses a spatial hash for O(1) neighbor lookups to apply
 * velocity nudges to nearby nodes.
 */
export function useMouseRepulsion(
  sim: SwarmingSimulation,
  enabled: boolean,
): void {
  const { camera, size } = useThree();
  const mouseRef = useRef(new THREE.Vector2());
  const worldRef = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const spatialHash = useRef(new SpatialHash(REPULSION_RADIUS));

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      mouseRef.current.x = (e.clientX / size.width) * 2 - 1;
      mouseRef.current.y = -(e.clientY / size.height) * 2 + 1;
    },
    [size],
  );

  // Attach pointer listener
  useFrame(({ gl }) => {
    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => canvas.removeEventListener('pointermove', onPointerMove);
  });

  useFrame(() => {
    if (!enabled) return;

    raycaster.current.setFromCamera(mouseRef.current, camera);
    const hit = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, hit)) return;
    worldRef.current.copy(hit);

    const mx = worldRef.current.x;
    const my = worldRef.current.y;
    const mz = worldRef.current.z;

    // Rebuild spatial hash each frame (nodes are moving)
    const hash = spatialHash.current;
    hash.clear();
    for (let i = 0; i < sim.nodes.length; i++) {
      const n = sim.nodes[i];
      hash.insert(i, n.x ?? 0, n.y ?? 0, n.z ?? 0);
    }

    const nearby = hash.query(mx, my, mz, REPULSION_RADIUS);
    for (const idx of nearby) {
      const node = sim.nodes[idx];
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;
      const nz = node.z ?? 0;
      const dx = nx - mx;
      const dy = ny - my;
      const dz = nz - mz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 0.01 || dist > REPULSION_RADIUS) continue;

      const force = REPULSION_STRENGTH * (1 - dist / REPULSION_RADIUS);
      node.vx = (node.vx ?? 0) + (dx / dist) * force;
      node.vy = (node.vy ?? 0) + (dy / dist) * force;
      node.vz = (node.vz ?? 0) + (dz / dist) * force;
    }
  });
}
