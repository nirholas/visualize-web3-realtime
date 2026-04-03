'use client';

import React, { memo, type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { fontFamily, fontSize } from '../tokens/typography';
import { borderRadius, shadows, transitions } from '../tokens/spacing';

// ============================================================================
// Button variants
// ============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'var(--w3v-fg, #161616)',
    color: 'var(--w3v-bg, #ffffff)',
    border: 'none',
  },
  secondary: {
    background: 'var(--w3v-surface, #f0f0f0)',
    color: 'var(--w3v-fg, #333)',
    border: '1px solid var(--w3v-border, #d0d0d0)',
  },
  ghost: {
    background: 'none',
    color: 'var(--w3v-muted, #888)',
    border: '1px solid var(--w3v-border, #e0e0e0)',
  },
  icon: {
    background: 'rgba(0, 0, 0, 0.04)',
    color: 'var(--w3v-fg, #161616)',
    border: '1px solid rgba(0, 0, 0, 0.12)',
    borderRadius: borderRadius.full,
    padding: '0',
  },
};

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: {
    padding: '4px 10px',
    fontSize: fontSize.xs,
    height: 28,
  },
  md: {
    padding: '6px 14px',
    fontSize: fontSize.base,
    height: 34,
  },
  lg: {
    padding: '10px 20px',
    fontSize: fontSize.md,
    height: 42,
  },
};

// ============================================================================
// Component
// ============================================================================

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = memo<ButtonProps>(({
  variant = 'secondary',
  size = 'md',
  style,
  disabled,
  children,
  ...rest
}) => (
  <button
    disabled={disabled}
    style={{
      alignItems: 'center',
      borderRadius: borderRadius.md,
      boxShadow: shadows.sm,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      fontFamily: fontFamily.mono,
      fontWeight: 500,
      gap: 4,
      justifyContent: 'center',
      letterSpacing: '0.04em',
      opacity: disabled ? 0.5 : 1,
      textTransform: 'uppercase',
      transition: `background ${transitions.fast}, color ${transitions.fast}`,
      whiteSpace: 'nowrap',
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...style,
    }}
    {...rest}
  >
    {children}
  </button>
));

Button.displayName = 'Button';
