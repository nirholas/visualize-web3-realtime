/**
 * TaskInspector — detailed tooltip shown when hovering over a task node
 *
 * Displays task description, status, duration, tool calls made, and
 * any sub-agents spawned. Rendered via drei's <Html> overlay.
 */
'use client';

import { Html } from '@react-three/drei';
import { memo } from 'react';
import type { AgentTask, AgentToolCall } from '@web3viz/core';
import { TASK_STATUS_COLORS } from './constants';

interface TaskInspectorProps {
  task: AgentTask;
  toolCalls: AgentToolCall[];
  position: [number, number, number];
  visible: boolean;
}

export const TaskInspector = memo<TaskInspectorProps>(
  ({ task, toolCalls, position, visible }) => {
    if (!visible) return null;

    const statusColor = TASK_STATUS_COLORS[task.status] || '#999999';
    const duration =
      task.startedAt && task.endedAt
        ? `${(task.endedAt - task.startedAt) / 1000}s`
        : task.startedAt
          ? 'running...'
          : '—';

    return (
      <Html
        position={position}
        center
        style={{
          pointerEvents: 'none',
          opacity: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            transform: 'translateY(-12px)',
          }}
        >
          {/* Task info panel */}
          <div
            style={{
              background: '#1a1a1a',
              color: '#ffffff',
              padding: '10px 14px',
              borderRadius: 8,
              fontFamily: "'IBM Plex Mono', monospace",
              whiteSpace: 'nowrap',
              userSelect: 'none',
              minWidth: 200,
              fontSize: 10,
              lineHeight: '1.4',
            }}
          >
            {/* Description */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {task.description.slice(0, 40)}
              {task.description.length > 40 ? '…' : ''}
            </div>

            {/* Status badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: statusColor,
                }}
              />
              <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                {task.status}
              </span>
            </div>

            {/* Duration */}
            {duration !== '—' && (
              <div style={{ marginBottom: 6, color: '#aaaaaa' }}>
                Duration: {duration}
              </div>
            )}

            {/* Tool calls count */}
            {toolCalls.length > 0 && (
              <div style={{ marginBottom: 6, color: '#aaaaaa' }}>
                Tools: {toolCalls.length}
              </div>
            )}

            {/* Error message if failed */}
            {task.status === 'failed' && task.error && (
              <div
                style={{
                  marginTop: 6,
                  paddingTop: 6,
                  borderTop: '1px solid #444444',
                  color: '#f87171',
                  fontSize: 9,
                }}
              >
                {task.error.slice(0, 50)}
                {task.error.length > 50 ? '…' : ''}
              </div>
            )}
          </div>
        </div>
      </Html>
    );
  },
);

TaskInspector.displayName = 'TaskInspector';
