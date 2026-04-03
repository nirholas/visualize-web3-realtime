'use client';

import React, { memo, type CSSProperties, type ReactNode } from 'react';
import { m } from 'framer-motion';
import { fontFamily, fontSize, fontWeight } from '../tokens/typography';
import { Button } from '../primitives/Button';

// ============================================================================
// JourneyOverlay — full-screen step overlay for guided tours
// ============================================================================

export interface JourneyOverlayProps {
  isVisible: boolean;
  label?: string;
  title?: string;
  description?: string;
  onSkip: () => void;
  style?: CSSProperties;
}

export const JourneyOverlay = memo<JourneyOverlayProps>(({
  isVisible,
  label,
  title,
  description,
  onSkip,
  style,
}) => {
  if (!isVisible) return null;

  return (
    <m.div
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'center',
        left: 0,
        position: 'absolute',
        top: 0,
        width: '100%',
        zIndex: 80,
        ...style,
      }}
    >
      {label && (
        <span
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontFamily: fontFamily.mono,
            fontSize: fontSize.xs,
            letterSpacing: '0.1em',
            marginBottom: 8,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      )}
      {title && (
        <h2
          style={{
            color: '#fff',
            fontFamily: fontFamily.mono,
            fontSize: '24px',
            fontWeight: fontWeight.semibold,
            margin: '0 0 12px',
            textAlign: 'center',
          }}
        >
          {title}
        </h2>
      )}
      {description && (
        <p
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontFamily: fontFamily.mono,
            fontSize: fontSize.md,
            lineHeight: 1.6,
            maxWidth: 460,
            textAlign: 'center',
          }}
        >
          {description}
        </p>
      )}
      <Button
        variant="ghost"
        onClick={onSkip}
        style={{
          color: 'rgba(255,255,255,0.5)',
          position: 'absolute',
          right: 20,
          top: 20,
          border: 'none',
          boxShadow: 'none',
        }}
      >
        Skip
      </Button>
    </m.div>
  );
});

JourneyOverlay.displayName = 'JourneyOverlay';

// ============================================================================
// StartJourneyButton
// ============================================================================

export interface StartJourneyButtonProps {
  disabled?: boolean;
  isRunning?: boolean;
  onClick: () => void;
  restarted?: boolean;
  style?: CSSProperties;
}

export const StartJourneyButton = memo<StartJourneyButtonProps>(({
  disabled,
  isRunning,
  onClick,
  restarted,
  style,
}) => {
  const label = isRunning ? 'Tour Running' : restarted ? 'Restart Journey' : 'Start Journey';

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        alignItems: 'center',
        background: 'var(--w3v-fg, #161616)',
        border: 'none',
        borderRadius: '50%',
        bottom: 80,
        color: 'var(--w3v-bg, #fff)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        fontFamily: fontFamily.mono,
        fontSize: fontSize['2xs'],
        height: 68,
        justifyContent: 'center',
        left: 12,
        opacity: disabled ? 0.5 : 1,
        position: 'absolute',
        textAlign: 'center',
        textTransform: 'uppercase',
        width: 68,
        zIndex: 20,
        letterSpacing: '0.06em',
        lineHeight: 1.3,
        ...style,
      }}
    >
      {label}
    </button>
  );
});

StartJourneyButton.displayName = 'StartJourneyButton';
