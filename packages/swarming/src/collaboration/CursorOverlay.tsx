// ---------------------------------------------------------------------------
// CursorOverlay — Renders other users' cursors as colored spheres in 3D
//
// Each peer's cursor is shown as a small glowing sphere with a username label.
// Selected nodes get a highlight ring in the peer's color.
// ---------------------------------------------------------------------------

import React, { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Peer } from './types';

interface CursorOverlayProps {
  peers: Peer[];
}

const CURSOR_RADIUS = 0.25;
const LERP_SPEED = 0.15;

const PeerCursor = memo<{ peer: Peer }>(({ peer }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetPos = useRef(new THREE.Vector3());
  const currentPos = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  const color = useMemo(() => new THREE.Color(peer.color), [peer.color]);

  useFrame(() => {
    if (!meshRef.current || !peer.cursor) return;

    targetPos.current.set(...peer.cursor);

    if (!initialized.current) {
      currentPos.current.copy(targetPos.current);
      initialized.current = true;
    } else {
      currentPos.current.lerp(targetPos.current, LERP_SPEED);
    }

    meshRef.current.position.copy(currentPos.current);
  });

  if (!peer.cursor) return null;

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[CURSOR_RADIUS, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>
      {/* Username label floating above cursor */}
      <Html
        position={peer.cursor}
        center
        distanceFactor={40}
        style={{ pointerEvents: 'none', transform: 'translateY(-20px)' }}
      >
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 10,
            fontWeight: 700,
            color: '#fff',
            background: peer.color,
            padding: '1px 5px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            opacity: 0.9,
          }}
        >
          {peer.username}
        </div>
      </Html>
    </group>
  );
});
PeerCursor.displayName = 'PeerCursor';

/** Renders selection rings around nodes that other peers have selected */
const PeerSelections = memo<{ peers: Peer[] }>(({ peers }) => {
  const selections = peers.filter((p) => p.selectedNode && p.cursor);

  if (selections.length === 0) return null;

  return (
    <group>
      {selections.map((peer) => (
        <mesh key={`sel-${peer.id}`} position={peer.cursor!}>
          <ringGeometry args={[0.5, 0.65, 32]} />
          <meshBasicMaterial
            color={peer.color}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
});
PeerSelections.displayName = 'PeerSelections';

/** Main overlay — renders all peer cursors and selections */
export const CursorOverlay = memo<CursorOverlayProps>(({ peers }) => {
  const activePeers = peers.filter((p) => p.cursor !== null);

  return (
    <group>
      {activePeers.map((peer) => (
        <PeerCursor key={peer.id} peer={peer} />
      ))}
      <PeerSelections peers={peers} />
    </group>
  );
});
CursorOverlay.displayName = 'CursorOverlay';
