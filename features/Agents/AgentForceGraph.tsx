/**
 * AgentForceGraph — Force-directed 3D visualization of AI agent activity
 *
 * Real-time visualization of:
 * - Agent hubs (large glowing spheres)
 * - Task nodes orbiting their agent hub
 * - Tool call particles flying between agents and tool clusters
 * - Sub-agent edges (parent-child connections)
 * - Reasoning halos during thinking phases
 * - Executor heartbeat pulse
 *
 * Architecture mirrors ForceGraph.tsx but tailored for agent events.
 */
'use client';

import React, { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, MapControls } from '@react-three/drei';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

import type {
  TopToken,
  TraderEdge,
  AgentFlowTrace,
  ExecutorState,
  AgentEvent,
  AgentTask,
  AgentToolCall,
} from '@web3viz/core';
import type { ShareColors } from '../World/SharePanel';

import { AgentLabel } from './AgentLabel';
import { TaskInspectorPanel } from './TaskInspector';
import {
  AGENT_COLOR_PALETTE,
  AGENT_COLORS,
  AGENT_GRAPH_CONFIG,
  TOOL_CLUSTER_POSITIONS,
  TOOL_CLUSTER_ICONS,
  TASK_STATUS_COLORS,
} from './constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentHubState {
  id: string;
  name: string;
  role: string;
  position: THREE.Vector3;
  radius: number;
  color: string;
  activeTasks: number;
  totalToolCalls: number;
  isReasoning: boolean;
  reasoningStartTime?: number;
  pulseEvents: Array<{ timestamp: number; status: 'complete' | 'failed' }>;
  spawnedAt: number;
  errorShakeStart?: number;
}

interface TaskNodeState {
  id: string;
  agentId: string;
  description: string;
  status: string;
  position: THREE.Vector3;
  angle: number;
  color: string;
  isNew: boolean;
  createdAt: number;
}

interface ToolParticleState {
  id: string;
  agentId: string;
  toolCategory: string;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  progress: number;  // 0-1
  path: THREE.Vector3[];
  createdAt: number;
  returning?: boolean;
  prevPositions?: THREE.Vector3[]; // ghost trail positions
}

interface CameraAnimation {
  durationMs: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromLookAt: THREE.Vector3;
  toLookAt: THREE.Vector3;
  startedAt: number;
  onDone?: () => void;
}

interface CameraApi {
  animateTo: (pos: [number, number, number], lookAt: [number, number, number], durationMs: number) => Promise<void>;
  setOrbitEnabled: (enabled: boolean) => void;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AgentForceGraphProps {
  /** Agent TopTokens (each agent = a hub) */
  agents: TopToken[];
  /** Tool call edges (tool calls = trader edges) */
  toolEdges: TraderEdge[];
  /** Active flow traces for visual state */
  flows: Map<string, AgentFlowTrace>;
  /** Executor state for heartbeat display */
  executorState: ExecutorState | null;
  /** Recent agent events for live animations */
  recentEvents: AgentEvent[];
  /** Currently selected agent ID */
  activeAgentId: string | null;
  /** Callback when an agent hub is clicked */
  onAgentSelect: (agentId: string | null) => void;
  /** Background color */
  backgroundColor?: string;
  /** Share colors override */
  shareColors?: ShareColors;
  /** Height of the canvas container */
  height?: string | number;
  /** Color scheme for theme-aware rendering */
  colorScheme?: 'dark' | 'light';
  /** Respect prefers-reduced-motion */
  reducedMotion?: boolean;
}

export interface AgentForceGraphHandle {
  getCanvasElement: () => HTMLCanvasElement | null;
  focusAgent: (agentId: string, durationMs?: number) => Promise<void>;
  getAgentCount: () => number;
  /** Capture the current 3D view as a PNG data URL via synchronous WebGL render */
  takeSnapshot: () => string | null;
}

// ---------------------------------------------------------------------------
// Scene background controller
// ---------------------------------------------------------------------------

const SceneBackground = memo<{ color: string }>(({ color }) => {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(color);
  }, [color, scene]);
  return null;
});
SceneBackground.displayName = 'SceneBackground';

// ---------------------------------------------------------------------------
// Snapshot helper — captures R3F context for synchronous WebGL screenshots
// ---------------------------------------------------------------------------

const SnapshotHelper = memo<{ snapshotRef: React.MutableRefObject<(() => string | null) | null> }>(
  ({ snapshotRef }) => {
    const { gl, scene, camera } = useThree();

    useEffect(() => {
      snapshotRef.current = () => {
        gl.render(scene, camera);
        return gl.domElement.toDataURL('image/png', 1.0);
      };
      return () => { snapshotRef.current = null; };
    }, [gl, scene, camera, snapshotRef]);

    return null;
  },
);
SnapshotHelper.displayName = 'SnapshotHelper';

// ---------------------------------------------------------------------------
// Ground plane
// ---------------------------------------------------------------------------

const Ground = memo(() => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
    <planeGeometry args={[200, 200]} />
    <meshStandardMaterial color="#f8f8fa" />
  </mesh>
));
Ground.displayName = 'Ground';

// ---------------------------------------------------------------------------
// AgentHubNode — Individual agent spheres with animations
// ---------------------------------------------------------------------------

interface AgentHubNodeProps {
  hub: AgentHubState;
  isActive: boolean;
  isDimmed: boolean;
  isHovered: boolean;
  reducedMotion?: boolean;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onClick: () => void;
}

const AgentHubNode = memo<AgentHubNodeProps>(
  ({ hub, isActive, isDimmed, isHovered, reducedMotion, onPointerOver, onPointerOut, onClick }) => {
    const groupRef = useRef<THREE.Group>(null!);
    const meshRef = useRef<THREE.Mesh>(null!);
    const haloRef = useRef<THREE.Mesh>(null!);
    const pulseRingRef = useRef<THREE.Mesh>(null!);
    const pulseRingMatRef = useRef<THREE.MeshStandardMaterial>(null!);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const haloMaterialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const targetColor = useRef(new THREE.Color(hub.color));
    const targetOpacity = useRef(1);
    const lighterColor = useRef(new THREE.Color(hub.color));

    // Pre-compute a lighter variant for idle color pulse
    useEffect(() => {
      lighterColor.current.set(hub.color);
      lighterColor.current.offsetHSL(0, 0, AGENT_GRAPH_CONFIG.idleColorPulseAmount);
    }, [hub.color]);

    useEffect(() => {
      if (isActive) {
        targetColor.current.set(hub.color);
        targetOpacity.current = 1;
      } else if (isDimmed) {
        targetColor.current.set(AGENT_COLORS.default);
        targetOpacity.current = 0.2;
      } else {
        targetColor.current.set(AGENT_COLORS.default);
        targetOpacity.current = 1;
      }
    }, [isActive, isDimmed, hub.color]);

    useFrame((state, delta) => {
      if (!groupRef.current || !meshRef.current || !materialRef.current) return;

      groupRef.current.position.copy(hub.position);

      const now = Date.now();
      const elapsed = state.clock.getElapsedTime();
      const baseScale = hub.radius;

      // --- Spawn animation: elastic scale from 0 → full over 500ms ---
      const spawnAge = now - hub.spawnedAt;
      let spawnScale = 1;
      if (spawnAge < AGENT_GRAPH_CONFIG.spawnDurationMs && !reducedMotion) {
        const t = spawnAge / AGENT_GRAPH_CONFIG.spawnDurationMs;
        // Elastic ease-out: overshoot then settle
        spawnScale = 1 - Math.pow(2, -10 * t) * Math.cos(t * Math.PI * 3);
      }

      // --- Idle breathing animation ---
      let breathAmount = 0;
      if (!reducedMotion) {
        const breatheTime = (elapsed * 1000) % AGENT_GRAPH_CONFIG.breathingPeriod;
        breathAmount = Math.sin((breatheTime / AGENT_GRAPH_CONFIG.breathingPeriod) * Math.PI * 2) * AGENT_GRAPH_CONFIG.breathingAmplitude;

        // Idle color pulse: slightly lighter on the upswing
        if (hub.activeTasks === 0 && !isActive) {
          const colorPulse = (Math.sin((breatheTime / AGENT_GRAPH_CONFIG.breathingPeriod) * Math.PI * 2) + 1) * 0.5;
          const baseCol = new THREE.Color(AGENT_COLORS.default);
          baseCol.lerp(lighterColor.current, colorPulse * 0.3);
          targetColor.current.copy(baseCol);
        }
      }

      meshRef.current.scale.setScalar(baseScale * (1 + breathAmount) * spawnScale);

      // --- Pulse when active ---
      if (isActive && !reducedMotion) {
        const pulse = 1 + Math.sin(elapsed * Math.PI) * 0.08;
        meshRef.current.scale.multiplyScalar(pulse);
      }

      // --- Error shake: ±amplitude, 3 cycles over 300ms ---
      if (hub.errorShakeStart && !reducedMotion) {
        const shakeAge = now - hub.errorShakeStart;
        if (shakeAge < AGENT_GRAPH_CONFIG.errorShakeDurationMs) {
          const t = shakeAge / AGENT_GRAPH_CONFIG.errorShakeDurationMs;
          const shakeX = Math.sin(t * AGENT_GRAPH_CONFIG.errorShakeCycles * Math.PI * 2)
            * AGENT_GRAPH_CONFIG.errorShakeAmplitude * (1 - t);
          groupRef.current.position.x += shakeX;
          // Brief red flash overlay
          materialRef.current.emissive.set('#f87171');
          materialRef.current.emissiveIntensity = (1 - t) * 0.5;
        } else {
          materialRef.current.emissive.set('#000000');
          materialRef.current.emissiveIntensity = 0;
        }
      }

      // --- Completion pulse ring ---
      if (pulseRingRef.current && pulseRingMatRef.current && !reducedMotion) {
        const latestPulse = hub.pulseEvents[hub.pulseEvents.length - 1];
        if (latestPulse) {
          const pulseAge = now - latestPulse.timestamp;
          if (pulseAge < AGENT_GRAPH_CONFIG.completionRingDurationMs) {
            const t = pulseAge / AGENT_GRAPH_CONFIG.completionRingDurationMs;
            const ringScale = baseScale * (1 + t * AGENT_GRAPH_CONFIG.completionRingExpandScale);
            pulseRingRef.current.scale.setScalar(ringScale);
            pulseRingMatRef.current.opacity = 0.6 * (1 - t);
            pulseRingMatRef.current.color.set(latestPulse.status === 'complete' ? '#34d399' : '#f87171');
            pulseRingRef.current.visible = true;
          } else {
            pulseRingRef.current.visible = false;
          }
        }
      }

      // --- Halo for reasoning ---
      if (hub.isReasoning && haloRef.current && haloMaterialRef.current) {
        const reasoningDuration = (now - (hub.reasoningStartTime || 0)) / 1000;
        const haloScale = reducedMotion ? 2 : 1 + Math.sin(reasoningDuration * 2) * 0.3;
        const haloOpacity = 0.3 * (1 - Math.min(reasoningDuration / 2, 1));
        haloRef.current.scale.setScalar(baseScale * haloScale * 2);
        haloMaterialRef.current.opacity = haloOpacity;
      }

      // --- Color lerp ---
      const lerpFactor = 1 - Math.exp(-10 * delta);
      materialRef.current.color.lerp(targetColor.current, lerpFactor);
      materialRef.current.opacity += (targetOpacity.current - materialRef.current.opacity) * lerpFactor;

      // --- Spawn flash: brief white → brand color during first 500ms ---
      if (spawnAge < AGENT_GRAPH_CONFIG.spawnDurationMs && !reducedMotion) {
        const flashT = spawnAge / AGENT_GRAPH_CONFIG.spawnDurationMs;
        if (flashT < 0.3) {
          materialRef.current.emissive.set('#ffffff');
          materialRef.current.emissiveIntensity = (1 - flashT / 0.3) * 0.8;
        } else if (flashT < 0.6) {
          materialRef.current.emissive.set(hub.color);
          materialRef.current.emissiveIntensity = (1 - (flashT - 0.3) / 0.3) * 0.5;
        } else if (!hub.errorShakeStart) {
          materialRef.current.emissive.set('#000000');
          materialRef.current.emissiveIntensity = 0;
        }
      }
    });

    return (
      <group ref={groupRef}>
        {/* Main sphere */}
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
          frustumCulled
        >
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            ref={materialRef}
            color={hub.color}
            transparent
            opacity={1}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>

        {/* Completion / error pulse ring */}
        <mesh ref={pulseRingRef} visible={false} rotation={[-Math.PI / 2, 0, 0]} frustumCulled>
          <ringGeometry args={[0.9, 1.0, 32]} />
          <meshStandardMaterial
            ref={pulseRingMatRef}
            color="#34d399"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Reasoning halo */}
        {hub.isReasoning && (
          <mesh ref={haloRef} frustumCulled>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial
              ref={haloMaterialRef}
              color={AGENT_COLORS.reasoning}
              transparent
              opacity={0.3}
              side={THREE.BackSide}
            />
          </mesh>
        )}

        {/* Hover label */}
        {isHovered && (
          <AgentLabel
            name={hub.name}
            role={hub.role}
            activeTasks={hub.activeTasks}
            toolCalls={hub.totalToolCalls}
            position={[0, hub.radius + 2, 0]}
            visible
          />
        )}
      </group>
    );
  },
);
AgentHubNode.displayName = 'AgentHubNode';

// ---------------------------------------------------------------------------
// TaskNodes — InstancedMesh of orbiting task nodes
// ---------------------------------------------------------------------------

interface TaskNodesProps {
  tasks: Map<string, TaskNodeState[]>;
  selectedAgentId: string | null;
}

const TaskNodes = memo<TaskNodesProps>(({ tasks, selectedAgentId }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, AGENT_GRAPH_CONFIG.taskNodeGeometrySegments, AGENT_GRAPH_CONFIG.taskNodeGeometrySegments), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2, transparent: true }),
    [],
  );

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let instanceIndex = 0;
    const maxInstances = AGENT_GRAPH_CONFIG.maxTaskNodes;
    const now = Date.now();

    for (const [, taskList] of tasks) {
      for (const task of taskList) {
        if (instanceIndex >= maxInstances) break;

        // Skip tasks that have fully faded out (5s after completion)
        const taskAge = now - task.createdAt;
        if ((task.status === 'completed' || task.status === 'failed') &&
            taskAge > AGENT_GRAPH_CONFIG.taskFadeOutDelayMs) {
          continue;
        }

        // Orbital position
        const orbitTime = state.clock.getElapsedTime() * AGENT_GRAPH_CONFIG.taskOrbitSpeed;
        const angle = task.angle + orbitTime;
        const orbitX = Math.cos(angle) * AGENT_GRAPH_CONFIG.taskOrbitRadius;
        const orbitZ = Math.sin(angle) * AGENT_GRAPH_CONFIG.taskOrbitRadius;

        let yOffset = 0.2 * Math.sin(angle * 2);
        let scale = AGENT_GRAPH_CONFIG.taskNodeRadius;

        // Completed: shrink over 300ms, then stay small until fade
        if (task.status === 'completed') {
          const shrinkT = Math.min(taskAge / AGENT_GRAPH_CONFIG.completionFadeDurationMs, 1);
          scale *= (1 - shrinkT * 0.6);
        }

        // Failed: float downward before fading
        if (task.status === 'failed') {
          const fallT = Math.min(taskAge / AGENT_GRAPH_CONFIG.taskFadeOutDelayMs, 1);
          yOffset -= fallT * 2;
        }

        tempObj.position.set(
          task.position.x + orbitX,
          task.position.y + yOffset,
          task.position.z + orbitZ,
        );
        tempObj.scale.setScalar(scale);
        tempObj.updateMatrix();
        mesh.setMatrixAt(instanceIndex, tempObj.matrix);

        // Color and visibility based on status
        const color = TASK_STATUS_COLORS[task.status] || AGENT_COLORS.taskWaiting;
        tempColor.set(color);

        // Pulse for active tasks
        if (task.status === 'in-progress') {
          const pulse = 1 + Math.sin(state.clock.getElapsedTime() * 3) * 0.2;
          tempColor.multiplyScalar(pulse);
        }

        // Fade out completed/failed tasks over 5s
        if (task.status === 'completed' || task.status === 'failed') {
          const fadeOpacity = Math.max(0, 1 - taskAge / AGENT_GRAPH_CONFIG.taskFadeOutDelayMs);
          tempColor.multiplyScalar(fadeOpacity);
        }

        mesh.setColorAt(instanceIndex, tempColor);
        instanceIndex++;
      }
    }

    mesh.count = instanceIndex;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, AGENT_GRAPH_CONFIG.maxTaskNodes]}
      frustumCulled
    />
  );
});
TaskNodes.displayName = 'TaskNodes';

// ---------------------------------------------------------------------------
// ToolCallParticles — Animated tool invocation dots
// ---------------------------------------------------------------------------

interface ToolCallParticlesProps {
  particles: ToolParticleState[];
}

/** Compute position on a quadratic bezier with a perpendicular control offset */
function quadBezierPos(p0: THREE.Vector3, p3: THREE.Vector3, controlOffset: number, t: number): THREE.Vector3 {
  const mid = new THREE.Vector3().addVectors(p0, p3).multiplyScalar(0.5);
  // perpendicular in XZ plane
  const dx = p3.x - p0.x;
  const dz = p3.z - p0.z;
  mid.x += -dz * controlOffset;
  mid.z += dx * controlOffset;
  mid.y += 2; // arc upward

  const it = 1 - t;
  return new THREE.Vector3(
    it * it * p0.x + 2 * it * t * mid.x + t * t * p3.x,
    it * it * p0.y + 2 * it * t * mid.y + t * t * p3.y,
    it * it * p0.z + 2 * it * t * mid.z + t * t * p3.z,
  );
}

const ToolCallParticles = memo<ToolCallParticlesProps>(({ particles }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 6, 6), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.7,
      transparent: true,
      emissive: AGENT_COLORS.toolParticle,
    }),
    [],
  );

  const ghostOpacities = AGENT_GRAPH_CONFIG.trailGhostOpacities;

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let instanceIndex = 0;
    const maxInstances = AGENT_GRAPH_CONFIG.maxToolParticles;

    for (const particle of particles) {
      if (instanceIndex >= maxInstances) break;

      const t = particle.progress;
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      // Use quadratic bezier with different curve for outgoing vs returning
      const curveOffset = particle.returning ? -0.3 : 0.3;
      const position = quadBezierPos(particle.startPos, particle.targetPos, curveOffset, eased);

      tempObj.position.copy(position);
      tempObj.scale.setScalar(0.1);
      tempObj.updateMatrix();
      mesh.setMatrixAt(instanceIndex, tempObj.matrix);

      const fadeOpacity = 1 - (eased * 0.3);
      tempColor.set(AGENT_COLORS.toolParticle).multiplyScalar(fadeOpacity);
      mesh.setColorAt(instanceIndex, tempColor);
      instanceIndex++;

      // Ghost trail: render 3 trailing positions at decreasing opacity
      if (particle.prevPositions) {
        for (let g = 0; g < Math.min(particle.prevPositions.length, ghostOpacities.length); g++) {
          if (instanceIndex >= maxInstances) break;
          const ghostPos = particle.prevPositions[g];
          tempObj.position.copy(ghostPos);
          tempObj.scale.setScalar(0.07 - g * 0.015);
          tempObj.updateMatrix();
          mesh.setMatrixAt(instanceIndex, tempObj.matrix);
          tempColor.set(AGENT_COLORS.toolParticle).multiplyScalar(ghostOpacities[g]);
          mesh.setColorAt(instanceIndex, tempColor);
          instanceIndex++;
        }
      }
    }

    mesh.count = instanceIndex;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, AGENT_GRAPH_CONFIG.maxToolParticles]}
      frustumCulled
    />
  );
});
ToolCallParticles.displayName = 'ToolCallParticles';

// ---------------------------------------------------------------------------
// SubAgentEdges — Parent-to-child agent connections
// ---------------------------------------------------------------------------

interface SubAgentEdgesProps {
  edges: Array<{ parentId: string; childId: string; parentPos: THREE.Vector3; childPos: THREE.Vector3 }>;
}

const SubAgentEdges = memo<SubAgentEdgesProps>(({ edges }) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const posAttr = useRef<THREE.Float32BufferAttribute | null>(null);
  const colorAttr = useRef<THREE.Float32BufferAttribute | null>(null);
  const maxEdges = 500;

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

  useFrame((state) => {
    const pA = posAttr.current;
    const cA = colorAttr.current;
    if (!pA || !cA || !lineRef.current) return;

    const count = Math.min(edges.length, maxEdges);

    for (let i = 0; i < count; i++) {
      const edge = edges[i];
      const idx = i * 6;

      pA.array[idx] = edge.parentPos.x;
      pA.array[idx + 1] = edge.parentPos.y;
      pA.array[idx + 2] = edge.parentPos.z;
      pA.array[idx + 3] = edge.childPos.x;
      pA.array[idx + 4] = edge.childPos.y;
      pA.array[idx + 5] = edge.childPos.z;

      // Pulsing opacity
      const pulse = 0.5 + Math.sin(state.clock.getElapsedTime() * AGENT_GRAPH_CONFIG.edgePulseSpeed * 2 * Math.PI) * 0.3;
      const colorVal = pulse * 0.8;
      cA.array[idx] = colorVal;
      cA.array[idx + 1] = colorVal * 0.7;
      cA.array[idx + 2] = colorVal;
      cA.array[idx + 3] = colorVal;
      cA.array[idx + 4] = colorVal * 0.7;
      cA.array[idx + 5] = colorVal;
    }

    pA.needsUpdate = true;
    cA.needsUpdate = true;
    lineRef.current.geometry.setDrawRange(0, count * 2);
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial vertexColors transparent opacity={0.5} linewidth={1} />
    </lineSegments>
  );
});
SubAgentEdges.displayName = 'SubAgentEdges';

// ---------------------------------------------------------------------------
// AgentEdges — Thin background structure lines between all agent hubs
// ---------------------------------------------------------------------------

interface AgentEdgesProps {
  hubs: AgentHubState[];
}

const AgentEdges = memo<AgentEdgesProps>(({ hubs }) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const posAttr = useRef<THREE.Float32BufferAttribute | null>(null);
  const colorAttr = useRef<THREE.Float32BufferAttribute | null>(null);
  const maxEdges = 200; // n*(n-1)/2 for up to ~20 hubs

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

    let count = 0;
    const edgeColor = new THREE.Color(AGENT_COLORS.edgeDefault);

    for (let i = 0; i < hubs.length && count < maxEdges; i++) {
      for (let j = i + 1; j < hubs.length && count < maxEdges; j++) {
        const idx = count * 6;
        pA.array[idx] = hubs[i].position.x;
        pA.array[idx + 1] = hubs[i].position.y;
        pA.array[idx + 2] = hubs[i].position.z;
        pA.array[idx + 3] = hubs[j].position.x;
        pA.array[idx + 4] = hubs[j].position.y;
        pA.array[idx + 5] = hubs[j].position.z;

        cA.array[idx] = edgeColor.r;
        cA.array[idx + 1] = edgeColor.g;
        cA.array[idx + 2] = edgeColor.b;
        cA.array[idx + 3] = edgeColor.r;
        cA.array[idx + 4] = edgeColor.g;
        cA.array[idx + 5] = edgeColor.b;

        count++;
      }
    }

    pA.needsUpdate = true;
    cA.needsUpdate = true;
    lineRef.current.geometry.setDrawRange(0, count * 2);
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial vertexColors transparent opacity={0.12} linewidth={1} />
    </lineSegments>
  );
});
AgentEdges.displayName = 'AgentEdges';

// ---------------------------------------------------------------------------
// ToolClusterNodes — Fixed hub spheres at tool cluster positions with icons
// ---------------------------------------------------------------------------

interface ToolClusterNodesProps {
  hubs: AgentHubState[];
}

const ToolClusterNodes = memo<ToolClusterNodesProps>(({ hubs: _hubs }) => {
  const entries = useMemo(
    () => Object.entries(TOOL_CLUSTER_POSITIONS) as [string, [number, number]][],
    [],
  );

  return (
    <>
      {entries.map(([category, [x, z]]) => (
        <group key={category} position={[x, 0, z]}>
          {/* Small translucent sphere */}
          <mesh frustumCulled>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshStandardMaterial
              color={AGENT_COLORS.agentDefault}
              transparent
              opacity={0.4}
              roughness={0.8}
            />
          </mesh>
          {/* Icon label */}
          <Html center style={{ pointerEvents: 'none' }}>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: '#888',
                textAlign: 'center',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                transform: 'translateY(-16px)',
              }}
            >
              {TOOL_CLUSTER_ICONS[category] || '?'}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
});
ToolClusterNodes.displayName = 'ToolClusterNodes';

// ---------------------------------------------------------------------------
// ExecutorHeartbeat — Global pulse indicator
// ---------------------------------------------------------------------------

interface ExecutorHeartbeatProps {
  executorState: ExecutorState | null;
}

const ExecutorHeartbeat = memo<ExecutorHeartbeatProps>(({ executorState }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // Determine health status
  const getHealthColor = () => {
    if (!executorState) return AGENT_COLORS.heartbeatDead;
    const timeSinceHeartbeat = Date.now() - executorState.lastHeartbeat;
    if (timeSinceHeartbeat > 60000) return AGENT_COLORS.heartbeatDead;
    if (timeSinceHeartbeat > 30000) return AGENT_COLORS.heartbeatWarning;
    return AGENT_COLORS.heartbeatHealthy;
  };

  useFrame((state) => {
    if (!groupRef.current || !ringRef.current || !materialRef.current) return;

    const pulseTime = state.clock.getElapsedTime();
    const pulse = 1 + Math.sin(pulseTime * 2) * 0.3;
    ringRef.current.scale.setScalar(pulse);

    materialRef.current.color.set(getHealthColor());
    materialRef.current.emissive.set(getHealthColor());
  });

  const uptime = executorState?.uptime || 0;
  const uptimeStr = `${Math.floor(uptime / 3600000)}h${Math.floor((uptime % 3600000) / 60000)}m`;

  return (
    <group ref={groupRef} position={[0, -5, 0]}>
      {/* Expanding ring pulse */}
      <mesh ref={ringRef}>
        <torusGeometry args={[2, 0.1, 16, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          color={AGENT_COLORS.heartbeatHealthy}
          emissive={AGENT_COLORS.heartbeatHealthy}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Uptime counter label */}
      {executorState && (
        <Html center position={[0, -1.5, 0]} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              color: '#888',
              textAlign: 'center',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              letterSpacing: '0.06em',
            }}
          >
            {uptimeStr} uptime
          </div>
        </Html>
      )}
    </group>
  );
});
ExecutorHeartbeat.displayName = 'ExecutorHeartbeat';

// ---------------------------------------------------------------------------
// Camera setup
// ---------------------------------------------------------------------------

const CameraSetup = memo<{ apiRef: React.MutableRefObject<CameraApi | null> }>(({ apiRef }) => {
  const { camera } = useThree();
  const controlsRef = useRef<MapControlsImpl>(null);
  const animRef = useRef<CameraAnimation | null>(null);

  useEffect(() => {
    camera.position.set(0, 120, 60);
    camera.lookAt(0, 0, 0);
  }, [camera]);

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
        if (controlsRef.current) {
          controlsRef.current.enabled = enabled;
        }
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
    const lookTarget = new THREE.Vector3().lerpVectors(anim.fromLookAt, anim.toLookAt, eased);
    camera.lookAt(lookTarget);

    if (controlsRef.current) {
      controlsRef.current.target.copy(lookTarget);
    }

    if (t >= 1) {
      animRef.current = null;
      anim.onDone?.();
    }
  });

  return (
    <MapControls
      ref={controlsRef}
      enableRotate={false}
      enableDamping
      dampingFactor={0.15}
      minDistance={10}
      maxDistance={500}
      screenSpacePanning
    />
  );
});
CameraSetup.displayName = 'CameraSetup';

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

interface NetworkSceneProps {
  hubs: AgentHubState[];
  tasks: Map<string, TaskNodeState[]>;
  particles: ToolParticleState[];
  subAgentEdges: Array<{ parentId: string; childId: string; parentPos: THREE.Vector3; childPos: THREE.Vector3 }>;
  executorState: ExecutorState | null;
  activeAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
  shareColors?: ShareColors;
  reducedMotion?: boolean;
}

const NetworkScene = memo<NetworkSceneProps>(
  ({
    hubs,
    tasks,
    particles,
    subAgentEdges,
    executorState,
    activeAgentId,
    onSelectAgent,
    shareColors,
    reducedMotion,
  }) => {
    const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

    return (
      <>
        {shareColors && <SceneBackground color={shareColors.background} />}

        <ambientLight intensity={0.7} />
        <directionalLight position={[20, 40, 20]} intensity={0.6} />

        {/* Agent hubs */}
        {hubs.map((hub) => (
          <AgentHubNode
            key={hub.id}
            hub={hub}
            isActive={activeAgentId === hub.id}
            isDimmed={activeAgentId !== null && activeAgentId !== hub.id}
            isHovered={hoveredAgent === hub.id}
            reducedMotion={reducedMotion}
            onPointerOver={() => setHoveredAgent(hub.id)}
            onPointerOut={() => setHoveredAgent(null)}
            onClick={() =>
              onSelectAgent(activeAgentId === hub.id ? null : hub.id)
            }
          />
        ))}

        {/* Task nodes */}
        <TaskNodes tasks={tasks} selectedAgentId={activeAgentId} />

        {/* Tool call particles */}
        {!reducedMotion && <ToolCallParticles particles={particles} />}

        {/* Background structure lines between all hubs */}
        <AgentEdges hubs={hubs} />

        {/* Tool cluster fixed nodes */}
        <ToolClusterNodes hubs={hubs} />

        {/* Sub-agent edges */}
        <SubAgentEdges edges={subAgentEdges} />

        {/* Executor heartbeat */}
        <ExecutorHeartbeat executorState={executorState} />

        <Ground />
      </>
    );
  },
);
NetworkScene.displayName = 'NetworkScene';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AgentForceGraphInner = forwardRef<AgentForceGraphHandle, AgentForceGraphProps>(
  function AgentForceGraph(
    {
      agents,
      toolEdges,
      flows,
      executorState,
      recentEvents,
      activeAgentId,
      onAgentSelect,
      backgroundColor = '#ffffff',
      shareColors,
      height = '100%',
      reducedMotion,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cameraApiRef = useRef<CameraApi | null>(null);
    const snapshotRef = useRef<(() => string | null) | null>(null);

    // Maintain hub and task state from props
    const [hubs, setHubs] = useState<AgentHubState[]>([]);
    const [tasks, setTasks] = useState<Map<string, TaskNodeState[]>>(new Map());
    const [particles, setParticles] = useState<ToolParticleState[]>([]);
    const [subAgentEdges, setSubAgentEdges] = useState<Array<{ parentId: string; childId: string; parentPos: THREE.Vector3; childPos: THREE.Vector3 }>>([]);

    // Update hubs from agents and flows
    useEffect(() => {
      const newHubs: AgentHubState[] = agents.map((agent, i) => {
        const flow = flows.get(agent.tokenAddress);
        const existingHub = hubs.find((h) => h.id === agent.tokenAddress);
        const position = existingHub?.position || new THREE.Vector3(
          Math.cos(i / Math.max(agents.length, 1) * Math.PI * 2) * 15,
          0,
          Math.sin(i / Math.max(agents.length, 1) * Math.PI * 2) * 15,
        );

        return {
          id: agent.tokenAddress,
          name: flow?.agent.name || agent.symbol || 'Unknown',
          role: flow?.agent.role || 'agent',
          position,
          radius: AGENT_GRAPH_CONFIG.hubBaseRadius + (agent.volume / (agents[0]?.volume || 1)) * (AGENT_GRAPH_CONFIG.hubMaxRadius - AGENT_GRAPH_CONFIG.hubBaseRadius),
          color: AGENT_COLOR_PALETTE[i % AGENT_COLOR_PALETTE.length],
          activeTasks: flow?.tasks.filter((t) => t.status !== 'completed' && t.status !== 'failed').length || 0,
          totalToolCalls: flow?.totalToolCalls || 0,
          isReasoning: false,
          pulseEvents: existingHub?.pulseEvents || [],
          spawnedAt: existingHub?.spawnedAt || Date.now(),
          errorShakeStart: existingHub?.errorShakeStart,
        };
      });

      setHubs(newHubs);
    }, [agents, flows]);

    // Update tasks from flows
    useEffect(() => {
      const newTasks = new Map<string, TaskNodeState[]>();

      for (const [agentId, flow] of flows) {
        const agentHub = hubs.find((h) => h.id === agentId);
        if (!agentHub) continue;

        const taskList: TaskNodeState[] = flow.tasks
          .slice(-AGENT_GRAPH_CONFIG.maxTaskNodes)
          .map((task, i) => ({
            id: task.taskId,
            agentId,
            description: task.description,
            status: task.status,
            position: agentHub.position.clone(),
            angle: (i / Math.max(flow.tasks.length, 1)) * Math.PI * 2,
            color: TASK_STATUS_COLORS[task.status] || AGENT_COLORS.taskWaiting,
            isNew: Date.now() - task.createdAt < 1000,
            createdAt: Date.now(),
          }));

        newTasks.set(agentId, taskList);
      }

      setTasks(newTasks);
    }, [flows, hubs]);

    // Process agent events for animations
    useEffect(() => {
      for (const event of recentEvents) {
        if (event.type === 'reasoning:start') {
          setHubs((prev) =>
            prev.map((h) =>
              h.id === event.agentId
                ? { ...h, isReasoning: true, reasoningStartTime: event.timestamp }
                : h,
            ),
          );
        } else if (event.type === 'reasoning:end') {
          setHubs((prev) =>
            prev.map((h) =>
              h.id === event.agentId ? { ...h, isReasoning: false } : h,
            ),
          );
        } else if (event.type === 'task:completed') {
          // Trigger green pulse ring on the agent hub
          setHubs((prev) =>
            prev.map((h) =>
              h.id === event.agentId
                ? { ...h, pulseEvents: [...h.pulseEvents.slice(-5), { timestamp: Date.now(), status: 'complete' as const }] }
                : h,
            ),
          );
        } else if (event.type === 'task:failed') {
          // Trigger error shake + red pulse on the agent hub
          setHubs((prev) =>
            prev.map((h) =>
              h.id === event.agentId
                ? {
                    ...h,
                    errorShakeStart: Date.now(),
                    pulseEvents: [...h.pulseEvents.slice(-5), { timestamp: Date.now(), status: 'failed' as const }],
                  }
                : h,
            ),
          );
        } else if (event.type === 'tool:started') {
          // Spawn a new tool call particle (outgoing)
          const agentHub = hubs.find((h) => h.id === event.agentId);
          if (agentHub && event.payload) {
            const toolCategory = (event.payload.toolCategory as string) || 'code';
            const toolClusterKey = toolCategory as keyof typeof TOOL_CLUSTER_POSITIONS;
            const clusterPos = TOOL_CLUSTER_POSITIONS[toolClusterKey] || TOOL_CLUSTER_POSITIONS.code;

            const newParticle: ToolParticleState = {
              id: event.eventId,
              agentId: event.agentId,
              toolCategory,
              startPos: agentHub.position.clone(),
              targetPos: new THREE.Vector3(clusterPos[0], 0, clusterPos[1]),
              progress: 0,
              path: [],
              createdAt: Date.now(),
              returning: false,
              prevPositions: [],
            };

            setParticles((prev) => [...prev.slice(-AGENT_GRAPH_CONFIG.maxToolParticles), newParticle]);
          }
        } else if (event.type === 'tool:completed') {
          // Spawn a return particle (tool cluster → agent)
          const agentHub = hubs.find((h) => h.id === event.agentId);
          if (agentHub && event.payload) {
            const toolCategory = (event.payload.toolCategory as string) || 'code';
            const toolClusterKey = toolCategory as keyof typeof TOOL_CLUSTER_POSITIONS;
            const clusterPos = TOOL_CLUSTER_POSITIONS[toolClusterKey] || TOOL_CLUSTER_POSITIONS.code;

            const returnParticle: ToolParticleState = {
              id: `${event.eventId}-return`,
              agentId: event.agentId,
              toolCategory,
              startPos: new THREE.Vector3(clusterPos[0], 0, clusterPos[1]),
              targetPos: agentHub.position.clone(),
              progress: 0,
              path: [],
              createdAt: Date.now(),
              returning: true,
              prevPositions: [],
            };

            setParticles((prev) => [...prev.slice(-AGENT_GRAPH_CONFIG.maxToolParticles), returnParticle]);
          }
        }
      }
    }, [recentEvents, hubs]);

    // Update particle progress and ghost trail
    useEffect(() => {
      const interval = setInterval(() => {
        setParticles((prev) =>
          prev
            .map((p) => {
              const newProgress = Math.min(p.progress + AGENT_GRAPH_CONFIG.toolParticleSpeed, 1);
              const t = newProgress;
              const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
              const curveOffset = p.returning ? -0.3 : 0.3;
              const currentPos = quadBezierPos(p.startPos, p.targetPos, curveOffset, eased);

              // Shift previous positions for trail
              const prevPositions = p.prevPositions ? [currentPos.clone(), ...p.prevPositions.slice(0, AGENT_GRAPH_CONFIG.trailGhostCount - 1)] : [currentPos.clone()];

              return { ...p, progress: newProgress, prevPositions };
            })
            .filter((p) => p.progress < 1),
        );
      }, 16); // ~60fps

      return () => clearInterval(interval);
    }, []);

    // Update sub-agent edges
    useEffect(() => {
      const edges: Array<{ parentId: string; childId: string; parentPos: THREE.Vector3; childPos: THREE.Vector3 }> = [];

      for (const [agentId, flow] of flows) {
        const parentHub = hubs.find((h) => h.id === agentId);
        if (!parentHub) continue;

        for (const subAgent of flow.subAgents) {
          const childHub = hubs.find((h) => h.id === subAgent.agentId);
          if (childHub) {
            edges.push({
              parentId: agentId,
              childId: subAgent.agentId,
              parentPos: parentHub.position,
              childPos: childHub.position,
            });
          }
        }
      }

      setSubAgentEdges(edges);
    }, [flows, hubs]);

    useImperativeHandle(ref, () => ({
      getCanvasElement: () => containerRef.current?.querySelector('canvas') ?? null,
      focusAgent: async (agentId, durationMs = 1200) => {
        const api = cameraApiRef.current;
        if (!api) return;
        const hub = hubs.find((h) => h.id === agentId);
        if (!hub) return;
        await api.animateTo(
          [hub.position.x, 30, hub.position.z + 15],
          [hub.position.x, 0, hub.position.z],
          durationMs,
        );
      },
      getAgentCount: () => hubs.length,
      takeSnapshot: () => {
        return snapshotRef.current?.() ?? null;
      },
    }));

    const [webglSupported, setWebglSupported] = useState(true);
    useEffect(() => {
      try {
        const c = document.createElement('canvas');
        const supported = !!(c.getContext('webgl2') || c.getContext('webgl'));
        setWebglSupported(supported);
      } catch {
        setWebglSupported(false);
      }
    }, []);

    if (!webglSupported) {
      return (
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 14,
              fontWeight: 400,
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            WebGL Not Supported
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              color: '#999',
            }}
          >
            Your browser does not support WebGL.
          </span>
        </div>
      );
    }

    return (
      <div ref={containerRef} style={{ width: '100%', height, position: 'relative' }}>
        <Canvas
          camera={{ fov: 45, near: 0.1, far: 1000, position: [0, 120, 60] }}
          style={{ background: shareColors?.background ?? backgroundColor }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 1.5]}
        >
          <CameraSetup apiRef={cameraApiRef} />
          <SnapshotHelper snapshotRef={snapshotRef} />
          <NetworkScene
            hubs={hubs}
            tasks={tasks}
            particles={particles}
            subAgentEdges={subAgentEdges}
            executorState={executorState}
            activeAgentId={activeAgentId}
            onSelectAgent={onAgentSelect}
            shareColors={shareColors}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </div>
    );
  },
);

export default memo(AgentForceGraphInner);
