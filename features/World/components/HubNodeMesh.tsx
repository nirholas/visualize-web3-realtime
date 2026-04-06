'use client';

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { ForceGraphSimulation } from '../ForceGraph';
import { COLOR_PALETTE, GRAPH_CONFIG, PROTOCOL_COLORS } from '../constants';
import { ProtocolLabel } from '../ProtocolLabel';

const { HUB_BASE_RADIUS } = GRAPH_CONFIG;

/** Individual hub node mesh — hover detection + source-colored transitions */
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
    colorOverride,
    isDark = true,
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
    const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const ringRef = useRef<THREE.Mesh>(null!);
    const ringMaterialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const glowRef = useRef<THREE.MeshStandardMaterial>(null!);
    const targetColor = useRef(new THREE.Color(PROTOCOL_COLORS.default));
    const targetOpacity = useRef(1);
    const targetRingOpacity = useRef(0);
    const targetGlowOpacity = useRef(0);
    const radiusRef = useRef(HUB_BASE_RADIUS);

    const node = useMemo(() => sim.nodeMap.get(nodeId), [sim, nodeId]);
    const isAgentHub = node?.source === 'agents';
    const AGENT_COLOR_PALETTE = ['#c084fc', '#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#fb923c', '#a78bfa', '#22d3ee'];

    // Theme-aware default colors: bright on dark bg, darker on light bg
    const defaultHubColor = isDark ? PROTOCOL_COLORS.default : '#2a5a9e';
    const defaultEmissiveIntensity = isDark ? 2.5 : 0.8;

    useEffect(() => {
      if (isHighlighted) {
        targetColor.current.set('#818cf8');
        targetOpacity.current = 1;
        targetRingOpacity.current = isAgentHub ? 0.8 : 0;
      } else if (isActive) {
        // Each hub gets its unique palette color when selected
        const color =
          colorOverride ||
          (isAgentHub
            ? AGENT_COLOR_PALETTE[paletteIndex % AGENT_COLOR_PALETTE.length]
            : COLOR_PALETTE[paletteIndex % COLOR_PALETTE.length]);
        targetColor.current.set(color);
        targetOpacity.current = 1;
        targetRingOpacity.current = isAgentHub ? 0.5 : 0;
      } else if (isDimmed) {
        targetColor.current.set(defaultHubColor);
        targetOpacity.current = 0.15;
        targetRingOpacity.current = 0;
      } else {
        // Default: solid sphere, with subtle ring for agent hubs
        if (isAgentHub) {
          targetColor.current.set(AGENT_COLOR_PALETTE[paletteIndex % AGENT_COLOR_PALETTE.length]);
          targetRingOpacity.current = 0.3;
        } else {
          targetColor.current.set(defaultHubColor);
          targetRingOpacity.current = 0;
        }
        targetOpacity.current = 1;
      }
    }, [isActive, isDimmed, isHighlighted, paletteIndex, colorOverride, isAgentHub, isDark, defaultHubColor]);

    useFrame((state, delta) => {
      const nodeData = sim.nodeMap.get(nodeId);
      if (!nodeData || !groupRef.current || !meshRef.current || !materialRef.current) return;
      groupRef.current.position.set(nodeData.x ?? 0, nodeData.y ?? 0, nodeData.z ?? 0);

      const baseScale = nodeData.radius;
      // Gentle breathe animation — each hub out of phase via paletteIndex
      const breathe = 1 + Math.sin(state.clock.getElapsedTime() * 1.5 + paletteIndex * 1.3) * 0.08;
      if (isHighlighted) {
        const pulse = 1 + Math.sin(state.clock.getElapsedTime() * Math.PI) * 0.05;
        meshRef.current.scale.setScalar(baseScale * 2 * pulse);
      } else {
        meshRef.current.scale.setScalar(baseScale * breathe);
      }
      // Pulse emissive intensity in sync with breathe
      // Bonding curve progress amplifies glow (0% → base, 100% → 2× base)
      if (materialRef.current) {
        const curveBoost = (nodeData.bondingCurveProgress ?? 0) * defaultEmissiveIntensity;
        // Graduated tokens get a fast pulse to signal they've graduated
        const gradPulse = nodeData.graduated ? Math.abs(Math.sin(state.clock.getElapsedTime() * 4)) * 1.5 : 0;
        materialRef.current.emissiveIntensity =
          defaultEmissiveIntensity +
          curveBoost +
          gradPulse +
          Math.sin(state.clock.getElapsedTime() * 1.5 + paletteIndex * 1.3) * 0.8;
      }
      radiusRef.current = nodeData.radius;

      const lerpFactor = 1 - Math.exp(-10 * delta);
      materialRef.current.color.lerp(targetColor.current, lerpFactor);
      materialRef.current.emissive.lerp(targetColor.current, lerpFactor);
      materialRef.current.opacity += (targetOpacity.current - materialRef.current.opacity) * lerpFactor;

      // Animate ring opacity for agent hubs
      if (ringMaterialRef.current) {
        ringMaterialRef.current.opacity += (targetRingOpacity.current - ringMaterialRef.current.opacity) * lerpFactor;
      }
      // Animate hover glow
      targetGlowOpacity.current = isHovered ? 0.35 : 0;
      if (glowRef.current) {
        glowRef.current.opacity += (targetGlowOpacity.current - glowRef.current.opacity) * lerpFactor;
        glowRef.current.emissive.lerp(targetColor.current, lerpFactor);
      }
    });

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
          <meshStandardMaterial
            ref={materialRef}
            color={defaultHubColor}
            transparent
            opacity={1}
            roughness={0.3}
            metalness={0.1}
            emissive={defaultHubColor}
            emissiveIntensity={defaultEmissiveIntensity}
            envMapIntensity={1.2}
            toneMapped={false}
          />
        </mesh>
        {/* Hover glow halo — triggers bloom when hovered */}
        <mesh scale={1.35}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            ref={glowRef}
            color={defaultHubColor}
            transparent
            opacity={0}
            roughness={1}
            metalness={0}
            emissive={defaultHubColor}
            emissiveIntensity={4.0}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
        {isAgentHub && (
          <mesh ref={ringRef} rotation={[Math.PI * 0.15, 0, Math.PI * 0.3]} scale={1.4}>
            <torusGeometry args={[1, 0.12, 8, 32]} />
            <meshStandardMaterial
              ref={ringMaterialRef}
              color={AGENT_COLOR_PALETTE[paletteIndex % AGENT_COLOR_PALETTE.length]}
              transparent
              opacity={0}
              roughness={0.3}
              metalness={0.1}
              emissive={AGENT_COLOR_PALETTE[paletteIndex % AGENT_COLOR_PALETTE.length]}
              emissiveIntensity={2.5}
              toneMapped={false}
            />
          </mesh>
        )}
        {/* Always show hub label — hubs are the anchor points of the point cloud */}
        <ProtocolLabel name={sim.nodeMap.get(nodeId)?.label ?? 'UNKNOWN'} position={[0, radiusRef.current + 2, 0]} visible />
      </group>
    );
  },
);

HubNodeMesh.displayName = 'HubNodeMesh';