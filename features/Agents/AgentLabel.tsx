/**
 * AgentLabel — tooltip shown when hovering over an agent hub node
 *
 * Similar to ProtocolLabel but displays agent name, role, task count,
 * and tool call count. Rendered via drei's <Html> to stay crisp on screen.
 */
'use client';

import { Html } from '@react-three/drei';
import { memo } from 'react';

interface AgentLabelProps {
  /** Agent name */
  name: string;
  /** Agent role/type */
  role: string;
  /** Number of active tasks */
  activeTasks: number;
  /** Total tool calls made */
  toolCalls: number;
  /** 3D position to anchor the label */
  position: [number, number, number];
  /** Show/hide the label */
  visible: boolean;
}

export const AgentLabel = memo<AgentLabelProps>(
  ({ name, role, activeTasks, toolCalls, position, visible }) => {
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
          {/* Pill background */}
          <div
            style={{
              background: '#1a1a1a',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: 20,
              fontFamily: "'IBM Plex Mono', monospace",
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {/* Agent name (bold) */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 4,
              }}
            >
              {name}
            </div>
            {/* Role and stats (lighter) */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 400,
                letterSpacing: '0.04em',
                color: '#cccccc',
              }}
            >
              {role} · {activeTasks} task{activeTasks !== 1 ? 's' : ''} · {toolCalls}
            </div>
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

AgentLabel.displayName = 'AgentLabel';
