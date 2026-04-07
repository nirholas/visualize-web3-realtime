'use client';

import React, { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { ForceGraphSimulation } from '../ForceGraph';
import { GRAPH_CONFIG } from '../constants';

const { MAX_AGENTS } = GRAPH_CONFIG;

/**
 * InstancedMesh for agent nodes — small white dots orbiting hubs.
 * Keeps functional behavior (search/highlight) while staying visually subtle
 * so the particle swarm is the dominant visual element.
 */
export const AgentNodes = memo(
  ({
    sim,
    activeProtocol,
    highlightedHubId,
    highlightedAddress,
  }: {
    sim: ForceGraphSimulation;
    activeProtocol: string | null;
    highlightedHubId?: string | null;
    highlightedAddress?: string | null;
    isDark?: boolean;
  }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const tempObj = useMemo(() => new THREE.Object3D(), []);
    const tempColor = useMemo(() => new THREE.Color(), []);
    const geometry = useMemo(() => new THREE.SphereGeometry(1, 6, 6), []);
    const material = useMemo(
      () =>
        new THREE.MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0.6,
          toneMapped: false,
        }),
      [],
    );

    useFrame((state) => {
      const mesh = meshRef.current;
      if (!mesh) return;

      const agents = sim.nodes.filter((n) => n.type === 'agent');
      const count = Math.min(agents.length, MAX_AGENTS);
      mesh.count = count;

      const hasFilter = activeProtocol !== null;
      const searchLower = highlightedAddress?.toLowerCase() ?? null;

      for (let i = 0; i < count; i++) {
        const node = agents[i];

        // Check if this is the specifically searched agent
        let isSearchedAgent = false;
        if (searchLower) {
          const parts = node.id.split(':');
          isSearchedAgent = parts.length >= 2 && parts[1].toLowerCase() === searchLower;
        }

        // Orbital swarming — agents slowly orbit their hub
        const t = state.clock.getElapsedTime();
        const uniqueSeed = i * 2.17;
        const orbitSpeed = 0.15 + (i % 7) * 0.03;
        const orbitRadius = 0.3 + (i % 5) * 0.12;
        const phase1 = t * orbitSpeed + uniqueSeed;
        const phase2 = t * orbitSpeed * 0.7 + uniqueSeed * 1.37;
        const phase3 = t * orbitSpeed * 0.5 + uniqueSeed * 0.83;
        const sx = Math.sin(phase1) * orbitRadius;
        const sy = Math.sin(phase2) * orbitRadius * 0.8;
        const sz = Math.cos(phase3) * orbitRadius;

        if (isSearchedAgent) {
          const pulse = 1 + Math.sin(t * Math.PI) * 0.05;
          tempObj.position.set((node.x ?? 0) + sx, (node.y ?? 0) + sy, (node.z ?? 0) + sz);
          tempObj.scale.setScalar(node.radius * 3 * pulse);
          tempObj.updateMatrix();
          mesh.setMatrixAt(i, tempObj.matrix);
          tempColor.set('#818cf8');
        } else {
          const sizeMultiplier = node.isWhale ? 1.8 : node.isSniper ? 1.4 : 1;
          tempObj.position.set((node.x ?? 0) + sx, (node.y ?? 0) + sy, (node.z ?? 0) + sz);
          tempObj.scale.setScalar(node.radius * sizeMultiplier);
          tempObj.updateMatrix();
          mesh.setMatrixAt(i, tempObj.matrix);

          if (highlightedHubId && node.hubTokenAddress === highlightedHubId) {
            tempColor.setRGB(0.8, 0.8, 0.8);
          } else if (hasFilter) {
            const isRelated = node.hubTokenAddress === activeProtocol;
            tempColor.setRGB(isRelated ? 0.7 : 0.15, isRelated ? 0.7 : 0.15, isRelated ? 0.7 : 0.15);
          } else {
            // All agents are white in the cyberpunk aesthetic
            tempColor.setRGB(0.5, 0.5, 0.5);
          }
        }
        mesh.setColorAt(i, tempColor);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });

    return <instancedMesh ref={meshRef} args={[geometry, material, MAX_AGENTS]} frustumCulled={false} />;
  },
);

AgentNodes.displayName = 'AgentNodes';
