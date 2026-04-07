'use client';

import React, { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { ForceGraphSimulation } from '../ForceGraph';
import { GRAPH_CONFIG } from '../constants';
import { ProtocolLabel } from '../ProtocolLabel';

const { HUB_BASE_RADIUS } = GRAPH_CONFIG;

/**
 * Hub node: pure white, unlit MeshBasicMaterial.
 * The bloom post-processing pass makes these stark white spheres
 * emit a beautiful glowing halation against the black background.
 */
export const HubNodeMesh = memo(
  ({
    sim,
    nodeId,
    paletteIndex,
    isActive,
    isDimmed,
    isHighlighted,
    isHovered,
    onPointerOver,
    onPointerOut,
    onClick,
  }: {
    sim: ForceGraphSimulation;
    nodeId: string;
    paletteIndex: number;
    isActive: boolean;
    isDimmed: boolean;
    isHighlighted: boolean;
    isHovered: boolean;
    onPointerOver: () => void;
    onPointerOut: () => void;
    onClick: () => void;
    colorOverride?: string;
    isDark?: boolean;
  }) => {
    const groupRef = useRef<THREE.Group>(null!);
    const meshRef = useRef<THREE.Mesh>(null!);
    const glowRef = useRef<THREE.MeshBasicMaterial>(null!);
    const radiusRef = useRef<number>(HUB_BASE_RADIUS);

    const node = useMemo(() => sim.nodeMap.get(nodeId), [sim, nodeId]);
    void node; // used only for initial check

    useFrame((state) => {
      const nodeData = sim.nodeMap.get(nodeId);
      if (!nodeData || !groupRef.current || !meshRef.current) return;
      groupRef.current.position.set(nodeData.x ?? 0, nodeData.y ?? 0, nodeData.z ?? 0);

      const baseScale = nodeData.radius;
      const breathe = 1 + Math.sin(state.clock.getElapsedTime() * 1.5 + paletteIndex * 1.3) * 0.08;

      if (isHighlighted) {
        const pulse = 1 + Math.sin(state.clock.getElapsedTime() * Math.PI) * 0.05;
        meshRef.current.scale.setScalar(baseScale * 2 * pulse);
      } else {
        meshRef.current.scale.setScalar(baseScale * breathe);
      }
      radiusRef.current = nodeData.radius;

      // Animate hover glow
      if (glowRef.current) {
        const targetOpacity = isHovered ? 0.25 : 0;
        glowRef.current.opacity += (targetOpacity - glowRef.current.opacity) * 0.15;
      }
    });

    // Dimmed nodes reduce opacity slightly but stay white
    const mainOpacity = isDimmed ? 0.3 : 1;

    return (
      <group ref={groupRef}>
        <mesh
          ref={meshRef}
          onPointerOver={(e) => {
            e.stopPropagation();
            onPointerOver();
          }}
          onPointerOut={onPointerOut}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={mainOpacity}
            toneMapped={false}
          />
        </mesh>
        {/* Hover glow halo — larger sphere that fades in, triggers extra bloom */}
        <mesh scale={1.5}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            ref={glowRef}
            color="#ffffff"
            transparent
            opacity={0}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
        <ProtocolLabel name={sim.nodeMap.get(nodeId)?.label ?? 'UNKNOWN'} position={[0, radiusRef.current + 2, 0]} visible />
      </group>
    );
  },
);

HubNodeMesh.displayName = 'HubNodeMesh';
