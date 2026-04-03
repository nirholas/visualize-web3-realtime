'use client';

import { memo, useState } from 'react';
import type { AgentIdentity, ExecutorState } from '@web3viz/core';
import { TOOL_CLUSTER_ICONS } from './constants';
import { agentThemeTokens } from '@/packages/ui/src/tokens/agent-colors';

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
  collapsed?: boolean;
  colorScheme?: 'dark' | 'light';
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
  collapsed?: boolean;
  colorScheme?: 'dark' | 'light';
  onClick: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}>(({ agent, isActive, collapsed, colorScheme, onClick, onKeyDown }) => {
  const status = getAgentStatus(agent);
  const color = getStatusColor(status);
  const tokens = agentThemeTokens[colorScheme ?? 'dark'];

  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
        onKeyDown?.(e);
      }}
      tabIndex={0}
      aria-selected={isActive}
      role="button"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 8,
        padding: collapsed ? '6px' : '6px 8px',
        background: isActive ? `${tokens.agentHubActive}20` : 'transparent',
        border: isActive ? `1px solid ${tokens.agentHubActive}50` : `1px solid transparent`,
        borderRadius: 6,
        cursor: 'pointer',
        width: '100%',
        color: tokens.text,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        transition: 'all 150ms ease',
        outline: 'none',
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = `2px solid ${tokens.agentHubActive}`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
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
      {!collapsed && (
        <>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {agent.name}
          </span>
        </>
      )}
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
  collapsed?: boolean;
  colorScheme?: 'dark' | 'light';
  onClick: () => void;
}>(({ category, enabled, count, collapsed, colorScheme, onClick }) => {
  const icon = TOOL_CLUSTER_ICONS[category as keyof typeof TOOL_CLUSTER_ICONS] || '◇';
  const tokens = agentThemeTokens[colorScheme ?? 'dark'];

  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      aria-label={`Toggle ${category} tools`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 6,
        padding: collapsed ? '4px' : '4px 8px',
        background: enabled ? `${tokens.taskActive}20` : 'transparent',
        border: enabled ? `1px solid ${tokens.taskActive}50` : `1px solid ${tokens.edge}`,
        borderRadius: 4,
        cursor: 'pointer',
        color: enabled ? tokens.taskActive : tokens.muted,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: collapsed ? 10 : 9,
        textTransform: 'capitalize',
        transition: 'all 150ms ease',
        outline: 'none',
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = `2px solid ${tokens.taskActive}`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
      title={`Toggle ${category} tools`}
    >
      <span>{icon}</span>
      {!collapsed && (
        <>
          <span>{category}</span>
          <span style={{ fontSize: 8, color: tokens.muted }}>({count})</span>
        </>
      )}
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

  const uptime = formatUptime(executorState.uptime);
  const isHealthy = Date.now() - executorState.lastHeartbeat < 60000;

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
        <div style={{ fontSize: 9, color: '#666' }}>Tasks: {executorState.totalTasksProcessed ?? 0}</div>
      </div>
    </div>
  );
});

ExecutorStatus.displayName = 'ExecutorStatus';

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const AgentSidebar = memo<AgentSidebarProps>(
  ({ agents, executorState, activeAgentId, onSelectAgent, enabledToolCategories, onToolCategoryToggle, collapsed = false, colorScheme = 'dark' }) => {
    if (agents.size === 0) return null;

    const toolCategories = Object.keys(TOOL_CLUSTER_ICONS);
    const tokens = agentThemeTokens[colorScheme];

    return (
      <nav
        aria-label="Agent selector"
        style={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: collapsed ? 8 : 12,
          padding: collapsed ? '8px' : '12px',
          width: collapsed ? 36 : 200,
          maxHeight: '80vh',
          overflow: 'auto',
          fontFamily: "'IBM Plex Mono', monospace",
          background: `${tokens.sidebar}`,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${tokens.edge}`,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          transition: 'width 200ms ease',
        }}
      >
        {/* AGENTS Section */}
        {!collapsed && (
          <div>
            <div
              style={{
                fontSize: 9,
                color: tokens.muted,
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
                  colorScheme={colorScheme}
                  onClick={() => onSelectAgent(activeAgentId === agent.agentId ? null : agent.agentId)}
                />
              ))}
            </div>
          </div>
        )}

        {collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Array.from(agents.values()).map((agent) => (
              <AgentItem
                key={agent.agentId}
                agent={agent}
                isActive={activeAgentId === agent.agentId}
                collapsed={collapsed}
                colorScheme={colorScheme}
                onClick={() => onSelectAgent(activeAgentId === agent.agentId ? null : agent.agentId)}
              />
            ))}
          </div>
        )}

        {/* Tools Section */}
        {!collapsed && (
          <div>
            <div
              style={{
                fontSize: 9,
                color: tokens.muted,
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
                  colorScheme={colorScheme}
                  onClick={() => onToolCategoryToggle(category)}
                />
              ))}
            </div>
          </div>
        )}

        {collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {toolCategories.map((category) => (
              <ToolCategoryToggle
                key={category}
                category={category}
                enabled={enabledToolCategories.has(category)}
                count={0}
                collapsed={collapsed}
                colorScheme={colorScheme}
                onClick={() => onToolCategoryToggle(category)}
              />
            ))}
          </div>
        )}

        {/* Executor Section (not shown when collapsed to save space) */}
        {!collapsed && (
          <div>
            <div
              style={{
                fontSize: 9,
                color: tokens.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 6,
              }}
            >
              Executor
            </div>
            <ExecutorStatus executorState={executorState} />
          </div>
        )}
      </nav>
    );
  },
);

AgentSidebar.displayName = 'AgentSidebar';

export default AgentSidebar;
