'use client';

import { useMemo } from 'react';
import type {
  AgentIdentity,
  AgentFlowTrace,
  ExecutorState,
  DataProviderStats,
  DataProviderEvent,
  TopToken,
  TraderEdge,
} from '@web3viz/core';
import type { AgentAggregateStats } from './useAgentEvents';
import { useAgentEvents } from './useAgentEvents';
import { useAgentEventsMock } from './useAgentEventsMock';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

interface UseAgentProviderOptions {
  /** Use mock data instead of real WebSocket */
  mock?: boolean;
  /** WebSocket URL for real connection */
  url?: string;
  /** API key */
  apiKey?: string;
  /** Whether this provider is active */
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

interface UseAgentProviderReturn {
  stats: DataProviderStats;
  agents: Map<string, AgentIdentity>;
  flows: Map<string, AgentFlowTrace>;
  executorState: ExecutorState | null;
  agentStats: AgentAggregateStats;
  connected: boolean;
  events: DataProviderEvent[];
}

// ---------------------------------------------------------------------------
// Helpers: map agent data → DataProvider concepts
// ---------------------------------------------------------------------------

function agentColor(index: number): string {
  const palette = [
    '#c084fc', '#60a5fa', '#f472b6', '#34d399',
    '#fbbf24', '#fb923c', '#a78bfa', '#22d3ee',
  ];
  return palette[index % palette.length];
}

function agentsToTopTokens(agents: Map<string, AgentIdentity>, flows: Map<string, AgentFlowTrace>): TopToken[] {
  return Array.from(agents.values()).map((agent, idx) => {
    const flow = flows.get(agent.agentId);
    const toolCalls = flow?.totalToolCalls ?? 0;
    const tasksCompleted = flow?.totalTasksCompleted ?? 0;
    return {
      mint: agent.agentId,
      tokenAddress: agent.agentId,
      symbol: agent.name,
      name: `${agent.name} (${agent.role})`,
      chain: 'agents',
      trades: toolCalls,
      volumeSol: tasksCompleted,
      volume: tasksCompleted,
      nativeSymbol: 'TASKS',
      source: 'agents',
      // Store agent color in a custom field via the record shape
    } satisfies TopToken;
  });
}

function flowsToTraderEdges(flows: Map<string, AgentFlowTrace>): TraderEdge[] {
  const edges: TraderEdge[] = [];
  for (const flow of flows.values()) {
    // Aggregate tool calls per tool name per agent
    const toolCounts = new Map<string, { count: number; category: string }>();
    for (const tc of flow.toolCalls) {
      const existing = toolCounts.get(tc.toolName);
      if (existing) {
        existing.count += 1;
      } else {
        toolCounts.set(tc.toolName, { count: 1, category: tc.toolCategory });
      }
    }
    for (const [toolName, { count }] of toolCounts.entries()) {
      edges.push({
        trader: toolName,
        mint: flow.agent.agentId,
        tokenAddress: flow.agent.agentId,
        chain: 'agents',
        trades: count,
        volumeSol: count,
        volume: count,
        source: 'agents',
      });
    }
  }
  return edges;
}

function agentEventsToProviderEvents(
  events: ReturnType<typeof useAgentEvents>['recentEvents'],
  agents: Map<string, AgentIdentity>,
): DataProviderEvent[] {
  return events.slice(0, 100).map((evt) => {
    const agent = agents.get(evt.agentId);
    const agentName = agent?.name ?? evt.agentId;

    let category = 'agentInteractions';
    let label = `${agentName}: ${evt.type}`;

    switch (evt.type) {
      case 'agent:spawn':
        category = 'agentSpawn';
        label = `${agentName} spawned`;
        break;
      case 'task:started':
        category = 'agentTask';
        label = `${agentName}: ${(evt.payload.description as string) ?? 'new task'}`;
        break;
      case 'task:completed':
        category = 'taskComplete';
        label = `${agentName}: task completed`;
        break;
      case 'task:failed':
        category = 'taskFailed';
        label = `${agentName}: task failed`;
        break;
      case 'tool:started':
        category = 'toolCall';
        label = `${agentName}: ${(evt.payload.toolName as string) ?? 'tool'} — ${(evt.payload.inputSummary as string) ?? ''}`;
        break;
      case 'subagent:spawn':
        category = 'subagentSpawn';
        label = `${agentName} spawned sub-agent ${(evt.payload.name as string) ?? ''}`;
        break;
      case 'reasoning:update':
        category = 'reasoning';
        label = `${agentName} thinking: ${String(evt.payload.text ?? '').slice(0, 60)}`;
        break;
    }

    return {
      id: evt.eventId,
      source: 'agents',
      providerId: 'agents',
      category,
      chain: 'agents',
      timestamp: evt.timestamp,
      label,
      address: evt.agentId,
      meta: { agentEvent: evt },
    } satisfies DataProviderEvent;
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const FALLBACK_URL = 'wss://api.speraxos.io/agents/v1/stream';

export function useAgentProvider(options: UseAgentProviderOptions = {}): UseAgentProviderReturn {
  const { mock = true, url = FALLBACK_URL, apiKey, enabled = true } = options;

  // Always call both hooks but only use the relevant one
  const mockData = useAgentEventsMock({ autoStart: mock && enabled });
  const liveData = useAgentEvents({
    url,
    apiKey,
    autoConnect: !mock && enabled,
  });

  const data = mock ? mockData : liveData;

  const topTokens = useMemo(
    () => (enabled ? agentsToTopTokens(data.agents, data.flows) : []),
    [data.agents, data.flows, enabled],
  );

  const traderEdges = useMemo(
    () => (enabled ? flowsToTraderEdges(data.flows) : []),
    [data.flows, enabled],
  );

  const providerEvents = useMemo(
    () => (enabled ? agentEventsToProviderEvents(data.recentEvents, data.agents) : []),
    [data.recentEvents, data.agents, enabled],
  );

  const stats = useMemo<DataProviderStats>(() => {
    if (!enabled) {
      return {
        counts: {},
        totalVolumeSol: 0,
        totalTransactions: 0,
        totalAgents: 0,
        recentEvents: [],
        topTokens: [],
        traderEdges: [],
        rawEvents: [],
      };
    }

    const counts: Record<string, number> = {
      agentSpawn: data.stats.totalAgents,
      agentTask: data.stats.activeTasks,
      toolCall: data.stats.totalToolCalls,
      taskComplete: data.stats.totalTasksCompleted,
      taskFailed: data.stats.totalTasksFailed,
    };

    return {
      counts,
      totalVolumeSol: data.stats.totalTasksCompleted,
      totalTransactions: data.stats.totalToolCalls,
      totalAgents: data.stats.totalAgents,
      recentEvents: providerEvents,
      topTokens,
      traderEdges,
      rawEvents: data.recentEvents.map((evt) => ({ type: 'agentEvent', data: evt })),
    };
  }, [enabled, data.stats, providerEvents, topTokens, traderEdges, data.recentEvents]);

  return {
    stats,
    agents: data.agents,
    flows: data.flows,
    executorState: data.executorState,
    agentStats: data.stats,
    connected: data.connected,
    events: providerEvents,
  };
}
