'use client';

import React, { memo, type CSSProperties } from 'react';
import { fontFamily, fontSize } from '../tokens/typography';
import { borderRadius, shadows, transitions } from '../tokens/spacing';

// ============================================================================
// ConnectionIndicator — shows connection status with a dot and label
// ============================================================================

export interface ConnectionIndicatorProps {
  connected: boolean;
  label: string;
  style?: CSSProperties;
}

export const ConnectionIndicator = memo<ConnectionIndicatorProps>(({ connected, label, style }) => (
  <div
    style={{
      display: 'flex',
      gap: 4,
      alignItems: 'center',
      padding: '3px 8px',
      fontFamily: fontFamily.mono,
      fontSize: fontSize['2xs'],
      color: 'var(--w3v-muted, #999)',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      ...style,
    }}
    title={`${label}: ${connected ? 'Connected' : 'Disconnected'}`}
  >
    <div
      style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: connected ? 'var(--w3v-success, #22c55e)' : 'var(--w3v-error, #ef4444)',
      }}
    />
    {label}
  </div>
));

ConnectionIndicator.displayName = 'ConnectionIndicator';

// ============================================================================
// WorldHeader — centered title with info button
// ============================================================================

export interface WorldHeaderProps {
  title?: string;
  onInfoClick?: () => void;
  infoButtonRef?: React.RefObject<HTMLButtonElement>;
  infoOpen?: boolean;
  style?: CSSProperties;
}

export const WorldHeader = memo<WorldHeaderProps>(({
  title = 'Web3Viz World',
  onInfoClick,
  infoButtonRef,
  infoOpen,
  style,
}) => (
  <div
    style={{
      alignItems: 'center',
      display: 'flex',
      gap: 8,
      left: '50%',
      position: 'absolute',
      top: 12,
      transform: 'translateX(-50%)',
      zIndex: 40,
      ...style,
    }}
  >
    <span
      style={{
        color: 'var(--w3v-muted, #999)',
        fontFamily: fontFamily.mono,
        fontSize: fontSize.sm,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}
    >
      {title}
    </span>
    {onInfoClick && (
      <div style={{ position: 'relative' }}>
        <button
          ref={infoButtonRef as React.RefObject<HTMLButtonElement>}
          aria-expanded={infoOpen}
          aria-label="Open information"
          onClick={onInfoClick}
          style={{
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(0, 0, 0, 0.12)',
            borderRadius: borderRadius.full,
            color: 'var(--w3v-fg, #161616)',
            cursor: 'pointer',
            display: 'flex',
            fontFamily: fontFamily.mono,
            fontSize: fontSize.base,
            height: 20,
            justifyContent: 'center',
            width: 20,
          }}
          type="button"
        >
          i
        </button>
      </div>
    )}
  </div>
));

WorldHeader.displayName = 'WorldHeader';
