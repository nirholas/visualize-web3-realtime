'use client';

import React, { memo, type CSSProperties, type ReactNode } from 'react';
import { fontFamily, fontSize, fontWeight } from '../tokens/typography';
import { borderRadius } from '../tokens/spacing';

export interface BadgeProps {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}

export const Badge = memo<BadgeProps>(({
  children,
  color = 'var(--w3v-accent, #3d63ff)',
  style,
}) => (
  <span
    style={{
      alignItems: 'center',
      background: color,
      borderRadius: borderRadius.full,
      color: '#fff',
      display: 'inline-flex',
      fontFamily: fontFamily.mono,
      fontSize: fontSize['2xs'],
      fontWeight: fontWeight.semibold,
      justifyContent: 'center',
      lineHeight: 1,
      minWidth: 18,
      padding: '2px 6px',
      ...style,
    }}
  >
    {children}
  </span>
));

Badge.displayName = 'Badge';

// ============================================================================
// StatusDot — colored circle indicator
// ============================================================================

export interface StatusDotProps {
  color?: string;
  size?: number;
  pulse?: boolean;
  style?: CSSProperties;
}

export const StatusDot = memo<StatusDotProps>(({
  color = 'var(--w3v-success, #22c55e)',
  size = 6,
  pulse = false,
  style,
}) => (
  <span
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
      animation: pulse ? 'w3v-pulse 2s ease-in-out infinite' : undefined,
      ...style,
    }}
  />
));

StatusDot.displayName = 'StatusDot';
