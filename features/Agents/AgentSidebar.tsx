'use client';

import { memo, useCallback } from 'react';
import type { AgentIdentity, AgentFlowTrace, ExecutorState } from '@web3viz/core';
import { TOOL_CLUSTER_ICONS } from './constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentSidebarProps {
  agents: Map<string, AgentIdentity>;
  flows: Map<string, AgentFlowTrace>;
  executorState: ExecutorState | null;
  activeAgentId: string | null;
  activeToolCategories: Set<string>;
  onSelectAgent: (agentId: string | null) => void;
  onToggleToolCategory: (category: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}

function getAgentStatus(flow?: AgentFlowTrace): 'active' | 'idle' | 'error' | 'shutdown' {
  if (!flow) return 'idle';
  if (flow.status === 'completed') return 'shutdown';
  if (flow.status === 'failed') return 'error';
  const activeTasks = flow.tasks.filter((t) => t.status === 'in-progress').length;
  return activeTasks > 0 ? 'active' : 'idle';
}

const STATUS_COLORS: Record<string, string> = {
  active: '#34d399',
  idle: '#60a5fa',
  error: '#f87171',
  shutdown: '#6b7280',
};

const TOOL_CATEGORIES = Object.keys(TOOL_CLUSTER_ICONS);

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

const StatusDot = memo<{ status: string; pulse?: boolean }>(({ status, pulse }) => (
  <div
    style={{
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: STATUS_COLORS[status] ?? '#6b7280',
      flexShrink: 0,
      animation: pulse && status === 'active' ? 'agentPulse 2s ease-in-out infinite' : 'none',
    }}
  />
));
StatusDot.displayName = 'StatusDot';

// ---------------------------------------------------------------------------
// Main sidebar
// ---------------------------------------------------------------------------

const AgentSidebar = memo<AgentSidebarProps>(
  ({ agents, flows, executorState, activeAgentId, activeToolCategories, onSelectAgent, onToggleToolCategory }) => {
    const handleAgentClick = useCallback(
      (agentId: string) => {
        onSelectAgent(activeAgentId === agentId ? null : agentId);
      },
      [activeAgentId, onSelectAgent],
    );

    const agentList = Array.from(agents.values());

    return (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 200,
          background: 'rgba(10,10,15,0.9)',
          backdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          overflowY: 'auto',
        }}
      >
        {/* Agents section */}
        <div style={{ padding: '16px 12px 8px' }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 10,
            }}
          >
            Agents
          </div>
          {agentList.length === 0 && (
            <div style={{ fontSize: 10, color: '#4b5563', padding: '4px 0' }}>
              Connecting...
            </div>
          )}
          {agentList.map((agent) => {
            const flow = flows.get(agent.agentId);
            const status = getAgentStatus(flow);
            const activeTasks = flow?.tasks.filter((t) => t.status === 'in-progress').length ?? 0;
            const toolCalls = flow?.totalToolCalls ?? 0;
            const isActive = activeAgentId === agent.agentId;

            return (
              <button
                key={agent.agentId}
                onClick={() => handleAgentClick(agent.agentId)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  marginBottom: 4,
                  borderRadius: 6,
                  border: isActive
                    ? '1px solid rgba(192,132,252,0.4)'
                    : '1px solid transparent',
                  background: isActive
                    ? 'rgba(192,132,252,0.08)'
                    : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  color: '#e5e7eb',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <StatusDot status={status} pulse />
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {agent.name}
                  </span>
                </div>
                <div style={{ fontSize: 9, color: '#9ca3af', paddingLeft: 16 }}>
                  {agent.role} · {activeTasks}t · {toolCalls}⚡
                </div>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

        {/* Tools section */}
        <div style={{ padding: '10px 12px' }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 10,
            }}
          >
            Tools
          </div>
          {TOOL_CATEGORIES.map((cat) => {
            const icon = TOOL_CLUSTER_ICONS[cat];
            const active = activeToolCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => onToggleToolCategory(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '5px 10px',
                  marginBottom: 2,
                  borderRadius: 4,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: active ? '#e5e7eb' : '#4b5563',
                  fontFamily: 'inherit',
                  fontSize: 10,
                  textAlign: 'left',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.4, fontSize: 12 }}>{active ? '▣' : '□'}</span>
                <span>{icon}</span>
                <span style={{ textTransform: 'capitalize' }}>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

        {/* Executor section */}
        <div style={{ padding: '10px 12px' }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 8,
            }}
          >
            Executor
          </div>
          {executorState ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <StatusDot status={executorState.status === 'running' ? 'active' : 'error'} pulse />
                <span
                  style={{
                    fontSize: 10,
                    color: executorState.status === 'running' ? '#34d399' : '#f87171',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {executorState.status}
                </span>
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>
                Uptime: {formatUptime(executorState.uptime)}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>
                Tasks: {executorState.totalTasksProcessed}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusDot status="idle" />
              <span style={{ fontSize: 10, color: '#6b7280' }}>Mock mode</span>
            </div>
          )}
        </div>

        <style>{`
          @keyframes agentPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  },
);

AgentSidebar.displayName = 'AgentSidebar';
export default AgentSidebar;
