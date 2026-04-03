'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AgentEvent,
  AgentIdentity,
  AgentFlowTrace,
  AgentTask,
  AgentToolCall,
  ExecutorState,
} from '@web3viz/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentAggregateStats {
  totalAgents: number;
  activeTasks: number;
  totalToolCalls: number;
  totalTasksCompleted: number;
  totalTasksFailed: number;
  toolCallsPerMinute: number;
}

export interface UseAgentEventsOptions {
  /** SperaxOS API endpoint (WebSocket URL) */
  url: string;
  /** API key for authentication */
  apiKey?: string;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
  /** Reconnection delay in ms (default: 3000) */
  reconnectDelay?: number;
  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
}

export interface UseAgentEventsReturn {
  connected: boolean;
  executorState: ExecutorState | null;
  agents: Map<string, AgentIdentity>;
  flows: Map<string, AgentFlowTrace>;
  recentEvents: AgentEvent[];
  stats: AgentAggregateStats;
  connect: () => void;
  disconnect: () => void;
  paused: boolean;
  setPaused: (paused: boolean) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RECENT_EVENTS = 500;
const HEARTBEAT_TIMEOUT_MS = 60_000;
const TOOL_CALLS_WINDOW_MS = 60_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyStats(): AgentAggregateStats {
  return {
    totalAgents: 0,
    activeTasks: 0,
    totalToolCalls: 0,
    totalTasksCompleted: 0,
    totalTasksFailed: 0,
    toolCallsPerMinute: 0,
  };
}

function emptyFlowTrace(agent: AgentIdentity): AgentFlowTrace {
  return {
    flowId: `flow_${agent.agentId}`,
    agent,
    tasks: [],
    toolCalls: [],
    events: [],
    subAgents: [],
    status: 'active',
    startedAt: agent.createdAt,
    totalToolCalls: 0,
    totalTasksCompleted: 0,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAgentEvents(options: UseAgentEventsOptions): UseAgentEventsReturn {
  const {
    url,
    apiKey,
    autoConnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [executorState, setExecutorState] = useState<ExecutorState | null>(null);
  const [agents, setAgents] = useState<Map<string, AgentIdentity>>(() => new Map());
  const [flows, setFlows] = useState<Map<string, AgentFlowTrace>>(() => new Map());
  const [recentEvents, setRecentEvents] = useState<AgentEvent[]>([]);
  const [stats, setStats] = useState<AgentAggregateStats>(emptyStats);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(paused);
  const toolCallTimestampsRef = useRef<number[]>([]);

  pausedRef.current = paused;

  // --- Heartbeat timeout ---
  const resetHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setTimeout(() => {
      setExecutorState((prev) =>
        prev ? { ...prev, status: 'error', error: 'Heartbeat timeout' } : prev,
      );
      setConnected(false);
    }, HEARTBEAT_TIMEOUT_MS);
  }, []);

  // --- Process a single event ---
  const processEvent = useCallback(
    (event: AgentEvent) => {
      if (pausedRef.current) return;

      // Append to recent events (capped)
      setRecentEvents((prev) => {
        const next = [event, ...prev];
        return next.length > MAX_RECENT_EVENTS ? next.slice(0, MAX_RECENT_EVENTS) : next;
      });

      switch (event.type) {
        case 'heartbeat': {
          resetHeartbeatTimer();
          const p = event.payload as Record<string, unknown>;
          setExecutorState((prev) => ({
            executorId: event.agentId,
            status: 'running',
            activeAgents: prev?.activeAgents ?? [],
            uptime: (p.uptime as number) ?? 0,
            totalTasksProcessed: (p.totalTasksProcessed as number) ?? 0,
            totalToolCalls: prev?.totalToolCalls ?? 0,
            lastHeartbeat: event.timestamp,
          }));
          break;
        }

        case 'agent:spawn': {
          const p = event.payload as Record<string, unknown>;
          const identity: AgentIdentity = {
            agentId: event.agentId,
            name: (p.name as string) ?? event.agentId,
            role: (p.role as string) ?? 'unknown',
            address: p.address as string | undefined,
            createdAt: event.timestamp,
          };
          setAgents((prev) => {
            const next = new Map(prev);
            next.set(event.agentId, identity);
            return next;
          });
          setFlows((prev) => {
            const next = new Map(prev);
            if (!next.has(event.agentId)) {
              next.set(event.agentId, emptyFlowTrace(identity));
            }
            return next;
          });
          break;
        }

        case 'subagent:spawn': {
          const p = event.payload as Record<string, unknown>;
          const subIdentity: AgentIdentity = {
            agentId: (p.subAgentId as string) ?? event.agentId,
            name: (p.name as string) ?? 'Sub-agent',
            role: (p.role as string) ?? 'unknown',
            parentAgentId: event.agentId,
            createdAt: event.timestamp,
          };
          setAgents((prev) => {
            const next = new Map(prev);
            next.set(subIdentity.agentId, subIdentity);
            return next;
          });
          setFlows((prev) => {
            const next = new Map(prev);
            // Add sub-agent to parent flow
            const parentFlow = next.get(event.agentId);
            if (parentFlow) {
              next.set(event.agentId, {
                ...parentFlow,
                subAgents: [...parentFlow.subAgents, subIdentity],
                events: [...parentFlow.events, event],
              });
            }
            // Create flow for sub-agent
            next.set(subIdentity.agentId, emptyFlowTrace(subIdentity));
            return next;
          });
          break;
        }

        case 'task:queued':
        case 'task:started':
        case 'task:progress': {
          const p = event.payload as Record<string, unknown>;
          const taskId = event.taskId ?? (p.taskId as string) ?? event.eventId;
          setFlows((prev) => {
            const next = new Map(prev);
            const flow = next.get(event.agentId);
            if (!flow) return prev;

            const existingIdx = flow.tasks.findIndex((t) => t.taskId === taskId);
            const status =
              event.type === 'task:queued'
                ? 'queued'
                : event.type === 'task:started'
                  ? 'in-progress'
                  : 'in-progress';
            if (existingIdx >= 0) {
              const updated = [...flow.tasks];
              updated[existingIdx] = {
                ...updated[existingIdx],
                status: status as AgentTask['status'],
                startedAt: event.type === 'task:started' ? event.timestamp : updated[existingIdx].startedAt,
              };
              next.set(event.agentId, { ...flow, tasks: updated, events: [...flow.events, event] });
            } else {
              const task: AgentTask = {
                taskId,
                agentId: event.agentId,
                description: (p.description as string) ?? '',
                status: status as AgentTask['status'],
                priority: p.priority as number | undefined,
                createdAt: event.timestamp,
                startedAt: event.type === 'task:started' ? event.timestamp : undefined,
              };
              next.set(event.agentId, { ...flow, tasks: [...flow.tasks, task], events: [...flow.events, event] });
            }
            return next;
          });
          break;
        }

        case 'task:completed':
        case 'task:failed': {
          const p = event.payload as Record<string, unknown>;
          const taskId = event.taskId ?? (p.taskId as string);
          setFlows((prev) => {
            const next = new Map(prev);
            const flow = next.get(event.agentId);
            if (!flow) return prev;

            const updated = flow.tasks.map((t) =>
              t.taskId === taskId
                ? {
                    ...t,
                    status: (event.type === 'task:completed' ? 'completed' : 'failed') as AgentTask['status'],
                    endedAt: event.timestamp,
                    result: event.type === 'task:completed' ? (p.result as string) : undefined,
                    error: event.type === 'task:failed' ? (p.error as string) : undefined,
                  }
                : t,
            );
            const completedCount = updated.filter((t) => t.status === 'completed').length;
            next.set(event.agentId, {
              ...flow,
              tasks: updated,
              events: [...flow.events, event],
              totalTasksCompleted: completedCount,
            });
            return next;
          });
          break;
        }

        case 'tool:started':
        case 'tool:streaming':
        case 'tool:completed':
        case 'tool:failed': {
          const p = event.payload as Record<string, unknown>;
          const callId = event.callId ?? (p.callId as string) ?? event.eventId;
          const taskId = event.taskId ?? (p.taskId as string) ?? '';

          if (event.type === 'tool:started') {
            toolCallTimestampsRef.current.push(event.timestamp);
          }

          setFlows((prev) => {
            const next = new Map(prev);
            const flow = next.get(event.agentId);
            if (!flow) return prev;

            const existingIdx = flow.toolCalls.findIndex((tc) => tc.callId === callId);
            if (existingIdx >= 0) {
              const updated = [...flow.toolCalls];
              const existing = updated[existingIdx];
              updated[existingIdx] = {
                ...existing,
                status: event.type.split(':')[1] as AgentToolCall['status'],
                endedAt: event.type === 'tool:completed' || event.type === 'tool:failed' ? event.timestamp : existing.endedAt,
                duration:
                  event.type === 'tool:completed' || event.type === 'tool:failed'
                    ? event.timestamp - existing.startedAt
                    : existing.duration,
                outputSummary: (p.outputSummary as string) ?? existing.outputSummary,
              };
              next.set(event.agentId, {
                ...flow,
                toolCalls: updated,
                events: [...flow.events, event],
                totalToolCalls: updated.length,
              });
            } else {
              const toolCall: AgentToolCall = {
                callId,
                taskId,
                agentId: event.agentId,
                toolName: (p.toolName as string) ?? 'unknown',
                toolCategory: (p.toolCategory as AgentToolCall['toolCategory']) ?? 'other',
                status: event.type.split(':')[1] as AgentToolCall['status'],
                inputSummary: p.inputSummary as string | undefined,
                startedAt: event.timestamp,
              };
              next.set(event.agentId, {
                ...flow,
                toolCalls: [...flow.toolCalls, toolCall],
                events: [...flow.events, event],
                totalToolCalls: flow.toolCalls.length + 1,
              });
            }
            return next;
          });
          break;
        }

        case 'agent:idle':
        case 'agent:shutdown': {
          setFlows((prev) => {
            const next = new Map(prev);
            const flow = next.get(event.agentId);
            if (!flow) return prev;
            next.set(event.agentId, {
              ...flow,
              status: event.type === 'agent:shutdown' ? 'completed' : 'idle',
              endedAt: event.type === 'agent:shutdown' ? event.timestamp : flow.endedAt,
              events: [...flow.events, event],
            });
            return next;
          });
          break;
        }

        default:
          // reasoning, error, etc. - just append to flow events
          setFlows((prev) => {
            const next = new Map(prev);
            const flow = next.get(event.agentId);
            if (!flow) return prev;
            next.set(event.agentId, { ...flow, events: [...flow.events, event] });
            return next;
          });
          break;
      }
    },
    [resetHeartbeatTimer],
  );

  // --- Recompute aggregate stats whenever flows change ---
  useEffect(() => {
    const now = Date.now();
    const windowStart = now - TOOL_CALLS_WINDOW_MS;
    toolCallTimestampsRef.current = toolCallTimestampsRef.current.filter((t) => t > windowStart);

    let activeTasks = 0;
    let totalToolCalls = 0;
    let totalCompleted = 0;
    let totalFailed = 0;

    for (const flow of flows.values()) {
      activeTasks += flow.tasks.filter((t) => t.status === 'in-progress' || t.status === 'queued').length;
      totalToolCalls += flow.totalToolCalls;
      totalCompleted += flow.totalTasksCompleted;
      totalFailed += flow.tasks.filter((t) => t.status === 'failed').length;
    }

    setStats({
      totalAgents: agents.size,
      activeTasks,
      totalToolCalls,
      totalTasksCompleted: totalCompleted,
      totalTasksFailed: totalFailed,
      toolCallsPerMinute: toolCallTimestampsRef.current.length,
    });
  }, [flows, agents]);

  // --- WebSocket connection ---
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = apiKey ? `${url}?apiKey=${encodeURIComponent(apiKey)}` : url;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttemptsRef.current = 0;
      resetHeartbeatTimer();
    };

    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data as string) as AgentEvent;
        if (event.eventId && event.type && event.timestamp) {
          processEvent(event);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;

      // Auto-reconnect with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url, apiKey, reconnectDelay, maxReconnectAttempts, processEvent, resetHeartbeatTimer]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    reconnectAttemptsRef.current = maxReconnectAttempts; // prevent auto-reconnect
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, [maxReconnectAttempts]);

  // --- Auto-connect on mount ---
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    connected,
    executorState,
    agents,
    flows,
    recentEvents,
    stats,
    connect,
    disconnect,
    paused,
    setPaused,
  };
}
