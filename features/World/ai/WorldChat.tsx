'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { ForceGraphHandle } from '../ForceGraph';
import type { ShareColors } from '../SharePanel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAction {
  type: string;
  params: Record<string, unknown>;
}

interface WorldChatProps {
  graphRef: React.RefObject<ForceGraphHandle | null>;
  onColorChange: (colors: ShareColors) => void;
  onFilterChange: (filters: { protocols?: string[]; timeRange?: string }) => void;
  stats: { totalEvents: number; totalVolume: number; connections: number };
}

// ---------------------------------------------------------------------------
// WorldChat
// ---------------------------------------------------------------------------

export const WorldChat = memo<WorldChatProps>(function WorldChat({
  graphRef,
  onColorChange,
  onFilterChange,
  stats,
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // Execute scene actions returned by the AI
  const executeActions = useCallback(
    (actions: ChatAction[]) => {
      for (const action of actions) {
        switch (action.type) {
          case 'sceneColorUpdate': {
            const p = action.params as {
              background?: string;
              protocolColor?: string;
              userColor?: string;
            };
            onColorChange({
              background: p.background ?? '#ffffff',
              protocol: p.protocolColor ?? '#1a1a1a',
              user: p.userColor ?? '#1a1a1a',
            });
            break;
          }
          case 'cameraFocus': {
            const p = action.params as {
              hubIndex?: number;
              position?: [number, number, number];
              lookAt?: [number, number, number];
            };
            if (p.hubIndex !== undefined) {
              graphRef.current?.focusHub(p.hubIndex);
            } else if (p.position) {
              graphRef.current?.animateCameraTo({
                position: p.position,
                lookAt: p.lookAt,
              });
            }
            break;
          }
          case 'dataFilter': {
            const p = action.params as {
              protocols?: string[];
              timeRange?: string;
            };
            onFilterChange(p);
            break;
          }
          // agentSummary and tradeVisualization are Phase 2 — log for now
          default:
            break;
        }
      }
    },
    [graphRef, onColorChange, onFilterChange],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isStreaming) return;

      const userMessage = input.trim();
      setInput('');
      setError(null);

      const newMessages: ChatMessage[] = [
        ...messages,
        { role: 'user' as const, content: userMessage },
      ];
      setMessages(newMessages);
      setIsStreaming(true);

      try {
        const response = await fetch('/api/world-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages,
            context: {
              stats,
              hubCount: graphRef.current?.getHubCount() ?? 0,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error ?? `Request failed (${response.status})`);
        }

        const data = await response.json();

        // Execute scene commands from the AI
        if (data.actions && data.actions.length > 0) {
          executeActions(data.actions);
        }

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.message || '(no response)' },
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to process request.';
        setError(msg);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${msg}` },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [input, isStreaming, messages, stats, graphRef, executeActions],
  );

  // Collapsed state — just show the toggle button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          bottom: 16,
          color: '#e0e0e0',
          cursor: 'pointer',
          display: 'flex',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          gap: 6,
          left: 16,
          letterSpacing: '0.06em',
          padding: '8px 14px',
          position: 'absolute',
          textTransform: 'uppercase',
          zIndex: 25,
        }}
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        AI Agent
      </button>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        bottom: 16,
        display: 'flex',
        flexDirection: 'column',
        left: 16,
        overflow: 'hidden',
        position: 'absolute',
        width: 320,
        zIndex: 25,
      }}
    >
      {/* Header */}
      <div
        style={{
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '10px 12px',
        }}
      >
        <span
          style={{
            color: '#c0c0c0',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          AI Agent
        </span>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '0 4px',
          }}
          type="button"
        >
          &times;
        </button>
      </div>

      {/* Message history */}
      <div
        ref={scrollRef}
        style={{
          maxHeight: 240,
          minHeight: 60,
          overflowY: 'auto',
          padding: '8px 12px',
        }}
      >
        {messages.length === 0 && !isStreaming && (
          <div
            style={{
              color: '#666',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              lineHeight: 1.5,
              padding: '8px 0',
            }}
          >
            Ask about the world, change colors, focus on hubs, or filter data.
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: 6,
            }}
          >
            <span
              style={{
                color: '#666',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {msg.role === 'user' ? 'you' : 'agent'}:
            </span>{' '}
            <span
              style={{
                color: msg.role === 'user' ? '#7b9eff' : '#d0d0d0',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              {msg.content}
            </span>
          </div>
        ))}

        {isStreaming && (
          <div
            style={{
              color: '#888',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
            }}
          >
            <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>thinking...</span>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && !isStreaming && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderTop: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            padding: '4px 12px',
          }}
        >
          {error}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          padding: '8px 12px',
        }}
      >
        <input
          disabled={isStreaming}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the world..."
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            flex: 1,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            outline: 'none',
          }}
          value={input}
        />
        <button
          disabled={isStreaming || !input.trim()}
          style={{
            background: 'none',
            border: 'none',
            color: isStreaming || !input.trim() ? '#555' : '#7b9eff',
            cursor: isStreaming || !input.trim() ? 'default' : 'pointer',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            padding: '0 4px',
          }}
          type="submit"
        >
          Send
        </button>
      </form>
    </div>
  );
});

export default WorldChat;
