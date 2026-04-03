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
import { MapControls } from '@react-three/drei';
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
}

export interface AgentForceGraphHandle {
  getCanvasElement: () => HTMLCanvasElement | null;
  focusAgent: (agentId: string, durationMs?: number) => Promise<void>;
  getAgentCount: () => number;
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
  onPointerOver: () => void;
  onPointerOut: () => void;
  onClick: () => void;
}

const AgentHubNode = memo<AgentHubNodeProps>(
  ({ hub, isActive, isDimmed, isHovered, onPointerOver, onPointerOut, onClick }) => {
    const groupRef = useRef<THREE.Group>(null!);
    const meshRef = useRef<THREE.Mesh>(null!);
    const haloRef = useRef<THREE.Mesh>(null!);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const haloMaterialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const targetColor = useRef(new THREE.Color(hub.color));
    const targetOpacity = useRef(1);

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

      // Breathing animation when idle
      const breatheTime = (state.clock.getElapsedTime() * 1000) % AGENT_GRAPH_CONFIG.breathingPeriod;
      const breathAmount = Math.sin((breatheTime / AGENT_GRAPH_CONFIG.breathingPeriod) * Math.PI * 2) * AGENT_GRAPH_CONFIG.breathingAmplitude;
      const baseScale = hub.radius;
      meshRef.current.scale.setScalar(baseScale * (1 + breathAmount));

      // Pulse when active
      if (isActive) {
        const pulse = 1 + Math.sin(state.clock.getElapsedTime() * Math.PI) * 0.08;
        meshRef.current.scale.multiplyScalar(pulse);
      }

      // Halo for reasoning
      if (hub.isReasoning && haloRef.current && haloMaterialRef.current) {
        const reasoningDuration = (Date.now() - (hub.reasoningStartTime || 0)) / 1000;
        const haloScale = 1 + Math.sin(reasoningDuration * 2) * 0.3;
        const haloOpacity = 0.3 * (1 - Math.min(reasoningDuration / 2, 1));
        haloRef.current.scale.setScalar(baseScale * haloScale * 2);
        haloMaterialRef.current.opacity = haloOpacity;
      }

      // Color lerp
      const lerpFactor = 1 - Math.exp(-10 * delta);
      materialRef.current.color.lerp(targetColor.current, lerpFactor);
      materialRef.current.opacity += (targetOpacity.current - materialRef.current.opacity) * lerpFactor;
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

        {/* Reasoning halo */}
        {hub.isReasoning && (
          <mesh ref={haloRef}>
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

    for (const [agentId, taskList] of tasks) {
      for (const task of taskList) {
        if (instanceIndex >= maxInstances) break;

        // Orbital position
        const orbitTime = state.clock.getElapsedTime() * AGENT_GRAPH_CONFIG.taskOrbitSpeed;
        const angle = task.angle + orbitTime;
        const orbitX = Math.cos(angle) * AGENT_GRAPH_CONFIG.taskOrbitRadius;
        const orbitZ = Math.sin(angle) * AGENT_GRAPH_CONFIG.taskOrbitRadius;

        tempObj.position.set(
          task.position.x + orbitX,
          task.position.y + 0.2 * Math.sin(angle * 2),
          task.position.z + orbitZ,
        );
        tempObj.scale.setScalar(AGENT_GRAPH_CONFIG.taskNodeRadius);
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

        // Fade out completed/failed tasks
        if (task.status === 'completed' || task.status === 'failed') {
          const fadeTime = (state.clock.getElapsedTime() * 1000) - task.createdAt;
          const fadeOpacity = Math.max(0, 1 - fadeTime / AGENT_GRAPH_CONFIG.pulseDuration);
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
      frustumCulled={false}
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

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let instanceIndex = 0;
    const maxInstances = AGENT_GRAPH_CONFIG.maxToolParticles;

    for (const particle of particles) {
      if (instanceIndex >= maxInstances) break;

      // Bezier interpolation along path
      const t = particle.progress;
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      let position: THREE.Vector3;
      if (particle.path.length >= 2) {
        // Cubic bezier: start, start control, end control, end
        const p0 = particle.startPos;
        const p3 = particle.targetPos;
        const p1 = new THREE.Vector3().addVectors(p0, p3).multiplyScalar(0.3).add(p0);
        const p2 = new THREE.Vector3().addVectors(p0, p3).multiplyScalar(0.7).add(p3);

        position = new THREE.Vector3()
          .copy(p0)
          .multiplyScalar((1 - eased) ** 3)
          .addScaledVector(p1, 3 * (1 - eased) ** 2 * eased)
          .addScaledVector(p2, 3 * (1 - eased) * eased ** 2)
          .addScaledVector(p3, eased ** 3);
      } else {
        position = new THREE.Vector3().lerpVectors(particle.startPos, particle.targetPos, eased);
      }

      tempObj.position.copy(position);
      tempObj.scale.setScalar(0.1);
      tempObj.updateMatrix();
      mesh.setMatrixAt(instanceIndex, tempObj.matrix);

      // Color with fade
      const fadeOpacity = 1 - (eased * 0.3);
      tempColor.set(AGENT_COLORS.toolParticle).multiplyScalar(fadeOpacity);
      mesh.setColorAt(instanceIndex, tempColor);

      instanceIndex++;
    }

    mesh.count = instanceIndex;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, AGENT_GRAPH_CONFIG.maxToolParticles]}
      frustumCulled={false}
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

      {/* Status text (via Html) */}
      {executorState && (
        <group position={[0, -1.5, 0]}>
          {/* Note: In a real implementation, use <Html> from drei for text rendering */}
        </group>
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
    camera.position.set(0, 40, 20);
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
      maxDistance={150}
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
        <ToolCallParticles particles={particles} />

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
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cameraApiRef = useRef<CameraApi | null>(null);

    // Maintain hub and task state from props
    const [hubs, setHubs] = useState<AgentHubState[]>([]);
    const [tasks, setTasks] = useState<Map<string, TaskNodeState[]>>(new Map());
    const [particles, setParticles] = useState<ToolParticleState[]>([]);
    const [subAgentEdges, setSubAgentEdges] = useState<Array<{ parentId: string; childId: string; parentPos: THREE.Vector3; childPos: THREE.Vector3 }>>([]);

    // Update hubs from agents and flows
    useEffect(() => {
      const newHubs: AgentHubState[] = agents.map((agent, i) => {
        const flow = flows.get(agent.mint);
        const existingHub = hubs.find((h) => h.id === agent.mint);
        const position = existingHub?.position || new THREE.Vector3(
          Math.cos(i / Math.max(agents.length, 1) * Math.PI * 2) * 15,
          0,
          Math.sin(i / Math.max(agents.length, 1) * Math.PI * 2) * 15,
        );

        return {
          id: agent.mint,
          name: flow?.agent.name || agent.symbol || 'Unknown',
          role: flow?.agent.role || 'agent',
          position,
          radius: AGENT_GRAPH_CONFIG.hubBaseRadius + (agent.volumeSol / (agents[0]?.volumeSol || 1)) * (AGENT_GRAPH_CONFIG.hubMaxRadius - AGENT_GRAPH_CONFIG.hubBaseRadius),
          color: AGENT_COLOR_PALETTE[i % AGENT_COLOR_PALETTE.length],
          activeTasks: flow?.tasks.filter((t) => t.status !== 'completed' && t.status !== 'failed').length || 0,
          totalToolCalls: flow?.totalToolCalls || 0,
          isReasoning: false,
          pulseEvents: [],
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
        } else if (event.type === 'tool:started') {
          // Spawn a new tool call particle
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
            };

            setParticles((prev) => [...prev.slice(-AGENT_GRAPH_CONFIG.maxToolParticles), newParticle]);
          }
        }
      }
    }, [recentEvents, hubs]);

    // Update particle progress
    useEffect(() => {
      const interval = setInterval(() => {
        setParticles((prev) =>
          prev
            .map((p) => ({
              ...p,
              progress: Math.min(p.progress + AGENT_GRAPH_CONFIG.toolParticleSpeed, 1),
            }))
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
          camera={{ fov: 45, near: 0.1, far: 500, position: [0, 40, 20] }}
          style={{ background: shareColors?.background ?? backgroundColor }}
          gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
          dpr={[1, 1.5]}
        >
          <CameraSetup apiRef={cameraApiRef} />
          <NetworkScene
            hubs={hubs}
            tasks={tasks}
            particles={particles}
            subAgentEdges={subAgentEdges}
            executorState={executorState}
            activeAgentId={activeAgentId}
            onSelectAgent={onAgentSelect}
            shareColors={shareColors}
          />
        </Canvas>
      </div>
    );
  },
);

export default memo(AgentForceGraphInner);
