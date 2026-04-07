'use client';

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { ForceGraphSimulation, ForceNode } from '../ForceGraph';
import { GRAPH_CONFIG } from '../constants';

const { PARTICLE_COUNT, PARTICLE_SPEED } = GRAPH_CONFIG;

/** Animated edge particles — glowing dots flowing along edges (agent → hub) */
export const EdgeParticles = memo(({ sim, isDark = true }: { sim: ForceGraphSimulation; isDark?: boolean }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 6, 6), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.2,
        metalness: 0.0,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: isDark ? 3.0 : 1.0,
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
      }),
    [isDark],
  );

  // Per-particle state: edge index + phase (0..1 along edge)
  const particleState = useRef<{ edgeIdx: number; phase: number; speed: number }[]>([]);

  // Initialize particle assignments
  useEffect(() => {
    const state: { edgeIdx: number; phase: number; speed: number }[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      state.push({
        edgeIdx: Math.floor(Math.random() * Math.max(1, sim.edges.length)),
        phase: Math.random(),
        speed: 0.6 + Math.random() * 0.8,
      });
    }
    particleState.current = state;
  }, [sim]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh || sim.edges.length === 0) {
      if (mesh) mesh.count = 0;
      return;
    }

    const edges = sim.edges;
    const particles = particleState.current;
    const count = Math.min(particles.length, PARTICLE_COUNT);
    mesh.count = count;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      // Advance phase
      p.phase += (delta * PARTICLE_SPEED * p.speed) / 20;
      if (p.phase >= 1) {
        p.phase -= 1;
        // Reassign to a random edge for variety
        p.edgeIdx = Math.floor(Math.random() * edges.length);
      }
      // Ensure edge index is valid
      if (p.edgeIdx >= edges.length) p.edgeIdx = p.edgeIdx % edges.length;

      const edge = edges[p.edgeIdx];
      const src = edge.source as ForceNode;
      const tgt = edge.target as ForceNode;

      // Interpolate position along the edge in full 3D with a slight arc offset
      const t = p.phase;
      const sx = src.x ?? 0,
        sy = src.y ?? 0,
        sz = src.z ?? 0;
      const tx = tgt.x ?? 0,
        ty = tgt.y ?? 0,
        tz = tgt.z ?? 0;
      const x = sx + (tx - sx) * t;
      const y = sy + (ty - sy) * t;
      const z = sz + (tz - sz) * t;
      // Arc perpendicular to the edge direction for visual separation
      const arc = Math.sin(t * Math.PI) * 0.8;
      // Compute a perpendicular offset using cross product with a reference axis
      const dx = tx - sx,
        dy = ty - sy,
        dz = tz - sz;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const ndx = dx / len,
        ndy = dy / len,
        ndz = dz / len;
      // Choose reference axis least aligned with edge to avoid degenerate cross product
      const absX = Math.abs(ndx),
        absY = Math.abs(ndy),
        absZ = Math.abs(ndz);
      let rx = 0,
        ry = 1,
        rz = 0;
      if (absY > absX && absY > absZ) {
        rx = 1;
        ry = 0;
        rz = 0;
      }
      // Cross product: edge × ref
      let px = ndy * rz - ndz * ry;
      let py = ndz * rx - ndx * rz;
      let pz = ndx * ry - ndy * rx;
      const pLen = Math.sqrt(px * px + py * py + pz * pz) || 1;
      px /= pLen;
      py /= pLen;
      pz /= pLen;

      tempObj.position.set(x + px * arc, y + py * arc, z + pz * arc);
      tempObj.scale.setScalar(0.04);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);

      // Color particles by action type of the agent node
      const agentNode = src.type === 'agent' ? src : tgt.type === 'agent' ? tgt : null;
      if (agentNode?.isWhale) {
        tempColor.set('#3b82f6'); // blue for whales
      } else if (agentNode?.lastAction === 'buy') {
        tempColor.set('#22c55e'); // green for buys
      } else if (agentNode?.lastAction === 'sell') {
        tempColor.set('#ef4444'); // red for sells
      } else if (agentNode?.lastAction === 'create') {
        tempColor.set(isDark ? '#1a1a1a' : '#0a0a0a'); // black for creates
      } else {
        tempColor.set(isDark ? '#64748b' : '#94a3b8'); // grey fallback
      }
      mesh.setColorAt(i, tempColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, PARTICLE_COUNT]} frustumCulled={false} />;
});

EdgeParticles.displayName = 'EdgeParticles';