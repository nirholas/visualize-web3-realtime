'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import ToolPageShell from '@/features/Tools/ToolPageShell';

// ---------------------------------------------------------------------------
// Procedural AI Agent
// ---------------------------------------------------------------------------
interface AgentDef {
  id: number;
  name: string;
  color: string;
  role: string;
  homePosition: THREE.Vector3;
}

const AGENT_ROLES = ['Planner', 'Coder', 'Reviewer', 'Tester', 'Deployer', 'Monitor'];
const AGENT_COLORS = ['#c084fc', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#fb923c'];

function createAgents(count: number): AgentDef[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Agent-${i.toString(16).toUpperCase().padStart(2, '0')}`,
    color: AGENT_COLORS[i % AGENT_COLORS.length],
    role: AGENT_ROLES[i % AGENT_ROLES.length],
    homePosition: new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      0.3,
      (Math.random() - 0.5) * 8,
    ),
  }));
}

// ---------------------------------------------------------------------------
// Agent mesh — procedural body (capsule + head + antenna)
// ---------------------------------------------------------------------------
function Agent({ agent }: { agent: AgentDef }) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseRef = useRef(Math.random() * Math.PI * 2);
  const targetRef = useRef(agent.homePosition.clone());
  const moveTimerRef = useRef(0);
  const emissiveColor = useMemo(() => new THREE.Color(agent.color), [agent.color]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    phaseRef.current += delta;

    // Wander behavior: pick a new target every few seconds
    moveTimerRef.current -= delta;
    if (moveTimerRef.current <= 0) {
      moveTimerRef.current = 2 + Math.random() * 4;
      targetRef.current.set(
        agent.homePosition.x + (Math.random() - 0.5) * 3,
        0.3,
        agent.homePosition.z + (Math.random() - 0.5) * 3,
      );
    }

    // Smooth movement toward target
    groupRef.current.position.lerp(targetRef.current, delta * 0.8);

    // Bob up and down
    groupRef.current.position.y = 0.3 + Math.sin(t * 2 + agent.id) * 0.05;

    // Face movement direction
    const dir = targetRef.current.clone().sub(groupRef.current.position);
    if (dir.length() > 0.01) {
      const angle = Math.atan2(dir.x, dir.z);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, angle, delta * 3);
    }
  });

  return (
    <group ref={groupRef} position={agent.homePosition.toArray()}>
      {/* Body — capsule approximation */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.12, 0.3, 4, 8]} />
        <meshStandardMaterial color={agent.color} emissive={emissiveColor} emissiveIntensity={0.3} roughness={0.4} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={agent.color} emissive={emissiveColor} emissiveIntensity={0.5} roughness={0.3} />
      </mesh>

      {/* Antenna */}
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.08, 4]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.54, 0]}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshBasicMaterial color={agent.color} />
      </mesh>

      {/* Name label */}
      <Text
        position={[0, 0.7, 0]}
        fontSize={0.06}
        color="#888888"
        anchorX="center"
        anchorY="bottom"
        font="https://fonts.gstatic.com/s/ibmplexmono/v19/-F63fjptAgt5VM-kVkqdyU8n1iIq131nj-otFQ.woff2"
      >
        {agent.name}
      </Text>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Procedural room — floor + grid + desks
// ---------------------------------------------------------------------------
function ProceduralRoom() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#111118" roughness={0.9} />
      </mesh>

      {/* Grid lines on floor */}
      <gridHelper args={[16, 32, '#1a1a2e', '#1a1a2e']} position={[0, 0.001, 0]} />

      {/* Procedural desks */}
      {Array.from({ length: 6 }, (_, i) => {
        const x = (i % 3 - 1) * 3;
        const z = Math.floor(i / 3) * 3 - 1.5;
        return (
          <group key={i} position={[x, 0, z]}>
            {/* Desk surface */}
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[0.8, 0.04, 0.5]} />
              <meshStandardMaterial color="#1e1e2e" roughness={0.7} />
            </mesh>
            {/* Desk legs */}
            {[[-0.35, 0.24, -0.2], [0.35, 0.24, -0.2], [-0.35, 0.24, 0.2], [0.35, 0.24, 0.2]].map(
              ([lx, ly, lz], j) => (
                <mesh key={j} position={[lx, ly, lz]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.48, 4]} />
                  <meshStandardMaterial color="#2a2a3e" />
                </mesh>
              ),
            )}
            {/* Glowing monitor */}
            <mesh position={[0, 0.7, -0.1]}>
              <boxGeometry args={[0.3, 0.2, 0.01]} />
              <meshBasicMaterial color={AGENT_COLORS[i % AGENT_COLORS.length]} opacity={0.3} transparent />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Communication beams between agents
// ---------------------------------------------------------------------------
function CommBeams({ agents }: { agents: AgentDef[] }) {
  const lineRef = useRef<THREE.LineSegments>(null);

  useFrame((state) => {
    if (!lineRef.current) return;
    const t = state.clock.getElapsedTime();
    // Every ~2 seconds, randomly connect some agents
    const positions: number[] = [];
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        if (Math.sin(t * 0.5 + i * 7 + j * 13) > 0.7) {
          const a = agents[i].homePosition;
          const b = agents[j].homePosition;
          positions.push(a.x, 0.5, a.z, b.x, 0.5, b.z);
        }
      }
    }
    const geo = lineRef.current.geometry as THREE.BufferGeometry;
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color="#c084fc" opacity={0.12} transparent />
    </lineSegments>
  );
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
function AIOfficeScene({ agentCount }: { agentCount: number }) {
  const agents = useMemo(() => createAgents(agentCount), [agentCount]);

  return (
    <>
      <color attach="background" args={['#08080e']} />
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 6, 0]} intensity={0.8} color="#c084fc" />
      <pointLight position={[-4, 3, -4]} intensity={0.4} color="#22d3ee" />
      <pointLight position={[4, 3, 4]} intensity={0.4} color="#34d399" />

      <ProceduralRoom />
      {agents.map((a) => (
        <Agent key={a.id} agent={a} />
      ))}
      <CommBeams agents={agents} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0.5, 0]}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AIOfficeDemo() {
  const [agentCount, setAgentCount] = useState(8);

  return (
    <ToolPageShell
      title="AI Office"
      description="Procedural 3D agent world"
      externalUrl="https://contra.com/community/ssYxrnPj-explore-ai-office-a-3-d-world"
    >
      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10,
          background: 'rgba(10,10,15,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          fontSize: 11,
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#888', width: 60 }}>Agents</span>
          <input
            type="range" min={2} max={24} step={1}
            value={agentCount}
            onChange={(e) => setAgentCount(Number(e.target.value))}
            style={{ width: 100 }}
          />
          <span style={{ color: '#c084fc', width: 30, textAlign: 'right' }}>{agentCount}</span>
        </label>
        <div style={{ fontSize: 9, color: '#555' }}>
          No imported assets — pure math/code
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 10,
          background: 'rgba(10,10,15,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          padding: '10px 14px',
          display: 'flex',
          gap: 16,
          fontSize: 10,
        }}
      >
        {AGENT_ROLES.map((role, i) => (
          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: AGENT_COLORS[i] }} />
            <span style={{ color: '#aaa' }}>{role}</span>
          </div>
        ))}
      </div>

      <Canvas camera={{ position: [6, 5, 6], fov: 50 }} style={{ width: '100%', height: '100%' }}>
        <AIOfficeScene agentCount={agentCount} />
      </Canvas>
    </ToolPageShell>
  );
}
