'use client';

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useRef } from 'react';
import * as THREE from 'three';

// ============================================================================
// "YOU ARE HERE" floating marker — dark pill with downward caret
// ============================================================================

interface YouAreHereMarkerProps {
  /** Hub index to track in driftedPositions */
  hubIndex: number;
  /** Called when the "x" dismiss button is clicked */
  onDismiss: () => void;
  /** Ref to the array of drifted hub positions (updated each frame by PrimaryNodes) */
  positionsRef: React.RefObject<THREE.Vector3[]>;
}

const YouAreHereMarker = memo<YouAreHereMarkerProps>(
  ({ hubIndex, positionsRef, onDismiss }) => {
    const groupRef = useRef<THREE.Group>(null);

    // Gentle pulse scale for the marker
    const scaleRef = useRef(1);

    useFrame((state) => {
      if (!groupRef.current || !positionsRef.current?.[hubIndex]) return;
      const p = positionsRef.current[hubIndex];
      // Float above the node (offset Y by ~2.5 to clear the enlarged highlighted node)
      groupRef.current.position.set(p.x, p.y + 2.8, p.z);

      // Gentle hover pulse
      const t = state.clock.getElapsedTime();
      scaleRef.current = 1 + Math.sin(t * 2) * 0.03;
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
  },
);

YouAreHereMarker.displayName = 'YouAreHereMarker';

export default YouAreHereMarker;
