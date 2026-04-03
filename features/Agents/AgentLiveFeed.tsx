'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { AgentEvent, AgentIdentity } from '@web3viz/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ago`;
}

function getEventIcon(type: string): string {
  if (type.startsWith('tool:')) return '⚡';
  if (type.startsWith('task:started')) return '▶';
  if (type.startsWith('task:completed')) return '✓';
  if (type.startsWith('task:failed')) return '✗';
  if (type.startsWith('agent:spawn') || type.startsWith('subagent:spawn')) return '⬡';
  if (type.startsWith('reasoning:')) return '◎';
  return '·';
}

function getEventColor(type: string): string {
  if (type.startsWith('tool:')) return '#60a5fa';
  if (type.startsWith('task:completed')) return '#34d399';
  if (type.startsWith('task:failed')) return '#f87171';
  if (type.startsWith('task:')) return '#a78bfa';
  if (type.startsWith('agent:') || type.startsWith('subagent:')) return '#c084fc';
  if (type.startsWith('reasoning:')) return '#fbbf24';
  return '#6b7280';
}

function getEventLabel(event: AgentEvent, agentName: string): { title: string; sub: string } {
  const p = event.payload;
  switch (event.type) {
    case 'agent:spawn':
      return { title: agentName, sub: `spawned · role: ${p.role ?? '?'}` };
    case 'task:started':
      return { title: agentName, sub: String(p.description ?? 'new task').slice(0, 36) };
    case 'task:completed':
      return { title: agentName, sub: 'task completed' };
    case 'task:failed':
      return { title: agentName, sub: `failed: ${String(p.error ?? '').slice(0, 28)}` };
    case 'tool:started':
      return { title: agentName, sub: `${p.toolName} — ${String(p.inputSummary ?? '').slice(0, 24)}` };
    case 'tool:completed':
      return { title: agentName, sub: `${p.toolName ?? 'tool'} done` };
    case 'subagent:spawn':
      return { title: agentName, sub: `spawned ${p.name ?? 'sub-agent'}` };
    case 'reasoning:update':
      return { title: agentName, sub: String(p.text ?? '').slice(0, 36) };
    default:
      return { title: agentName, sub: event.type };
  }
}

// ---------------------------------------------------------------------------
// Event card
// ---------------------------------------------------------------------------

const EventRow = memo<{
  event: AgentEvent;
  agentName: string;
  isNew: boolean;
  onClick: () => void;
}>(({ event, agentName, isNew, onClick }) => {
  const color = getEventColor(event.type);
  const icon = getEventIcon(event.type);
  const { title, sub } = getEventLabel(event, agentName);

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        textAlign: 'left',
        padding: '8px 12px',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: isNew ? 'rgba(192,132,252,0.05)' : 'transparent',
        cursor: 'pointer',
        fontFamily: "'IBM Plex Mono', monospace",
        transition: 'background 0.3s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <span style={{ fontSize: 11, color, flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#e5e7eb', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        <span style={{ fontSize: 8, color: '#4b5563', flexShrink: 0 }}>{timeAgo(event.timestamp)}</span>
      </div>
      <div
        style={{
          fontSize: 9,
          color: '#9ca3af',
          paddingLeft: 17,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {sub}
      </div>
    </button>
  );
});
EventRow.displayName = 'EventRow';

// ---------------------------------------------------------------------------
// Feed container
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 50;

interface AgentLiveFeedProps {
  events: AgentEvent[];
  agents: Map<string, AgentIdentity>;
  onSelectAgent?: (agentId: string) => void;
}

const AgentLiveFeed = memo<AgentLiveFeedProps>(({ events, agents, onSelectAgent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());

  const visible = events.slice(0, MAX_VISIBLE);

  // Track new events
  useEffect(() => {
    const incoming = new Set<string>();
    for (const e of visible) {
      if (!prevIdsRef.current.has(e.eventId)) {
        incoming.add(e.eventId);
      }
    }
    if (incoming.size > 0) {
      setNewIds(incoming);
      const t = setTimeout(() => setNewIds(new Set()), 600);
      return () => clearTimeout(t);
    }
    prevIdsRef.current = new Set(visible.map((e) => e.eventId));
  }, [visible]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // If user scrolled down (away from top), pause auto-scroll
    setAutoScroll(el.scrollTop < 20);
  }, []);

  if (visible.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 60,
        width: 260,
        background: 'rgba(10,10,15,0.9)',
        backdropFilter: 'blur(12px)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 12px 8px',
          fontSize: 9,
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontFamily: "'IBM Plex Mono', monospace",
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#34d399',
            animation: 'livePulse 2s ease-in-out infinite',
          }}
        />
        Agent Activity
        {!autoScroll && (
          <button
            onClick={() => {
              setAutoScroll(true);
              if (containerRef.current) containerRef.current.scrollTop = 0;
            }}
            style={{
              marginLeft: 'auto',
              fontSize: 8,
              color: '#c084fc',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ↑ LIVE
          </button>
        )}
      </div>

      {/* Event list */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {visible.map((evt) => {
          const agent = agents.get(evt.agentId);
          return (
            <EventRow
              key={evt.eventId}
              event={evt}
              agentName={agent?.name ?? evt.agentId.slice(0, 8)}
              isNew={newIds.has(evt.eventId)}
              onClick={() => onSelectAgent?.(evt.agentId)}
            />
          );
        })}
      </div>

      <style>{`@keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
});

AgentLiveFeed.displayName = 'AgentLiveFeed';
export default AgentLiveFeed;
