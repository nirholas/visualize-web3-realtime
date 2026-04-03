'use client';

import Link from 'next/link';
import dynamicImport from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AgentTask, AgentIdentity } from '@web3viz/core';
import type { AgentForceGraphHandle } from '@/features/Agents/AgentForceGraph';
import { useAgentProvider } from '@/hooks/useAgentProvider';
import { useAgentKeyboardShortcuts } from '@/hooks/useAgentKeyboardShortcuts';
import AgentSidebar from '@/features/Agents/AgentSidebar';
import AgentStatsBar from '@/features/Agents/AgentStatsBar';
import AgentLiveFeed from '@/features/Agents/AgentLiveFeed';
import AgentTimeline from '@/features/Agents/AgentTimeline';
import ExecutorBanner from '@/features/Agents/ExecutorBanner';
import AgentLoadingScreen from '@/features/Agents/AgentLoadingScreen';
import { TaskInspectorPanel } from '@/features/Agents/TaskInspector';
import { agentThemeTokens } from '@/packages/ui/src/tokens/agent-colors';
import { timestampedFilename } from '@/features/World/utils/screenshot';

// Lazy-load the 3D force graph (Three.js not SSR-safe)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AgentForceGraph = dynamicImport(() => import('@/features/Agents/AgentForceGraph'), {
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
// Wrapped Page Component (useSearchParams in separate component)
// ---------------------------------------------------------------------------

function AgentsPageInner() {
  const searchParams = useSearchParams();
  const agentGraphRef = useRef<AgentForceGraphHandle>(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [pageReady, setPageReady] = useState(false);
  const [activeToolCategories, setActiveToolCategories] = useState<Set<string>>(ALL_TOOL_CATEGORIES);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scrubOffset, setScrubOffset] = useState(0);
  const [feedVisible, setFeedVisible] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [colorScheme, setColorScheme] = useState<'dark' | 'light'>('dark');
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [downloading, setDownloading] = useState<boolean>(false);
  const [demoActive, setDemoActive] = useState(false);

  const { stats, agents, flows, executorState, agentStats, connected, events } = useAgentProvider({
    mock: process.env.NEXT_PUBLIC_AGENT_MOCK !== 'false',
    url: process.env.NEXT_PUBLIC_SPERAXOS_WS_URL,
    apiKey: process.env.NEXT_PUBLIC_SPERAXOS_API_KEY,
    enabled: demoActive,
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

  // Step timeline by 5 seconds per arrow press
  const STEP_MS = 5000;
  const handleStepBackward = useCallback(() => {
    setScrubOffset((prev) => prev + STEP_MS);
  }, []);
  const handleStepForward = useCallback(() => {
    setScrubOffset((prev) => Math.max(0, prev - STEP_MS));
  }, []);

  const handleDownloadAgent = useCallback(() => {
    if (!agentGraphRef.current || downloading) return;
    const dataURL = agentGraphRef.current.takeSnapshot();
    if (!dataURL) return;
    const link = document.createElement('a');
    link.download = timestampedFilename('agent-world');
    link.href = dataURL;
    link.click();
  }, [downloading]);

  // Mark page ready once first agent data arrives
  useEffect(() => {
    if (!pageReady && agents.size > 0) setPageReady(true);
  }, [agents.size, pageReady]);

  // Track window width for responsive layout
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Deep link support: ?agentId=X
  useEffect(() => {
    const agentId = searchParams.get('agentId');
    if (agentId && agents.has(agentId)) {
      setActiveAgentId(agentId);
    }
  }, [searchParams, agents]);

  // Event batching: collect events over 100ms window to prevent UI jank
  const pendingEventsRef = useRef<any[]>([]);
  const [batchedEvents, setBatchedEvents] = useState<any[]>([]);

  useEffect(() => {
    const allEvents = stats.rawEvents
      .filter((e) => e.type === 'agentEvent')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e) => (e as any).data)
      .slice(0, 500);

    pendingEventsRef.current = allEvents;

    const timer = setTimeout(() => {
      setBatchedEvents(pendingEventsRef.current);
    }, 100);

    return () => clearTimeout(timer);
  }, [stats.rawEvents]);

  const recentAgentEvents = batchedEvents;

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
    onStepBackward: handleStepBackward,
    onStepForward: handleStepForward,
  });

  const BANNER_H = 24;
  const TIMELINE_H = 40;
  const STATS_H = 60;

  // Responsive layout breakpoints
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  // Calculate layout dimensions based on breakpoint
  const sidebarWidth = isMobile ? 0 : isTablet ? 48 : 200;
  const feedWidth = isMobile ? 0 : isTablet ? 200 : 260;
  const themeTokens = agentThemeTokens[colorScheme];

  // Check if all agents are idle
  const allAgentsIdle = pageReady && agents.size > 0 && agentStats.activeTasks === 0;

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: themeTokens.background,
      }}
    >
      {/* Loading screen — shown until first agent data arrives (only when demo is active) */}
      {demoActive && <AgentLoadingScreen ready={pageReady} />}

      {/* Agent sidebar — left (full height) */}
      {!isMobile && (
        <AgentSidebar
          agents={agents}
          executorState={executorState}
          activeAgentId={activeAgentId}
          enabledToolCategories={activeToolCategories}
          onSelectAgent={handleSelectAgent}
          onToolCategoryToggle={handleToggleToolCategory}
          collapsed={isTablet}
          colorScheme={colorScheme}
        />
      )}

      {/* Executor health banner — top of graph area */}
      <ExecutorBanner
        executorState={executorState}
        connected={connected}
        lastHeartbeat={executorState?.lastHeartbeat}
        sidebarWidth={sidebarWidth}
        feedWidth={feedVisible ? feedWidth : 0}
        colorScheme={colorScheme}
      />

      {/* Timeline scrubber */}
      {!isMobile && (
        <AgentTimeline
          events={recentAgentEvents}
          agents={agents}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          scrubOffset={scrubOffset}
          onScrubChange={setScrubOffset}
          colorScheme={colorScheme}
          speed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          onAgentSelect={handleSelectAgent}
        />
      )}

      {/* 3D Force graph */}
      <div
        style={{
          position: 'absolute',
          top: BANNER_H + (isMobile ? 0 : TIMELINE_H),
          left: sidebarWidth,
          right: feedVisible ? feedWidth : 0,
          bottom: STATS_H,
        }}
      >
        <Suspense fallback={null}>
          <AgentForceGraph
            ref={agentGraphRef}
            agents={stats.topTokens}
            toolEdges={stats.traderEdges}
            flows={flows}
            executorState={executorState}
            recentEvents={recentAgentEvents}
            activeAgentId={activeAgentId}
            onAgentSelect={handleSelectAgent}
            backgroundColor={themeTokens.background}
            colorScheme={colorScheme}
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
          colorScheme={colorScheme}
        />
      )}

      {/* Stats bar — bottom */}
      <AgentStatsBar
        totalAgents={agentStats.totalAgents}
        activeTasks={agentStats.activeTasks}
        toolCallsPerMinute={agentStats.toolCallsPerMinute}
        totalCompleted={agentStats.totalTasksCompleted}
        totalErrors={agentStats.totalTasksFailed}
        colorScheme={colorScheme}
        sidebarWidth={sidebarWidth}
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

      {/* Share/Download button — top right, left of theme toggle */}
      <button
        onClick={handleDownloadAgent}
        disabled={downloading}
        aria-label="Download agent world screenshot"
        title="Download agent world screenshot"
        style={{
          position: 'absolute',
          top: 4,
          right: 44,
          zIndex: 30,
          background: 'transparent',
          border: 'none',
          color: themeTokens.text,
          cursor: downloading ? 'not-allowed' : 'pointer',
          fontSize: 14,
          padding: 8,
          outline: 'none',
          opacity: downloading ? 0.5 : 1,
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = '2px solid #c084fc';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        {downloading ? '⟳' : '📷'}
      </button>

      {/* Theme toggle button — top right */}
      <button
        onClick={() => setColorScheme((s) => (s === 'dark' ? 'light' : 'dark'))}
        aria-label="Toggle theme"
        title={`Switch to ${colorScheme === 'dark' ? 'light' : 'dark'} mode`}
        style={{
          position: 'absolute',
          top: 4,
          right: 8,
          zIndex: 30,
          background: 'transparent',
          border: 'none',
          color: themeTokens.text,
          cursor: 'pointer',
          fontSize: 14,
          padding: 8,
          outline: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = '2px solid #c084fc';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        {colorScheme === 'dark' ? '☀' : '☽'}
      </button>

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
      {!isMobile && (
        <button
          onClick={handleToggleFeed}
          aria-label={feedVisible ? 'Hide feed' : 'Show feed'}
          style={{
            position: 'absolute',
            top: BANNER_H + TIMELINE_H + 8,
            right: feedVisible ? feedWidth + 8 : 8,
            zIndex: 20,
            background: 'rgba(10,10,15,0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            color: feedVisible ? themeTokens.agentHubActive : themeTokens.muted,
            cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            padding: '3px 8px',
            letterSpacing: '0.06em',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #c084fc';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          {feedVisible ? '▸ Hide Feed' : '◂ Feed'}
        </button>
      )}

      {/* All agents idle overlay */}
      {allAgentsIdle && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          <div
            style={{
              background: `${themeTokens.agentHub}cc`,
              backdropFilter: 'blur(4px)',
              border: `1px solid ${themeTokens.edge}`,
              borderRadius: 8,
              padding: '12px 24px',
              color: themeTokens.muted,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            All agents idle. No active tasks.
          </div>
        </div>
      )}

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

      {/* Dormant state — shown when no demo/connection is active */}
      {!demoActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            background: themeTokens.background,
          }}
        >
          <span
            style={{
              color: themeTokens.muted,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Agent Executor
          </span>
          <span
            style={{
              color: themeTokens.muted,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              opacity: 0.6,
              marginBottom: 24,
            }}
          >
            No agent executor connected. Run a demo to preview the visualization.
          </span>
          <button
            onClick={() => setDemoActive(true)}
            style={{
              background: 'transparent',
              border: `1px solid ${themeTokens.agentHubActive}`,
              borderRadius: 6,
              color: themeTokens.agentHubActive,
              cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.08em',
              padding: '10px 28px',
              textTransform: 'uppercase',
            }}
          >
            Run Demo
          </button>
        </div>
      )}
    </div>
  );
}

// Export wrapped with Suspense for useSearchParams compatibility
export default function AgentsPage() {
  return (
    <Suspense fallback={<div style={{ width: '100%', height: '100vh', background: '#0a0a0f' }} />}>
      <AgentsPageInner />
    </Suspense>
  );
}
