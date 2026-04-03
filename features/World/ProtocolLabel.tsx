/**
 * ProtocolLabel — dark pill tooltip shown on hover over a protocol hub node.
 *
 * Rendered via @react-three/drei's <Html> so it tracks the 3-D position of
 * the hub sphere while staying a crisp DOM overlay.
 */
'use client';

import { Html } from '@react-three/drei';
import { memo } from 'react';

interface ProtocolLabelProps {
  name: string;
  visible: boolean;
  position: [number, number, number];
}

export const ProtocolLabel = memo<ProtocolLabelProps>(
  ({ name, visible, position }) => {
    if (!visible) return null;

    return (
      <Html
        position={position}
        center
        style={{
          pointerEvents: 'none',
          transition: 'opacity 150ms ease',
          opacity: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: 'translateY(-12px)',
          }}
        >
          {/* Pill */}
          <div
            style={{
              background: '#1a1a1a',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: 20,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {name}
          </div>
          {/* Downward caret */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #1a1a1a',
              marginTop: -1,
            }}
          />
        </div>
      </Html>
    );
  },
);

ProtocolLabel.displayName = 'ProtocolLabel';
