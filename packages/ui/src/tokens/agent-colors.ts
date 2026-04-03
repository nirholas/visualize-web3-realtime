// ============================================================================
// @web3viz/ui — Agent Color Tokens
//
// Theme-aware color tokens for the agent visualization views.
// Used across AgentForceGraph, AgentSidebar, AgentStatsBar, etc.
// ============================================================================

export const agentThemeTokens = {
  dark: {
    background: '#0a0a0f',
    agentHub: '#1a1a2e',
    agentHubActive: '#c084fc',
    taskActive: '#60a5fa',
    taskPlanning: '#fbbf24',
    taskWaiting: '#9ca3af',
    taskComplete: '#34d399',
    taskFailed: '#f87171',
    toolParticle: '#818cf8',
    reasoning: '#c084fc40',
    subagentEdge: '#c084fc80',
    edge: 'rgba(255,255,255,0.06)',
    ground: '#111118',
    sidebar: 'rgba(10,10,15,0.9)',
    text: '#e0e0e0',
    muted: '#6b7280',
    heartbeatHealthy: '#34d399',
    heartbeatWarning: '#fbbf24',
    heartbeatDead: '#f87171',
  },
  light: {
    background: '#f8f9fa',
    agentHub: '#e0e0e0',
    agentHubActive: '#9333ea',
    taskActive: '#3b82f6',
    taskPlanning: '#d97706',
    taskWaiting: '#6b7280',
    taskComplete: '#16a34a',
    taskFailed: '#dc2626',
    toolParticle: '#6366f1',
    reasoning: '#9333ea40',
    subagentEdge: '#9333ea80',
    edge: 'rgba(0,0,0,0.08)',
    ground: '#f8f8fa',
    sidebar: 'rgba(255,255,255,0.95)',
    text: '#1a1a1a',
    muted: '#6b7280',
    heartbeatHealthy: '#16a34a',
    heartbeatWarning: '#d97706',
    heartbeatDead: '#dc2626',
  },
} as const;

export type AgentTheme = {
  background: string;
  agentHub: string;
  agentHubActive: string;
  taskActive: string;
  taskPlanning: string;
  taskWaiting: string;
  taskComplete: string;
  taskFailed: string;
  toolParticle: string;
  reasoning: string;
  subagentEdge: string;
  edge: string;
  ground: string;
  sidebar: string;
  text: string;
  muted: string;
  heartbeatHealthy: string;
  heartbeatWarning: string;
  heartbeatDead: string;
};

/** Get agent theme tokens for the current color scheme */
export function getAgentTheme(scheme: 'dark' | 'light' = 'dark'): AgentTheme {
  return agentThemeTokens[scheme];
}
