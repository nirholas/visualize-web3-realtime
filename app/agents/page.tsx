'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentTask, AgentIdentity } from '@web3viz/core';
import { useAgentProvider } from '@/hooks/useAgentProvider';
import { useAgentKeyboardShortcuts } from '@/hooks/useAgentKeyboardShortcuts';
import AgentSidebar from '@/features/Agents/AgentSidebar';
import AgentStatsBar from '@/features/Agents/AgentStatsBar';
import AgentLiveFeed from '@/features/Agents/AgentLiveFeed';
import AgentTimeline from '@/features/Agents/AgentTimeline';
import ExecutorBanner from '@/features/Agents/ExecutorBanner';
import AgentLoadingScreen from '@/features/Agents/AgentLoadingScreen';
import { TaskInspectorPanel } from '@/features/Agents/TaskInspector';

// Lazy-load the 3D force graph (Three.js not SSR-safe)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AgentForceGraph = dynamic(() => import('@/features/Agents/AgentForceGraph'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'IBM Plex Mono', monospace",
        color: '#c084fc',
        fontSize: 12,
        letterSpacing: '0.1em',
      }}
    >
      Connecting to agent executor...
    </div>
  ),
}) as any;

// ---------------------------------------------------------------------------
// Tool categories
// ---------------------------------------------------------------------------

const ALL_TOOL_CATEGORIES = new Set(['filesystem', 'search', 'terminal', 'network', 'code', 'reasoning']);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AgentsPage() {
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [pageReady, setPageReady] = useState(false);
  const [activeToolCategories, setActiveToolCategories] = useState<Set<string>>(ALL_TOOL_CATEGORIES);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scrubOffset, setScrubOffset] = useState(0);
  const [feedVisible, setFeedVisible] = useState(true);

  const { stats, agents, flows, executorState, agentStats, connected, events } = useAgentProvider({
    mock: process.env.NEXT_PUBLIC_AGENT_MOCK !== 'false',
    url: process.env.NEXT_PUBLIC_SPERAXOS_WS_URL,
    apiKey: process.env.NEXT_PUBLIC_SPERAXOS_API_KEY,
    enabled: true,
  });

  const handleSelectAgent = useCallback((agentId: string | null) => {
    setActiveAgentId(agentId);
  }, []);

  const handleSelectTask = useCallback((taskId: string | null) => {
    setSelectedTaskId(taskId);
  }, []);

  const handleToggleToolCategory = useCallback((category: string) => {
    setActiveToolCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleTogglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const handleFitCamera = useCallback(() => {
    // Camera fit is handled by AgentForceGraph internally
  }, []);
  const handleToggleFeed = useCallback(() => setFeedVisible((v) => !v), []);

  // Mark page ready once first agent data arrives
  useEffect(() => {
    if (!pageReady && agents.size > 0) setPageReady(true);
  }, [agents.size, pageReady]);

  // Get recent raw agent events for the live feed + timeline
  const recentAgentEvents = useMemo(() => {
    return stats.rawEvents
      .filter((e) => e.type === 'agentEvent')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e) => (e as any).data)
      .slice(0, 500);
  }, [stats.rawEvents]);

  // Extract selected task and related agent
  const selectedTask = useMemo<AgentTask | null>(() => {
    if (!selectedTaskId) return null;

    // Search through all flows to find the task
    for (const flow of flows.values()) {
      for (const task of flow.tasks) {
        if (task.taskId === selectedTaskId) {
          return task;
        }
      }
    }
    return null;
  }, [selectedTaskId, flows]);

  const selectedTaskAgent = useMemo(() => {
    if (!selectedTask) return null;
    return agents.get(selectedTask.agentId) ?? null;
  }, [selectedTask, agents]);

  // Get tool calls for the selected task
  const selectedTaskToolCalls = useMemo(() => {
    if (!selectedTask) return [];

    for (const flow of flows.values()) {
      if (flow.agent.agentId === selectedTask.agentId) {
        return flow.toolCalls.filter((tc) => tc.taskId === selectedTask.taskId);
      }
    }
    return [];
  }, [selectedTask, flows]);

  // Get sub-agents spawned by the selected task
  const selectedTaskSubAgents = useMemo(() => {
    if (!selectedTask) return [];

    // Find sub-agents created during this task's execution
    const subAgents = [];
    for (const agent of agents.values()) {
      if (
        agent.parentAgentId === selectedTask.agentId &&
        agent.createdAt >= (selectedTask.startedAt || 0) &&
        (!selectedTask.endedAt || agent.createdAt <= selectedTask.endedAt)
      ) {
        subAgents.push(agent);
      }
    }
    return subAgents;
  }, [selectedTask, agents]);

  // Keyboard shortcuts
  useAgentKeyboardShortcuts({
    agents,
    onSelectAgent: handleSelectAgent,
    onTogglePlay: handleTogglePlay,
    onFitCamera: handleFitCamera,
    onToggleFeed: handleToggleFeed,
    onCloseInspector: () => setSelectedTaskId(null),
  });

  const BANNER_H = 24;
  const TIMELINE_H = 40;
  const STATS_H = 60;

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0a0f',
      }}
    >
      {/* Loading screen — shown until first agent data arrives */}
      <AgentLoadingScreen ready={pageReady} />
      {/* Agent sidebar — left (full height) */}
      <AgentSidebar
        agents={agents}
        flows={flows}
        executorState={executorState}
        activeAgentId={activeAgentId}
        activeToolCategories={activeToolCategories}
        onSelectAgent={handleSelectAgent}
        onToggleToolCategory={handleToggleToolCategory}
      />

      {/* Executor health banner — top of graph area */}
      <ExecutorBanner
        executorState={executorState}
        connected={connected}
        lastHeartbeat={executorState?.lastHeartbeat}
      />

      {/* Timeline scrubber */}
      <AgentTimeline
        events={recentAgentEvents}
        agents={agents}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        scrubOffset={scrubOffset}
        onScrubChange={setScrubOffset}
      />

      {/* 3D Force graph */}
      <div
        style={{
          position: 'absolute',
          top: BANNER_H + TIMELINE_H,
          left: 200,
          right: feedVisible ? 260 : 0,
          bottom: STATS_H,
        }}
      >
        <Suspense fallback={null}>
          <AgentForceGraph
            agents={stats.topTokens}
            toolEdges={stats.traderEdges}
            flows={flows}
            executorState={executorState}
            recentEvents={recentAgentEvents}
            activeAgentId={activeAgentId}
            onAgentSelect={handleSelectAgent}
            backgroundColor="#0a0a0f"
            height="100%"
          />
        </Suspense>
      </div>

      {/* Live event feed — right */}
      {feedVisible && (
        <AgentLiveFeed
          events={recentAgentEvents}
          agents={agents}
          onSelectAgent={handleSelectAgent}
        />
      )}

      {/* Stats bar — bottom */}
      <AgentStatsBar
        stats={agentStats}
        uptime={executorState?.uptime}
      />

      {/* Navigation — top center (above executor banner) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          height: BANNER_H,
          gap: 12,
          fontFamily: "'IBM Plex Mono', monospace",
          pointerEvents: 'none',
        }}
      >
        <Link
          href="/world"
          style={{
            fontSize: 9,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6b7280',
            textDecoration: 'none',
            pointerEvents: 'all',
          }}
        >
          ← World
        </Link>
        <span style={{ fontSize: 9, color: '#c084fc', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          ⬡ Agent World
        </span>
      </div>

      {/* Connection indicator — top left of graph area */}
      <div
        style={{
          position: 'absolute',
          top: BANNER_H + 4,
          left: 208,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 8,
          color: '#4b5563',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        <div
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: connected ? '#34d399' : '#6b7280',
          }}
        />
        {connected ? 'live' : 'mock'}
      </div>

      {/* Feed toggle button */}
      <button
        onClick={handleToggleFeed}
        style={{
          position: 'absolute',
          top: BANNER_H + TIMELINE_H + 8,
          right: feedVisible ? 268 : 8,
          zIndex: 20,
          background: 'rgba(10,10,15,0.8)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4,
          color: feedVisible ? '#c084fc' : '#4b5563',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          padding: '3px 8px',
          letterSpacing: '0.06em',
        }}
      >
        {feedVisible ? '▸ Hide Feed' : '◂ Feed'}
      </button>

      {/* Task Inspector Panel */}
      {selectedTask && selectedTaskAgent && (
        <TaskInspectorPanel
          task={selectedTask}
          agent={selectedTaskAgent}
          toolCalls={selectedTaskToolCalls}
          subAgents={selectedTaskSubAgents}
          recentEvents={recentAgentEvents}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
