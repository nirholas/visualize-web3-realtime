'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentEvent, AgentIdentity, AgentFlowTrace } from '@web3viz/core';
import type { AgentAggregateStats, UseAgentEventsReturn } from './useAgentEvents';

// ---------------------------------------------------------------------------
// Mock data constants
// ---------------------------------------------------------------------------

const AGENT_PROFILES: Array<{ name: string; role: string }> = [
  { name: 'CodeReviewer', role: 'coder' },
  { name: 'Researcher', role: 'researcher' },
  { name: 'Planner', role: 'planner' },
  { name: 'TypeChecker', role: 'coder' },
  { name: 'DocWriter', role: 'researcher' },
];

const TASK_DESCRIPTIONS = [
  'Review pull request #42',
  'Analyze API documentation',
  'Plan sprint backlog',
  'Search for relevant papers',
  'Refactor authentication module',
  'Generate test coverage report',
  'Audit security vulnerabilities',
  'Optimize database queries',
  'Update dependency versions',
  'Write technical specification',
];

const TOOL_CALLS: Array<{ toolName: string; toolCategory: string; inputSummary: string }> = [
  { toolName: 'read_file', toolCategory: 'filesystem', inputSummary: 'Reading src/index.ts' },
  { toolName: 'grep_search', toolCategory: 'search', inputSummary: 'Searching for "handleSubmit"' },
  { toolName: 'run_in_terminal', toolCategory: 'terminal', inputSummary: 'npx tsc --noEmit' },
  { toolName: 'semantic_search', toolCategory: 'search', inputSummary: 'Finding authentication patterns' },
  { toolName: 'create_file', toolCategory: 'filesystem', inputSummary: 'Creating src/utils/auth.ts' },
  { toolName: 'fetch_url', toolCategory: 'network', inputSummary: 'GET https://api.example.com/docs' },
  { toolName: 'run_tests', toolCategory: 'terminal', inputSummary: 'npm test -- --coverage' },
  { toolName: 'analyze_code', toolCategory: 'code', inputSummary: 'Analyzing complexity metrics' },
  { toolName: 'think', toolCategory: 'reasoning', inputSummary: 'Reasoning about architecture trade-offs' },
  { toolName: 'list_dir', toolCategory: 'filesystem', inputSummary: 'Listing src/components/' },
];

const REASONING_SNIPPETS = [
  'The form component has a race condition in the submit handler.',
  'Need to check if TypeScript types allow concurrent state updates.',
  'The authentication flow could be simplified by using middleware.',
  'Consider splitting this into smaller, more testable functions.',
  'The database query is doing N+1 selects — should join instead.',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function emptyFlow(agent: AgentIdentity): AgentFlowTrace {
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
// Options
// ---------------------------------------------------------------------------

export interface UseMockAgentEventsOptions {
  agentCount?: number;
  eventsPerSecond?: number;
  autoStart?: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAgentEventsMock(options: UseMockAgentEventsOptions = {}): UseAgentEventsReturn {
  const { agentCount = 3, eventsPerSecond = 2, autoStart = true } = options;

  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [agents, setAgents] = useState<Map<string, AgentIdentity>>(() => new Map());
  const [flows, setFlows] = useState<Map<string, AgentFlowTrace>>(() => new Map());
  const [recentEvents, setRecentEvents] = useState<AgentEvent[]>([]);
  const [stats, setStats] = useState<AgentAggregateStats>({
    totalAgents: 0,
    activeTasks: 0,
    totalToolCalls: 0,
    totalTasksCompleted: 0,
    totalTasksFailed: 0,
    toolCallsPerMinute: 0,
  });
  const [executorState] = useState(null);

  const pausedRef = useRef(paused);
  const agentsRef = useRef<Map<string, AgentIdentity>>(new Map());
  const flowsRef = useRef<Map<string, AgentFlowTrace>>(new Map());
  const toolCallTimestampsRef = useRef<number[]>([]);

  pausedRef.current = paused;

  // Agent state machine per agent: what phase are they in
  const agentPhaseRef = useRef<Map<string, { phase: string; taskId: string | null; callCount: number; taskCount: number }>>( new Map());

  // --- Emit an event ---
  const emit = useCallback((event: AgentEvent) => {
    if (pausedRef.current) return;

    setRecentEvents((prev) => {
      const next = [event, ...prev];
      return next.length > 500 ? next.slice(0, 500) : next;
    });

    // Update flows state
    setFlows((prev) => {
      const next = new Map(prev);
      let flow = next.get(event.agentId);
      if (!flow) return prev;

      flow = { ...flow, events: [...flow.events, event] };
      next.set(event.agentId, flow);
      return next;
    });
  }, []);

  // --- Tick: advance agent state machines ---
  const tick = useCallback(() => {
    if (pausedRef.current) return;

    const now = Date.now();
    const agentIds = Array.from(agentsRef.current.keys());

    for (const agentId of agentIds) {
      const phase = agentPhaseRef.current.get(agentId);
      if (!phase) continue;

      // Random chance to advance state each tick
      const roll = Math.random();

      if (phase.phase === 'idle') {
        if (roll < 0.3) {
          // Start a new task
          const taskId = `task_${uid()}`;
          phase.phase = 'in-task';
          phase.taskId = taskId;
          phase.callCount = 0;

          const taskEvent: AgentEvent = {
            eventId: `evt_${uid()}`,
            type: 'task:started',
            timestamp: now,
            agentId,
            taskId,
            payload: {
              description: randomFrom(TASK_DESCRIPTIONS),
              priority: Math.floor(Math.random() * 5),
            },
          };
          emit(taskEvent);

          // Occasionally spawn a sub-agent (20%)
          if (roll < 0.06 && agentsRef.current.size < agentCount + 2) {
            const subId = `agent_sub_${uid()}`;
            const profile = randomFrom(AGENT_PROFILES);
            const subIdentity: AgentIdentity = {
              agentId: subId,
              name: `${profile.name}Helper`,
              role: profile.role,
              parentAgentId: agentId,
              createdAt: now,
            };
            agentsRef.current.set(subId, subIdentity);
            agentPhaseRef.current.set(subId, { phase: 'idle', taskId: null, callCount: 0, taskCount: 0 });
            flowsRef.current.set(subId, emptyFlow(subIdentity));

            setAgents((prev) => {
              const m = new Map(prev);
              m.set(subId, subIdentity);
              return m;
            });
            setFlows((prev) => {
              const m = new Map(prev);
              m.set(subId, emptyFlow(subIdentity));
              return m;
            });

            emit({
              eventId: `evt_${uid()}`,
              type: 'subagent:spawn',
              timestamp: now,
              agentId,
              taskId,
              payload: { subAgentId: subId, name: subIdentity.name, role: subIdentity.role },
            });
          }
        }
      } else if (phase.phase === 'in-task') {
        if (phase.taskId === null) {
          phase.phase = 'idle';
          continue;
        }

        const maxCalls = 3 + Math.floor(Math.random() * 6);

        if (phase.callCount < maxCalls && roll < 0.5) {
          // Make a tool call
          const tool = randomFrom(TOOL_CALLS);
          const callId = `call_${uid()}`;
          phase.callCount += 1;

          toolCallTimestampsRef.current.push(now);

          emit({
            eventId: `evt_${uid()}`,
            type: 'tool:started',
            timestamp: now,
            agentId,
            taskId: phase.taskId,
            callId,
            payload: {
              toolName: tool.toolName,
              toolCategory: tool.toolCategory,
              inputSummary: tool.inputSummary,
              callId,
            },
          });

          // Complete the tool call shortly after
          setTimeout(() => {
            if (pausedRef.current) return;
            const success = Math.random() > 0.1;
            emit({
              eventId: `evt_${uid()}`,
              type: success ? 'tool:completed' : 'tool:failed',
              timestamp: Date.now(),
              agentId,
              taskId: phase.taskId ?? undefined,
              callId,
              payload: {
                callId,
                outputSummary: success ? 'Done.' : 'Error: timeout',
              },
            });
          }, 200 + Math.random() * 800);

          // Occasionally emit reasoning
          if (roll < 0.1) {
            emit({
              eventId: `evt_${uid()}`,
              type: 'reasoning:update',
              timestamp: now,
              agentId,
              taskId: phase.taskId,
              payload: { text: randomFrom(REASONING_SNIPPETS) },
            });
          }
        } else if (phase.callCount >= maxCalls || roll > 0.9) {
          // Complete or fail the task
          const failed = Math.random() < 0.1;
          phase.taskCount += 1;

          emit({
            eventId: `evt_${uid()}`,
            type: failed ? 'task:failed' : 'task:completed',
            timestamp: now,
            agentId,
            taskId: phase.taskId,
            payload: failed
              ? { error: 'Task timed out after maximum retries' }
              : { result: 'Task completed successfully' },
          });

          phase.phase = 'idle';
          phase.taskId = null;
        }
      }
    }

    // Update aggregate stats
    const now2 = Date.now();
    const windowStart = now2 - 60_000;
    toolCallTimestampsRef.current = toolCallTimestampsRef.current.filter((t) => t > windowStart);

    setFlows((currentFlows) => {
      let activeTasks = 0;
      let totalToolCalls = 0;
      let totalCompleted = 0;
      let totalFailed = 0;

      for (const flow of currentFlows.values()) {
        activeTasks += flow.tasks.filter((t) => t.status === 'in-progress' || t.status === 'queued').length;
        totalToolCalls += flow.totalToolCalls;
        totalCompleted += flow.totalTasksCompleted;
        totalFailed += flow.tasks.filter((t) => t.status === 'failed').length;
      }

      setStats({
        totalAgents: agentsRef.current.size,
        activeTasks: agentPhaseRef.current.size > 0
          ? Array.from(agentPhaseRef.current.values()).filter((p) => p.phase === 'in-task').length
          : activeTasks,
        totalToolCalls,
        totalTasksCompleted: totalCompleted,
        totalTasksFailed: totalFailed,
        toolCallsPerMinute: toolCallTimestampsRef.current.length,
      });

      return currentFlows;
    });
  }, [emit, agentCount]);

  // --- Connect: spawn initial agents ---
  const connect = useCallback(() => {
    const now = Date.now();
    const count = Math.min(agentCount, AGENT_PROFILES.length);

    const newAgents = new Map<string, AgentIdentity>();
    const newFlows = new Map<string, AgentFlowTrace>();

    for (let i = 0; i < count; i++) {
      const profile = AGENT_PROFILES[i];
      const agentId = `agent_${i.toString().padStart(3, '0')}`;
      const identity: AgentIdentity = {
        agentId,
        name: profile.name,
        role: profile.role,
        createdAt: now,
      };
      newAgents.set(agentId, identity);
      newFlows.set(agentId, emptyFlow(identity));
      agentsRef.current.set(agentId, identity);
      flowsRef.current.set(agentId, emptyFlow(identity));
      agentPhaseRef.current.set(agentId, { phase: 'idle', taskId: null, callCount: 0, taskCount: 0 });

      // Emit spawn events
      const spawnEvent: AgentEvent = {
        eventId: `evt_spawn_${agentId}`,
        type: 'agent:spawn',
        timestamp: now + i * 100,
        agentId,
        payload: { name: profile.name, role: profile.role },
      };
      setTimeout(() => emit(spawnEvent), i * 200);
    }

    setAgents(newAgents);
    setFlows(newFlows);
    setConnected(true);
  }, [agentCount, emit]);

  const disconnect = useCallback(() => {
    setConnected(false);
    agentsRef.current.clear();
    flowsRef.current.clear();
    agentPhaseRef.current.clear();
    setAgents(new Map());
    setFlows(new Map());
    setRecentEvents([]);
  }, []);

  // --- Tick interval ---
  useEffect(() => {
    if (!connected) return;
    const intervalMs = 1000 / eventsPerSecond;
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [connected, eventsPerSecond, tick]);

  // --- Auto-start ---
  useEffect(() => {
    if (autoStart) connect();
    return () => disconnect();
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
