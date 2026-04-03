'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { AgentEvent, AgentIdentity } from '@web3viz/core';
import { AGENT_COLOR_PALETTE } from './constants';
import { agentThemeTokens } from '@/packages/ui/src/tokens/agent-colors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PlaybackSpeed = 1 | 2 | 4;

interface AgentTimelineProps {
  events: AgentEvent[];
  agents: Map<string, AgentIdentity>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  /** Time offset from now in ms (0 = live, positive = past) */
  scrubOffset: number;
  onScrubChange: (offsetMs: number) => void;
  /** Visible time window in ms (default: 2 min) */
  windowMs?: number;
  colorScheme?: 'dark' | 'light';
  /** Playback speed multiplier for replaying past events */
  speed?: PlaybackSpeed;
  onSpeedChange?: (speed: PlaybackSpeed) => void;
  /** Called when a task block is clicked, with the agentId */
  onAgentSelect?: (agentId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WINDOW_MS = 2 * 60 * 1000; // 2 minutes

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}

// ---------------------------------------------------------------------------
// Canvas timeline
// ---------------------------------------------------------------------------

const SPEED_OPTIONS: PlaybackSpeed[] = [1, 2, 4];

const AgentTimeline = memo<AgentTimelineProps>(({
  events,
  agents,
  isPlaying,
  onTogglePlay,
  scrubOffset,
  onScrubChange,
  windowMs = WINDOW_MS,
  colorScheme = 'dark',
  speed = 1,
  onSpeedChange,
  onAgentSelect,
}) => {
  const tokens = agentThemeTokens[colorScheme];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isLive = scrubOffset === 0;

  // Store rendered spans for click-to-select
  const renderedSpansRef = useRef<Array<{
    agentId: string;
    x1: number;
    x2: number;
    y: number;
    h: number;
  }>>([]);

  // --- Draw timeline ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = 24;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, 0, width, height);

    const now = Date.now();
    const windowEnd = now - scrubOffset;
    const windowStart = windowEnd - windowMs;

    // Draw task activity blocks per agent
    const agentList = Array.from(agents.values());
    const rowH = Math.floor((height - 4) / Math.max(1, agentList.length));

    // Collect task spans from events
    const taskSpans: Array<{
      agentIdx: number;
      startMs: number;
      endMs: number;
      status: string;
    }> = [];

    // Build spans by tracking task:started → task:completed/failed pairs
    const openTasks = new Map<string, { agentIdx: number; startMs: number }>();
    for (const evt of events) {
      const agentIdx = agentList.findIndex((a) => a.agentId === evt.agentId);
      if (agentIdx < 0) continue;

      if (evt.type === 'task:started' && evt.taskId) {
        openTasks.set(evt.taskId, { agentIdx, startMs: evt.timestamp });
      } else if ((evt.type === 'task:completed' || evt.type === 'task:failed') && evt.taskId) {
        const open = openTasks.get(evt.taskId);
        if (open) {
          taskSpans.push({
            agentIdx: open.agentIdx,
            startMs: open.startMs,
            endMs: evt.timestamp,
            status: evt.type === 'task:completed' ? 'completed' : 'failed',
          });
          openTasks.delete(evt.taskId);
        }
      }
    }

    // Add still-open tasks
    for (const [, open] of openTasks) {
      taskSpans.push({ ...open, endMs: now, status: 'active' });
    }

    // Draw spans and store hit-boxes for click detection
    const hitBoxes: typeof renderedSpansRef.current = [];
    for (const span of taskSpans) {
      if (span.endMs < windowStart || span.startMs > windowEnd) continue;
      const x1 = ((span.startMs - windowStart) / windowMs) * width;
      const x2 = ((span.endMs - windowStart) / windowMs) * width;
      const y = 2 + span.agentIdx * rowH;
      const color =
        span.status === 'active'
          ? AGENT_COLOR_PALETTE[span.agentIdx % AGENT_COLOR_PALETTE.length]
          : span.status === 'completed'
          ? '#34d399'
          : '#f87171';

      const rx = Math.max(0, x1);
      const rw = Math.max(2, x2 - x1);
      ctx.fillStyle = color + 'cc';
      ctx.fillRect(rx, y, rw, rowH - 1);

      const agent = agentList[span.agentIdx];
      if (agent) {
        hitBoxes.push({ agentId: agent.agentId, x1: rx, x2: rx + rw, y, h: rowH - 1 });
      }
    }
    renderedSpansRef.current = hitBoxes;

    // Scrubber line
    if (!isLive) {
      const scrubX = ((windowEnd - windowStart) / windowMs) * width - 1;
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(scrubX, 0, 2, height);
    } else {
      // Live indicator — rightmost edge
      ctx.fillStyle = '#34d399';
      ctx.fillRect(width - 2, 0, 2, height);
    }
  }, [events, agents, scrubOffset, windowMs, isLive]);

  // --- Drag scrubbing ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click landed on a task block → select that agent
    if (onAgentSelect) {
      for (const span of renderedSpansRef.current) {
        if (x >= span.x1 && x <= span.x2 && y >= span.y && y <= span.y + span.h) {
          onAgentSelect(span.agentId);
          break;
        }
      }
    }

    const frac = Math.max(0, Math.min(1, x / rect.width));
    const timeFromLeft = frac * windowMs;
    // frac=1 → live (0 offset); frac=0 → windowMs ago
    onScrubChange(Math.round(windowMs - timeFromLeft));
  }, [onScrubChange, windowMs, onAgentSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const frac = Math.max(0, Math.min(1, x / rect.width));
    onScrubChange(Math.round(windowMs - frac * windowMs));
  }, [onScrubChange, windowMs]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 24,
        left: 200,
        right: 260,
        zIndex: 15,
        background: 'rgba(10,10,15,0.88)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        height: 40,
        padding: '0 8px',
        gap: 8,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      {/* Time label left */}
      <span style={{ fontSize: 8, color: '#4b5563', whiteSpace: 'nowrap' }}>
        ◀ {formatTime(windowMs)} ago
      </span>

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ flex: 1, cursor: 'ew-resize', userSelect: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>

      {/* NOW label */}
      <span style={{ fontSize: 8, color: isLive ? '#34d399' : '#4b5563', whiteSpace: 'nowrap' }}>
        NOW ▶
      </span>

      {/* Play/pause */}
      <button
        onClick={onTogglePlay}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 4,
          color: '#9ca3af',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 10,
          padding: '2px 8px',
        }}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>

      {/* Speed control */}
      {onSpeedChange && (
        <button
          onClick={() => {
            const idx = SPEED_OPTIONS.indexOf(speed);
            const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
            onSpeedChange(next);
          }}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 4,
            color: speed > 1 ? '#c084fc' : '#9ca3af',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 9,
            padding: '2px 6px',
            minWidth: 28,
            textAlign: 'center',
          }}
        >
          {speed}x
        </button>
      )}

      {/* Live indicator */}
      {isLive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: '#34d399', letterSpacing: '0.08em' }}>
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#34d399',
              animation: 'livePulse2 2s ease-in-out infinite',
            }}
          />
          LIVE
        </div>
      )}
      {!isLive && (
        <button
          onClick={() => onScrubChange(0)}
          style={{
            background: 'none',
            border: '1px solid rgba(192,132,252,0.3)',
            borderRadius: 4,
            color: '#c084fc',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 8,
            letterSpacing: '0.06em',
            padding: '2px 6px',
          }}
        >
          ● LIVE
        </button>
      )}
      <style>{`@keyframes livePulse2 { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
});

AgentTimeline.displayName = 'AgentTimeline';
export default AgentTimeline;
