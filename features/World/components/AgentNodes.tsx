'use client';

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { ForceGraphSimulation } from '../ForceGraph';
import { COLOR_PALETTE, GRAPH_CONFIG, PROTOCOL_COLORS } from '../constants';

const { MAX_AGENTS } = GRAPH_CONFIG;

/** InstancedMesh for agent nodes with active-protocol tinting + dimming */
export const AgentNodes = memo(
  ({
    sim,
    activeProtocol,
    highlightedHubId,
    highlightedAddress,
    isDark = true,
  }: {
    sim: ForceGraphSimulation;
    activeProtocol: string | null;
    highlightedHubId?: string | null;
    /** Address of the specifically searched agent — gets its own highlighted treatment */
    highlightedAddress?: string | null;
    isDark?: boolean;
  }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const tempObj = useMemo(() => new THREE.Object3D(), []);
    const tempColor = useMemo(() => new THREE.Color(), []);
    const dimColor = useMemo(() => new THREE.Color(isDark ? '#334155' : '#94a3b8'), [isDark]);
    const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
    const material = useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          roughness: 0.4,
          metalness: 0.0,
          emissive: new THREE.Color(isDark ? '#ffffff' : '#333333'),
          emissiveIntensity: isDark ? 2.5 : 0.6,
          transparent: true,
          opacity: 1.0,
          toneMapped: false,
        }),
      [isDark],
    );

    // Cache the active hub's palette color by hub index
    const activeColorRef = useRef<string | null>(null);
    useEffect(() => {
      if (!activeProtocol) {
        activeColorRef.current = null;
        return;
      }
      const hubs = sim.nodes.filter((n) => n.type === 'hub');
      const idx = hubs.findIndex((h) => h.id === activeProtocol);
      activeColorRef.current = idx >= 0 ? COLOR_PALETTE[idx % COLOR_PALETTE.length] : null;
    }, [activeProtocol, sim]);

    useFrame((state) => {
      const mesh = meshRef.current;
      if (!mesh) return;

      const agents = sim.nodes.filter((n) => n.type === 'agent');
      const count = Math.min(agents.length, MAX_AGENTS);
      mesh.count = count;

      const ac = activeColorRef.current;
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

        // Subtle shimmer — small position jitter to feel alive without chaos
        const shimmerPhase = state.clock.getElapsedTime() * 0.3 + i * 2.17;
        const shimmer = 0.12;
        const sx = Math.sin(shimmerPhase) * shimmer;
        const sy = Math.sin(shimmerPhase * 0.5 + i * 1.37) * shimmer;
        const sz = Math.cos(shimmerPhase * 0.7 + i) * shimmer;

        if (isSearchedAgent) {
          // Searched agent: 3x size with gentle pulse, bright blue
          const pulse = 1 + Math.sin(state.clock.getElapsedTime() * Math.PI) * 0.05;
          tempObj.position.set((node.x ?? 0) + sx, (node.y ?? 0) + sy, (node.z ?? 0) + sz);
          tempObj.scale.setScalar(node.radius * 3 * pulse);
          tempObj.updateMatrix();
          mesh.setMatrixAt(i, tempObj.matrix);
          tempColor.set('#818cf8');
        } else {
          // Whales are 1.8× size, snipers are 1.4× size
          const sizeMultiplier = node.isWhale ? 1.8 : node.isSniper ? 1.4 : 1;
          tempObj.position.set((node.x ?? 0) + sx, (node.y ?? 0) + sy, (node.z ?? 0) + sz);
          tempObj.scale.setScalar(node.radius * sizeMultiplier);
          tempObj.updateMatrix();
          mesh.setMatrixAt(i, tempObj.matrix);

          if (highlightedHubId && node.hubTokenAddress === highlightedHubId) {
            tempColor.set('#818cf8').multiplyScalar(0.8);
          } else if (hasFilter) {
            if (ac && node.hubTokenAddress === activeProtocol) {
              tempColor.set(ac).multiplyScalar(0.7);
            } else {
              tempColor.copy(dimColor).multiplyScalar(0.35);
            }
          } else {
            // Color agents by their hub's chain color (desaturated)
            // Whales get bright teal, snipers get orange
            if (node.isWhale) {
              tempColor.set('#38bdf8');
            } else if (node.isSniper) {
              tempColor.set('#f97316');
            } else {
              const hub = node.hubTokenAddress ? sim.nodeMap.get(node.hubTokenAddress) : null;
              if (hub?.color) {
                tempColor.set(hub.color).multiplyScalar(isDark ? 0.6 : 0.4);
              } else {
                tempColor.set(isDark ? PROTOCOL_COLORS.agentDefault : '#2a6090');
              }
            }
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