'use client';

/**
 * AI Agents Data Provider
 *
 * Connects to SperaxOS's agent API (or uses mock data) and feeds real-time
 * agent events into the visualization pipeline. Implements the DataProvider
 * hook interface expected by useDataProvider.
 */

import type { DataProviderEvent, DataProviderStats } from '@web3viz/core';
import type { CategoryConfig, SourceConfig } from '@web3viz/core';
import { useAgentProvider } from '../useAgentProvider';

export const AGENTS_SOURCE: SourceConfig = {
  id: 'agents',
  label: 'AI Agents',
  color: '#f472b6',
  icon: '\u2B23',
  description: 'Autonomous AI agent activity (SperaxOS)',
};

export const AGENTS_CATEGORIES: CategoryConfig[] = [
  { id: 'agentSpawn', label: 'Agent Spawns', icon: '\u2B21', color: '#c084fc', sourceId: 'agents' },
  { id: 'agentTask', label: 'Tasks', icon: '\u25B6', color: '#a78bfa', sourceId: 'agents' },
  { id: 'toolCall', label: 'Tool Calls', icon: '\u26A1', color: '#60a5fa', sourceId: 'agents' },
  { id: 'subagentSpawn', label: 'Sub-agents', icon: '\u25C6', color: '#f472b6', sourceId: 'agents' },
  { id: 'reasoning', label: 'Reasoning', icon: '\u25CE', color: '#fbbf24', sourceId: 'agents' },
  { id: 'taskComplete', label: 'Completions', icon: '\u2713', color: '#34d399', sourceId: 'agents' },
  { id: 'taskFailed', label: 'Failures', icon: '\u2717', color: '#f87171', sourceId: 'agents' },
  { id: 'agentInteractions', label: 'Agent Activity', icon: '\u2B22', color: '#f472b6', sourceId: 'agents' },
];

export interface AgentsProviderResult {
  stats: DataProviderStats;
  events: DataProviderEvent[];
  connected: boolean;
  rawPumpFunEvents?: never[];
}

export function useAgentsProvider({ paused = false }: { paused?: boolean } = {}): AgentsProviderResult {
  const { stats, connected } = useAgentProvider({
    mock: process.env.NEXT_PUBLIC_AGENT_MOCK !== 'false',
    url: process.env.NEXT_PUBLIC_SPERAXOS_WS_URL,
    apiKey: process.env.NEXT_PUBLIC_SPERAXOS_API_KEY,
    enabled: true,
  });

  return {
    stats,
    events: stats.recentEvents,
    connected,
  };
}
