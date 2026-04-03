'use client';

import { memo } from 'react';
import type { TopToken } from '@/hooks/usePumpFun';
import { COLOR_PALETTE } from './constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProtocolFilterSidebarProps {
  /** Top tokens to render as buttons */
  tokens: TopToken[];
  /** Currently highlighted hub mint (null = none) */
  activeMint: string | null;
  /** Called when a protocol button is clicked */
  onToggle: (mint: string) => void;
  /** Whether AI agent overlay is enabled */
  showAgents?: boolean;
  /** Called when the AI agent toggle is clicked */
  onToggleAgents?: () => void;
}

// ---------------------------------------------------------------------------
// Single Protocol Button
// ---------------------------------------------------------------------------

interface ProtocolButtonProps {
  token: TopToken;
  color: string;
  isActive: boolean;
  onClick: () => void;
}

const ProtocolButton = memo<ProtocolButtonProps>(({ token, color, isActive, onClick }) => {
  const iconText = (token.symbol || token.name || '??').slice(0, 2).toUpperCase();

  return (
    <button
      aria-label={token.symbol || token.name}
      aria-pressed={isActive}
      data-group={token.mint}
      onClick={onClick}
      title={`${token.symbol || token.name} — ${token.trades} trades`}
      style={{
        alignItems: 'center',
        background: isActive ? color : '#e8e8e8',
        border: isActive ? `2px solid ${color}` : '2px solid transparent',
        borderRadius: '50%',
        boxShadow: isActive ? `0 2px 12px ${color}60` : 'none',
        color: isActive ? '#fff' : '#333',
        cursor: 'pointer',
        display: 'flex',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        fontWeight: 700,
        height: 40,
        justifyContent: 'center',
        lineHeight: 1,
        outline: 'none',
        padding: 0,
        transition: 'all 150ms ease',
        width: 40,
      }}
    >
      {iconText}
    </button>
  );
});

ProtocolButton.displayName = 'ProtocolButton';

// ---------------------------------------------------------------------------
// Agent Toggle Button
// ---------------------------------------------------------------------------

const AgentToggle = memo<{ active: boolean; onClick: () => void }>(({ active, onClick }) => (
  <button
    aria-label="Toggle AI Agents overlay"
    aria-pressed={active}
    onClick={onClick}
    title={active ? 'Hide AI Agents' : 'Show AI Agents'}
    style={{
      alignItems: 'center',
      background: active ? '#c084fc' : '#e8e8e8',
      border: active ? '2px solid #c084fc' : '2px solid transparent',
      borderRadius: '50%',
      boxShadow: active ? '0 2px 12px #c084fc60' : 'none',
      color: active ? '#fff' : '#333',
      cursor: 'pointer',
      display: 'flex',
      fontSize: 16,
      height: 40,
      justifyContent: 'center',
      lineHeight: 1,
      outline: 'none',
      padding: 0,
      transition: 'all 150ms ease',
      width: 40,
    }}
  >
    🤖
  </button>
));
AgentToggle.displayName = 'AgentToggle';

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const ProtocolFilterSidebar = memo<ProtocolFilterSidebarProps>(
  ({ tokens, activeMint, onToggle, showAgents, onToggleAgents }) => {
    if (tokens.length === 0 && !onToggleAgents) return null;

    return (
      <nav
        aria-label="Protocol filters"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          left: 16,
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
        }}
      >
        {tokens.map((token, i) => (
          <ProtocolButton
            key={token.mint}
            token={token}
            color={COLOR_PALETTE[i % COLOR_PALETTE.length]}
            isActive={activeMint === token.mint}
            onClick={() => onToggle(token.mint)}
          />
        ))}
      </nav>
    );
  },
);

ProtocolFilterSidebar.displayName = 'ProtocolFilterSidebar';

export default ProtocolFilterSidebar;
