'use client';

import React, { memo, type CSSProperties } from 'react';
import { fontFamily, fontSize } from '../tokens/typography';
import { borderRadius } from '../tokens/spacing';

// ============================================================================
// SwatchPicker — row of color swatch circles
// ============================================================================

export interface SwatchPickerProps {
  swatches: string[];
  value: string;
  onChange: (hex: string) => void;
  size?: number;
  style?: CSSProperties;
}

export const SwatchPicker = memo<SwatchPickerProps>(({
  swatches,
  value,
  onChange,
  size = 24,
  style,
}) => (
  <div style={{ display: 'flex', gap: 6, ...style }}>
    {swatches.map((hex) => {
      const selected = value.toLowerCase() === hex.toLowerCase();
      return (
        <button
          key={hex}
          onClick={() => onChange(hex)}
          style={{
            background: hex,
            border: `2px solid ${selected ? 'var(--w3v-fg, #333)' : 'var(--w3v-border, #e0e0e0)'}`,
            borderRadius: borderRadius.full,
            boxShadow: selected ? '0 0 0 2px #fff, 0 0 0 4px var(--w3v-fg, #333)' : 'none',
            cursor: 'pointer',
            height: size,
            transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
            width: size,
          }}
          title={hex}
          type="button"
        />
      );
    })}
  </div>
));

SwatchPicker.displayName = 'SwatchPicker';

// ============================================================================
// ColorControl — label + hex input + swatch picker row
// ============================================================================

export interface ColorControlProps {
  label: string;
  value: string;
  swatches: string[];
  onChange: (hex: string) => void;
  style?: CSSProperties;
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
function normalizeHex(v: string): string {
  const raw = v.startsWith('#') ? v : `#${v}`;
  if (!HEX_RE.test(raw)) return '';
  if (raw.length === 4) return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  return raw.toLowerCase();
}

export const ColorControl = memo<ColorControlProps>(({ label, value, swatches, onChange, style }) => {
  const [inputVal, setInputVal] = React.useState(value);
  React.useEffect(() => setInputVal(value), [value]);

  const commit = React.useCallback(() => {
    const hex = normalizeHex(inputVal);
    if (hex) onChange(hex);
    else setInputVal(value);
  }, [inputVal, onChange, value]);

  return (
    <div style={{ marginBottom: 18, ...style }}>
      <div
        style={{
          color: 'var(--w3v-muted, #999)',
          fontFamily: fontFamily.mono,
          fontSize: fontSize['2xs'],
          letterSpacing: '0.1em',
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <input
        onBlur={commit}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        placeholder="Enter a custom HEX code"
        style={{
          background: 'var(--w3v-surface, #f5f5f5)',
          border: '1px solid var(--w3v-border, #e0e0e0)',
          borderRadius: borderRadius.md,
          color: 'var(--w3v-fg, #333)',
          fontFamily: fontFamily.mono,
          fontSize: fontSize.base,
          marginBottom: 8,
          outline: 'none',
          padding: '6px 10px',
          width: '100%',
        }}
        type="text"
        value={inputVal}
      />
      <SwatchPicker swatches={swatches} value={value} onChange={onChange} />
    </div>
  );
});

ColorControl.displayName = 'ColorControl';
