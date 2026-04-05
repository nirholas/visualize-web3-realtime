import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SwarmingSimulation } from '../core/physics';
import { SpatialHash } from '../core/SpatialHash';

const PROXIMITY_RADIUS = 6;
const MAX_PROXIMITY_LINES = 3000;

/**
 * Hook that renders faint lines between nodes that are spatially close.
 *
 * Returns a ref to attach to a `<lineSegments>` element.
 * Updates the line geometry each frame using a spatial hash.
 */
export function useProximityLines(
  sim: SwarmingSimulation,
  enabled: boolean,
): React.RefObject<THREE.LineSegments | null> {
  const lineRef = useRef<THREE.LineSegments | null>(null);
  const posAttr = useRef<THREE.Float32BufferAttribute | null>(null);
  const colorAttr = useRef<THREE.Float32BufferAttribute | null>(null);
  const spatialHash = useRef(new SpatialHash(PROXIMITY_RADIUS));

  useEffect(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PROXIMITY_LINES * 6);
    const colors = new Float32Array(MAX_PROXIMITY_LINES * 6);
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
    if (!enabled) return;
    const pA = posAttr.current;
    const cA = colorAttr.current;
    if (!pA || !cA || !lineRef.current) return;

    const hash = spatialHash.current;
    hash.clear();
    for (let i = 0; i < sim.nodes.length; i++) {
      const n = sim.nodes[i];
      hash.insert(i, n.x ?? 0, n.y ?? 0, n.z ?? 0);
    }

    let lineCount = 0;
    const seen = new Set<string>();

    for (let i = 0; i < sim.nodes.length && lineCount < MAX_PROXIMITY_LINES; i++) {
      const a = sim.nodes[i];
      const ax = a.x ?? 0;
      const ay = a.y ?? 0;
      const az = a.z ?? 0;
      const nearby = hash.query(ax, ay, az, PROXIMITY_RADIUS);

      for (const j of nearby) {
        if (j <= i) continue;
        if (lineCount >= MAX_PROXIMITY_LINES) break;
        const key = `${i}:${j}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const b = sim.nodes[j];
        const bx = b.x ?? 0;
        const by = b.y ?? 0;
        const bz = b.z ?? 0;
        const dist = Math.sqrt(
          (ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2,
        );
        if (dist > PROXIMITY_RADIUS) continue;

        const idx = lineCount * 6;
        pA.array[idx] = ax;
        pA.array[idx + 1] = ay;
        pA.array[idx + 2] = az;
        pA.array[idx + 3] = bx;
        pA.array[idx + 4] = by;
        pA.array[idx + 5] = bz;

        const alpha = 0.15 * (1 - dist / PROXIMITY_RADIUS);
        cA.array[idx] = alpha;
        cA.array[idx + 1] = alpha;
        cA.array[idx + 2] = alpha;
        cA.array[idx + 3] = alpha;
        cA.array[idx + 4] = alpha;
        cA.array[idx + 5] = alpha;

        lineCount++;
      }
    }

    pA.needsUpdate = true;
    cA.needsUpdate = true;
    lineRef.current.geometry.setDrawRange(0, lineCount * 2);
  });

  return lineRef;
}
