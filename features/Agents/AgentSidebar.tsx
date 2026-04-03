'use client';

import { memo, useState } from 'react';
import type { AgentIdentity, ExecutorState } from '@web3viz/core';
import { TOOL_CLUSTER_ICONS } from './constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentSidebarProps {
  agents: Map<string, AgentIdentity>;
  executorState: ExecutorState | null;
  activeAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  enabledToolCategories: Set<string>;
  onToolCategoryToggle: (category: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAgentStatus(_agent: AgentIdentity): 'active' | 'idle' | 'error' {
  // Default to idle — actual status tracked externally via flow data
  return 'idle';
}

function getStatusColor(status: 'active' | 'idle' | 'error'): string {
  switch (status) {
    case 'active':
      return '#34d399'; // green
    case 'idle':
      return '#60a5fa'; // blue
    case 'error':
      return '#f87171'; // red
  }
}

function formatUptime(ms: number | undefined): string {
  if (!ms) return '0s';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

// ---------------------------------------------------------------------------
// Agent Item
// ---------------------------------------------------------------------------

const AgentItem = memo<{
  agent: AgentIdentity;
  isActive: boolean;
  onClick: () => void;
}>(({ agent, isActive, onClick }) => {
  const status = getAgentStatus(agent);
  const color = getStatusColor(status);

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        background: isActive ? 'rgba(192,132,252,0.1)' : 'transparent',
        border: isActive ? '1px solid rgba(192,132,252,0.3)' : '1px solid transparent',
        borderRadius: 6,
        cursor: 'pointer',
        width: '100%',
        color: '#ccc',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        transition: 'all 150ms ease',
      }}
      title={`${agent.name} (${agent.role})`}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {agent.name}
      </span>
      <span style={{ flexShrink: 0, fontSize: 9, color: '#666' }}>
        {agent.metadata?.toolCalls ?? 0}
      </span>
    </button>
  );
});

AgentItem.displayName = 'AgentItem';

// ---------------------------------------------------------------------------
// Tool Category Toggle
// ---------------------------------------------------------------------------

const ToolCategoryToggle = memo<{
  category: string;
  enabled: boolean;
  count: number;
  onClick: () => void;
}>(({ category, enabled, count, onClick }) => {
  const icon = TOOL_CLUSTER_ICONS[category as keyof typeof TOOL_CLUSTER_ICONS] || '◇';

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        background: enabled ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.02)',
        border: enabled ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 4,
        cursor: 'pointer',
        color: enabled ? '#60a5fa' : '#666',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9,
        textTransform: 'capitalize',
        transition: 'all 150ms ease',
      }}
      title={`Toggle ${category} tools`}
    >
      <span>{icon}</span>
      <span>{category}</span>
      <span style={{ fontSize: 8, color: '#555' }}>({count})</span>
    </button>
  );
});

ToolCategoryToggle.displayName = 'ToolCategoryToggle';

// ---------------------------------------------------------------------------
// Executor Status
// ---------------------------------------------------------------------------

const ExecutorStatus = memo<{ executorState: ExecutorState | null }>(({ executorState }) => {
  if (!executorState) {
    return (
      <div style={{ fontSize: 9, color: '#555', padding: '4px 0' }}>
        (No executor)
      </div>
    );
  }

  const uptime = formatUptime(executorState.uptimeMs);
  const isHealthy = executorState.heartbeatReceivedAt && Date.now() - executorState.heartbeatReceivedAt < 60000;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isHealthy ? '#34d399' : '#f87171',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: '#9ca3af' }}>Uptime: {uptime}</div>
        <div style={{ fontSize: 9, color: '#666' }}>Tasks: {executorState.tasksProcessed ?? 0}</div>
      </div>
    </div>
  );
});

ExecutorStatus.displayName = 'ExecutorStatus';

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const AgentSidebar = memo<AgentSidebarProps>(
  ({ agents, executorState, activeAgentId, onSelectAgent, enabledToolCategories, onToolCategoryToggle }) => {
    if (agents.size === 0) return null;

    const toolCategories = Object.keys(TOOL_CLUSTER_ICONS);

    return (
      <nav
        aria-label="Agent filters"
        style={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '12px',
          maxWidth: 200,
          maxHeight: '80vh',
          overflow: 'auto',
          fontFamily: "'IBM Plex Mono', monospace",
          background: 'rgba(10,10,20,0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* AGENTS Section */}
        <div>
          <div
            style={{
              fontSize: 9,
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}
          >
            Agents
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Array.from(agents.values()).map((agent) => (
              <AgentItem
                key={agent.agentId}
                agent={agent}
                isActive={activeAgentId === agent.agentId}
                onClick={() => onSelectAgent(activeAgentId === agent.agentId ? null : agent.agentId)}
              />
            ))}
          </div>
        </div>

        {/* Tools Section */}
        <div>
          <div
            style={{
              fontSize: 9,
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}
          >
            Tools
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {toolCategories.map((category) => (
              <ToolCategoryToggle
                key={category}
                category={category}
                enabled={enabledToolCategories.has(category)}
                count={0}
                onClick={() => onToolCategoryToggle(category)}
              />
            ))}
          </div>
        </div>

        {/* Executor Section */}
        <div>
          <div
            style={{
              fontSize: 9,
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}
          >
            Executor
          </div>
          <ExecutorStatus executorState={executorState} />
        </div>
      </nav>
    );
  },
);

AgentSidebar.displayName = 'AgentSidebar';

export default AgentSidebar;
