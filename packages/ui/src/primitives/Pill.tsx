'use client';

import React, { memo, type CSSProperties, type ReactNode } from 'react';
import { fontFamily, fontSize, fontWeight } from '../tokens/typography';
import { borderRadius, shadows } from '../tokens/spacing';

// ============================================================================
// Pill — small capsule for displaying labels, stats, and status
// ============================================================================

export interface PillProps {
  children: ReactNode;
  /** Background color (defaults to surface) */
  bg?: string;
  /** Text color */
  color?: string;
  /** Optional left icon/dot */
  icon?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export const Pill = memo<PillProps>(({
  children,
  bg = 'var(--w3v-surface, #f5f5f5)',
  color = 'var(--w3v-fg, #161616)',
  icon,
  style,
  className,
}) => (
  <div
    className={className}
    style={{
      alignItems: 'center',
      background: bg,
      border: '1px solid var(--w3v-border, #e8e8e8)',
      borderRadius: borderRadius.md,
      boxShadow: shadows.sm,
      display: 'inline-flex',
      fontFamily: fontFamily.mono,
      fontSize: fontSize.sm,
      gap: 5,
      padding: '4px 12px',
      ...style,
    }}
  >
    {icon}
    <span style={{ color }}>{children}</span>
  </div>
));

Pill.displayName = 'Pill';

// ============================================================================
// StatPill — animated stat display with label + value
// ============================================================================

export interface StatPillProps {
  label: string;
  value: string | number;
  style?: CSSProperties;
}

export const StatPill = memo<StatPillProps>(({ label, value, style }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      padding: '6px 16px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: borderRadius.lg,
      minWidth: 100,
      ...style,
    }}
  >
    <span
      style={{
        fontSize: fontSize['2xs'],
        fontWeight: fontWeight.medium,
        fontFamily: fontFamily.mono,
        color: 'var(--w3v-muted, rgba(176,176,200,0.4))',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        lineHeight: 1,
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        fontFamily: fontFamily.mono,
        color: 'var(--w3v-fg, rgba(255,255,255,0.85))',
        lineHeight: 1.4,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </span>
  </div>
));

StatPill.displayName = 'StatPill';
