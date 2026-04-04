// ============================================================================
// @web3viz/ui — Agent Color Tokens
//
// Theme-aware color tokens for the agent visualization views.
// Used across AgentForceGraph, AgentSidebar, AgentStatsBar, etc.
// ============================================================================

export const agentThemeTokens = {
  dark: {
    background: '#0a0a12',
    agentHub: '#14142a',
    agentHubActive: '#c084fc',
    taskActive: '#60a5fa',
    taskPlanning: '#fbbf24',
    taskWaiting: '#8888a8',
    taskComplete: '#34d399',
    taskFailed: '#f87171',
    toolParticle: '#818cf8',
    reasoning: '#c084fc30',
    subagentEdge: '#c084fc66',
    edge: 'rgba(140,140,200,0.06)',
    ground: '#0e0e18',
    sidebar: 'rgba(10,10,18,0.92)',
    text: '#d8d8e8',
    muted: '#6a6a88',
    heartbeatHealthy: '#34d399',
    heartbeatWarning: '#fbbf24',
    heartbeatDead: '#f87171',
  },
  light: {
    background: '#f6f6fa',
    agentHub: '#e2e2ea',
    agentHubActive: '#7c3aed',
    taskActive: '#3b82f6',
    taskPlanning: '#d97706',
    taskWaiting: '#8888a8',
    taskComplete: '#16a34a',
    taskFailed: '#dc2626',
    toolParticle: '#6366f1',
    reasoning: '#7c3aed30',
    subagentEdge: '#7c3aed66',
    edge: 'rgba(20,20,60,0.08)',
    ground: '#f4f4fa',
    sidebar: 'rgba(246,246,250,0.95)',
    text: '#1a1a2e',
    muted: '#5a5a72',
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
