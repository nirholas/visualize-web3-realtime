'use client';

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useRef } from 'react';
import * as THREE from 'three';

// ============================================================================
// "YOU ARE HERE" floating marker — dark pill with downward caret
// ============================================================================

interface YouAreHereMarkerProps {
  /** Ref to the current 3D world-space position of the node to track (updated each frame) */
  positionRef: React.RefObject<THREE.Vector3 | null>;
  /** Called when the "x" dismiss button is clicked */
  onDismiss: () => void;
}

const YouAreHereMarker = memo<YouAreHereMarkerProps>(({ positionRef, onDismiss }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const p = positionRef.current;
    if (!p) return;
    // Float above the agent node
    groupRef.current.position.set(p.x, p.y + 2.8, p.z);
    // Gentle hover pulse on the whole group
    const pulse = 1 + Math.sin(state.clock.getElapsedTime() * 2) * 0.03;
    groupRef.current.scale.setScalar(pulse);
  });

  return (
    <group ref={groupRef}>
      <Html center distanceFactor={20} zIndexRange={[20, 10]}>
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto',
            userSelect: 'none',
          }}
        >
          {/* Pill */}
          <div
            style={{
              alignItems: 'center',
              background: '#1a1a1a',
              borderRadius: 20,
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              color: '#ffffff',
              display: 'flex',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 11,
              fontWeight: 600,
              gap: 8,
              letterSpacing: '0.08em',
              padding: '6px 16px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            YOU ARE HERE
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              style={{
                alignItems: 'center',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                fontSize: 10,
                height: 16,
                justifyContent: 'center',
                lineHeight: 1,
                marginLeft: 2,
                padding: 0,
                width: 16,
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
          {/* Downward caret / arrow */}
          <div
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '8px solid #1a1a1a',
              height: 0,
              width: 0,
            }}
          />
        </div>
      </Html>
    </group>
  );
});

YouAreHereMarker.displayName = 'YouAreHereMarker';

export default YouAreHereMarker;
