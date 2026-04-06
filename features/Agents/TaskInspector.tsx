/**
 * TaskInspector — Detailed slide-out panel for task inspection
 *
 * Shows full task details: agent, status, duration, tool calls with streaming output,
 * sub-agents spawned, and reasoning text. Slides in from the right side.
 */
'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import type { AgentTask, AgentToolCall, AgentIdentity, AgentEvent } from '@web3viz/core';
import { AgentStatusIndicator } from './AgentStatusIndicator';
import { TASK_STATUS_COLORS } from './constants';

interface TaskInspectorPanelProps {
  task: AgentTask | null;
  agent: AgentIdentity | null;
  toolCalls: AgentToolCall[];
  subAgents: AgentIdentity[];
  recentEvents: AgentEvent[];
  onClose: () => void;
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed':
      return '✓';
    case 'failed':
      return '✗';
    case 'in-progress':
      return '⏳';
    default:
      return '●';
  }
}

function getToolStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return '#34d399';
    case 'failed':
      return '#f87171';
    case 'streaming':
    case 'started':
      return '#60a5fa';
    default:
      return '#9ca3af';
  }
}

// Get latest reasoning text from events
function getLatestReasoning(events: AgentEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const evt = events[i];
    if (evt.type === 'reasoning:update' || evt.type === 'reasoning:start') {
      const text = evt.payload?.reasoning || evt.payload?.text;
      if (typeof text === 'string') return text;
    }
  }
  return null;
}

export const TaskInspectorPanel = memo<TaskInspectorPanelProps>(
  ({ task, agent, toolCalls, subAgents, recentEvents, onClose }) => {
    if (!task || !agent) return null;

    const statusColor = TASK_STATUS_COLORS[task.status] || '#999999';
    const statusIcon = getStatusIcon(task.status);

    const [duration, setDuration] = useState('—');
    useEffect(() => {
      const compute = () => {
        if (task.startedAt && task.endedAt) {
          return formatDuration(task.endedAt - task.startedAt);
        }
        if (task.startedAt) {
          return formatDuration(Date.now() - task.startedAt) + ' (running)';
        }
        return '—';
      };
      setDuration(compute());
      if (task.startedAt && !task.endedAt) {
        const id = setInterval(() => setDuration(compute()), 1_000);
        return () => clearInterval(id);
      }
    }, [task.startedAt, task.endedAt]);

    const reasoning = useMemo(() => getLatestReasoning(recentEvents), [recentEvents]);

    // Filter tool calls for this task
    const taskToolCalls = useMemo(() => {
      return toolCalls.filter((tc) => tc.taskId === task.taskId);
    }, [toolCalls, task.taskId]);

    // Responsive: detect mobile/tablet (deferred to avoid hydration mismatch)
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    useEffect(() => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
    }, []);

    // Panel positioning: full-screen on mobile, bottom sheet on tablet, right slide-in on desktop
    const panelStyle: React.CSSProperties = isMobile
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          background: 'rgba(10,10,15,0.98)',
          backdropFilter: 'blur(8px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
          animation: 'slideUp 0.3s ease-out',
          fontFamily: "'IBM Plex Mono', monospace",
        }
      : isTablet
      ? {
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: '50vh',
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(192,132,252,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
          animation: 'slideUp 0.3s ease-out',
          fontFamily: "'IBM Plex Mono', monospace",
        }
      : {
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 320,
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(8px)',
          borderLeft: '1px solid rgba(192,132,252,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
          animation: 'slideIn 0.3s ease-out',
          fontFamily: "'IBM Plex Mono', monospace",
        };

    return (
      <>
        {/* Backdrop */}
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 39,
          }}
        />

        {/* Panel */}
        <div
          role="dialog"
          aria-label="Task inspector"
          style={panelStyle}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#9ca3af',
                  marginBottom: 4,
                }}
              >
                TASK
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  wordBreak: 'break-word',
                }}
              >
                {task.description.slice(0, 60)}
                {task.description.length > 60 ? '…' : ''}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close task inspector"
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: 16,
                padding: '4px 8px',
                marginLeft: 8,
                outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.outline = '2px solid #c084fc'; }}
              onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '12px 0',
            }}
          >
            {/* Agent info */}
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ fontSize: 8, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Agent
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 4,
                }}
              >
                <AgentStatusIndicator status={task.status === 'in-progress' ? 'active' : 'idle'} size="sm" />
                <div>
                  <div style={{ fontSize: 9, color: '#c084fc', fontWeight: 600 }}>{agent.name}</div>
                  <div style={{ fontSize: 8, color: '#6b7280' }}>{agent.role}</div>
                </div>
              </div>
            </div>

            {/* Status and duration */}
            <div style={{ padding: '0 16px 12px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ fontSize: 8, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: statusColor,
                    }}
                  />
                  <span style={{ fontSize: 9, color: statusColor, textTransform: 'capitalize', fontWeight: 600 }}>
                    {task.status}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 8, color: '#9ca3af' }}>
                Started: {task.startedAt ? new Date(task.startedAt).toLocaleTimeString('en-US') : '—'}
              </div>
              <div style={{ fontSize: 8, color: '#9ca3af' }}>
                Duration: {duration}
              </div>
            </div>

            {/* Tool calls */}
            {taskToolCalls.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: 8, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Tool Calls ({taskToolCalls.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {taskToolCalls.map((tc, idx) => {
                    const tcDuration = tc.endedAt ? formatDuration(tc.endedAt - tc.startedAt) : null;
                    const tcColor = getToolStatusColor(tc.status);

                    return (
                      <div key={tc.callId} style={{ fontSize: 8, lineHeight: '1.5' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            marginBottom: 2,
                          }}
                        >
                          <span style={{ color: '#6b7280' }}>{idx + 1}.</span>
                          <span style={{ color: tcColor, fontWeight: 600, flex: 1 }}>{tc.toolName}</span>
                          <span style={{ color: tcColor }}>
                            {tc.status === 'completed' && '✓'}
                            {tc.status === 'failed' && '✗'}
                            {(tc.status === 'started' || tc.status === 'streaming') && '⏳'}
                          </span>
                        </div>

                        {tc.inputSummary && (
                          <div style={{ color: '#9ca3af', marginLeft: 20, marginBottom: 2 }}>
                            {tc.inputSummary.slice(0, 60)}
                            {tc.inputSummary.length > 60 ? '…' : ''}
                          </div>
                        )}

                        {tcDuration && (
                          <div style={{ color: '#6b7280', marginLeft: 20 }}>
                            {tcDuration}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-agents */}
            {subAgents.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: 8, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Sub-Agents ({subAgents.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {subAgents.map((sa) => (
                    <div
                      key={sa.agentId}
                      style={{
                        padding: '6px 8px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 4,
                        fontSize: 8,
                      }}
                    >
                      <div style={{ color: '#c084fc', fontWeight: 600 }}>{sa.name}</div>
                      <div style={{ color: '#6b7280' }}>{sa.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning */}
            {reasoning && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: 8, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Reasoning
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: '#a78bfa',
                    lineHeight: '1.5',
                    maxHeight: 200,
                    overflowY: 'auto',
                    padding: '8px',
                    background: 'rgba(167,139,250,0.05)',
                    borderRadius: 4,
                    borderLeft: '2px solid rgba(192,132,252,0.3)',
                  }}
                >
                  {reasoning}
                </div>
              </div>
            )}

            {/* Error message */}
            {task.status === 'failed' && task.error && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: 8, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Error
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: '#f87171',
                    lineHeight: '1.5',
                    padding: '8px',
                    background: 'rgba(248,113,113,0.05)',
                    borderRadius: 4,
                    borderLeft: '2px solid #f87171',
                  }}
                >
                  {task.error}
                </div>
              </div>
            )}

            {/* Result message */}
            {task.status === 'completed' && task.result && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: 8, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Result
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: '#34d399',
                    lineHeight: '1.5',
                    padding: '8px',
                    background: 'rgba(52,211,153,0.05)',
                    borderRadius: 4,
                    borderLeft: '2px solid #34d399',
                  }}
                >
                  {task.result}
                </div>
              </div>
            )}
          </div>

          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              * { animation: none !important; transition-duration: 0s !important; }
            }
          `}</style>
        </div>
      </>
    );
  },
);

TaskInspectorPanel.displayName = 'TaskInspectorPanel';
