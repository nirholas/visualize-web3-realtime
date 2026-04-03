'use client';

import React, { memo, type InputHTMLAttributes, type CSSProperties, forwardRef } from 'react';
import { fontFamily, fontSize } from '../tokens/typography';
import { borderRadius, transitions } from '../tokens/spacing';

// ============================================================================
// TextInput
// ============================================================================

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'dark';
  inputStyle?: CSSProperties;
}

export const TextInput = memo(forwardRef<HTMLInputElement, TextInputProps>(
  ({ variant = 'default', inputStyle, style, ...rest }, ref) => {
    const isDark = variant === 'dark';

    return (
      <input
        ref={ref}
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : 'var(--w3v-surface, #f5f5f5)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'var(--w3v-border, #e0e0e0)'}`,
          borderRadius: borderRadius.md,
          color: isDark ? 'rgba(255,255,255,0.8)' : 'var(--w3v-fg, #333)',
          fontFamily: fontFamily.mono,
          fontSize: fontSize.sm,
          outline: 'none',
          padding: '5px 10px',
          transition: `border-color ${transitions.fast}`,
          width: '100%',
          ...inputStyle,
          ...style,
        }}
        {...rest}
      />
    );
  },
));

TextInput.displayName = 'TextInput';

// ============================================================================
// HexInput — specialized input for hex color values
// ============================================================================

export interface HexInputProps {
  value: string;
  onChange: (hex: string) => void;
  style?: CSSProperties;
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeHex(v: string): string {
  const raw = v.startsWith('#') ? v : `#${v}`;
  if (!HEX_RE.test(raw)) return '';
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return raw.toLowerCase();
}

export const HexInput = memo<HexInputProps>(({ value, onChange, style }) => {
  const [input, setInput] = React.useState(value);
  React.useEffect(() => setInput(value), [value]);

  const commit = React.useCallback(() => {
    const hex = normalizeHex(input);
    if (hex) onChange(hex);
    else setInput(value);
  }, [input, onChange, value]);

  return (
    <input
      onBlur={commit}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      placeholder="Enter HEX"
      style={{
        background: 'var(--w3v-surface, #f5f5f5)',
        border: '1px solid var(--w3v-border, #e0e0e0)',
        borderRadius: borderRadius.md,
        color: 'var(--w3v-fg, #333)',
        fontFamily: fontFamily.mono,
        fontSize: fontSize.base,
        outline: 'none',
        padding: '6px 10px',
        width: '100%',
        ...style,
      }}
      type="text"
      value={input}
    />
  );
});

HexInput.displayName = 'HexInput';
