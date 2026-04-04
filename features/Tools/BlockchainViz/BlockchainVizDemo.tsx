'use client';

import { useRef, useMemo, useCallback, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import ToolPageShell from '@/features/Tools/ToolPageShell';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PeerNode {
  id: number;
  position: THREE.Vector3;
  color: string;
  validated: number; // block height
}

interface DataPacket {
  id: number;
  from: number;
  to: number;
  progress: number;
  speed: number;
  type: 'block' | 'tx' | 'discovery';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PACKET_COLORS: Record<string, string> = {
  block: '#c084fc',
  tx: '#22d3ee',
  discovery: '#34d399',
};

// ---------------------------------------------------------------------------
// Generate a P2P mesh network
// ---------------------------------------------------------------------------
function generateNetwork(peerCount: number): { peers: PeerNode[]; connections: [number, number][] } {
  const peers: PeerNode[] = [];
  const connections: [number, number][] = [];

  for (let i = 0; i < peerCount; i++) {
    const theta = (i / peerCount) * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 4 + Math.random() * 3;
    peers.push({
      id: i,
      position: new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ),
      color: '#627eea',
      validated: Math.floor(Math.random() * 1000),
    });
  }

  // Connect each peer to 2-4 nearest neighbors
  for (let i = 0; i < peerCount; i++) {
    const distances = peers
      .map((p, j) => ({ j, d: peers[i].position.distanceTo(p.position) }))
      .filter((x) => x.j !== i)
      .sort((a, b) => a.d - b.d);
    const linkCount = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < Math.min(linkCount, distances.length); k++) {
      const pair: [number, number] = [Math.min(i, distances[k].j), Math.max(i, distances[k].j)];
      if (!connections.some(([a, b]) => a === pair[0] && b === pair[1])) {
        connections.push(pair);
      }
    }
  }

  return { peers, connections };
}

// ---------------------------------------------------------------------------
// Network edges (lines)
// ---------------------------------------------------------------------------
function NetworkEdges({ peers, connections }: { peers: PeerNode[]; connections: [number, number][] }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (const [a, b] of connections) {
      positions.push(peers[a].position.x, peers[a].position.y, peers[a].position.z);
      positions.push(peers[b].position.x, peers[b].position.y, peers[b].position.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [peers, connections]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#ffffff" opacity={0.06} transparent />
    </lineSegments>
  );
}

// ---------------------------------------------------------------------------
// Network peer nodes (instanced spheres)
// ---------------------------------------------------------------------------
function NetworkNodes({ peers }: { peers: PeerNode[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useMemo(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < peers.length; i++) {
      dummy.position.copy(peers[i].position);
      dummy.scale.setScalar(0.12);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      color.set(peers[i].color);
      meshRef.current.setColorAt(i, color);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [peers, dummy, color]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, peers.length]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------------------
// Animated data packets (particles)
// ---------------------------------------------------------------------------
function DataPackets({
  peers,
  connections,
  packetRate,
}: {
  peers: PeerNode[];
  connections: [number, number][];
  packetRate: number;
}) {
  const packetsRef = useRef<DataPacket[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);
  const MAX_PACKETS = 300;
  const nextIdRef = useRef(0);
  const spawnTimerRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Spawn new packets
    spawnTimerRef.current += delta;
    const interval = 1 / Math.max(packetRate, 0.1);
    while (spawnTimerRef.current >= interval && packetsRef.current.length < MAX_PACKETS) {
      spawnTimerRef.current -= interval;
      const conn = connections[Math.floor(Math.random() * connections.length)];
      const types: DataPacket['type'][] = ['block', 'tx', 'tx', 'tx', 'discovery'];
      const direction = Math.random() > 0.5;
      packetsRef.current.push({
        id: nextIdRef.current++,
        from: direction ? conn[0] : conn[1],
        to: direction ? conn[1] : conn[0],
        progress: 0,
        speed: 0.3 + Math.random() * 0.7,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }

    // Update packets
    const alive: DataPacket[] = [];
    for (const p of packetsRef.current) {
      p.progress += p.speed * delta;
      if (p.progress < 1) alive.push(p);
    }
    packetsRef.current = alive;

    // Update instanced mesh
    for (let i = 0; i < MAX_PACKETS; i++) {
      if (i < alive.length) {
        const p = alive[i];
        const a = peers[p.from].position;
        const b = peers[p.to].position;
        dummy.position.lerpVectors(a, b, p.progress);
        const s = 0.04 + Math.sin(p.progress * Math.PI) * 0.03;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        colorObj.set(PACKET_COLORS[p.type]);
        meshRef.current.setColorAt(i, colorObj);
      } else {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PACKETS]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------------------
// Scene composition
// ---------------------------------------------------------------------------
function BlockchainScene({ peerCount, packetRate }: { peerCount: number; packetRate: number }) {
  const { peers, connections } = useMemo(() => generateNetwork(peerCount), [peerCount]);

  return (
    <>
      <color attach="background" args={['#0a0a12']} />
      <ambientLight intensity={0.5} />
      <NetworkEdges peers={peers} connections={connections} />
      <NetworkNodes peers={peers} />
      <DataPackets peers={peers} connections={connections} packetRate={packetRate} />
      <OrbitControls enableDamping dampingFactor={0.05} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BlockchainVizDemo() {
  const [peerCount, setPeerCount] = useState(60);
  const [packetRate, setPacketRate] = useState(10);

  return (
    <ToolPageShell
      title="Blockchain Visualizer"
      description="P2P network simulation"
      externalUrl="https://blockchain-visualizer.netlify.app/"
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
          <span style={{ color: '#888', width: 70 }}>Peers</span>
          <input
            type="range" min={10} max={150} step={5}
            value={peerCount}
            onChange={(e) => setPeerCount(Number(e.target.value))}
            style={{ width: 100 }}
          />
          <span style={{ color: '#627eea', width: 30, textAlign: 'right' }}>{peerCount}</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#888', width: 70 }}>Packets/s</span>
          <input
            type="range" min={1} max={50} step={1}
            value={packetRate}
            onChange={(e) => setPacketRate(Number(e.target.value))}
            style={{ width: 100 }}
          />
          <span style={{ color: '#22d3ee', width: 30, textAlign: 'right' }}>{packetRate}</span>
        </label>
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
        {Object.entries(PACKET_COLORS).map(([type, col]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
            <span style={{ color: '#aaa', textTransform: 'capitalize' }}>{type}</span>
          </div>
        ))}
      </div>

      <Canvas camera={{ position: [0, 0, 12], fov: 55 }} style={{ width: '100%', height: '100%' }}>
        <BlockchainScene peerCount={peerCount} packetRate={packetRate} />
      </Canvas>
    </ToolPageShell>
  );
}
