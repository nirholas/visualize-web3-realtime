'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ShareColors {
  background: string;
  protocol: string;
  user: string;
}

interface SharePanelProps {
  colors: ShareColors;
  onChange: (colors: ShareColors) => void;
  onClose: () => void;
  onDownloadWorld?: () => void;
  onDownloadSnapshot?: () => void;
  onShareX?: () => void;
  onShareLinkedIn?: () => void;
  downloading?: 'world' | 'snapshot' | null;
}

// ============================================================================
// Palettes
// ============================================================================

const BG_SWATCHES = [
  '#ffffff', '#3a3a3a', '#768bea', '#84bbdc',
  '#87c47d', '#d18949', '#cc6b57', '#7e61ee',
];

const PROTOCOL_SWATCHES = [
  '#ffffff', '#d2d2d2', '#7b8eea', '#86bcdc',
  '#89c57f', '#d18b4e', '#ce715f', '#8165ee',
];

const USER_SWATCHES = PROTOCOL_SWATCHES;

// Extended palettes for Remix
const REMIX_BG = [
  '#ffffff', '#08080f', '#1a1a2e', '#0f3460', '#16213e',
  '#3a3a3a', '#768bea', '#84bbdc', '#87c47d', '#d18949',
  '#cc6b57', '#7e61ee', '#e2e2e2', '#fdf6e3', '#282a36',
];

const REMIX_ACCENT = [
  '#7b8eea', '#86bcdc', '#89c57f', '#d18b4e', '#ce715f',
  '#8165ee', '#e06c75', '#56b6c2', '#c678dd', '#98c379',
  '#d19a66', '#61afef', '#e5c07b', '#ff79c6', '#50fa7b',
];

// ============================================================================
// Hex validation
// ============================================================================

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function isValidHex(v: string): boolean {
  return HEX_RE.test(v.startsWith('#') ? v : `#${v}`);
}

function normalizeHex(v: string): string {
  const raw = v.startsWith('#') ? v : `#${v}`;
  if (!HEX_RE.test(raw)) return '';
  if (raw.length === 4) {
    // Expand shorthand #abc → #aabbcc
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return raw.toLowerCase();
}

// ============================================================================
// ColorControl — reusable row (label + hex input + swatches)
// ============================================================================

interface ColorControlProps {
  label: string;
  value: string;
  swatches: string[];
  onChange: (hex: string) => void;
}

const ColorControl = memo<ColorControlProps>(({ label, value, swatches, onChange }) => {
  const [inputVal, setInputVal] = useState(value);

  // Sync external value changes
  useEffect(() => {
    setInputVal(value);
  }, [value]);

  const commit = useCallback(() => {
    const hex = normalizeHex(inputVal);
    if (hex) onChange(hex);
    else setInputVal(value); // revert invalid
  }, [inputVal, onChange, value]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commit();
    },
    [commit],
  );

  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          color: '#999',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: '0.1em',
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>

      {/* Hex input */}
      <input
        onBlur={commit}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Enter a custom HEX code"
        style={{
          background: '#f5f5f5',
          border: '1px solid #e0e0e0',
          borderRadius: 6,
          color: '#333',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          marginBottom: 8,
          outline: 'none',
          padding: '6px 10px',
          width: '100%',
        }}
        type="text"
        value={inputVal}
      />

      {/* Swatch row */}
      <div style={{ display: 'flex', gap: 6 }}>
        {swatches.map((hex) => {
          const selected = value.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              onClick={() => onChange(hex)}
              style={{
                background: hex,
                border: `2px solid ${selected ? '#333' : '#e0e0e0'}`,
                borderRadius: '50%',
                boxShadow: selected ? '0 0 0 2px #fff, 0 0 0 4px #333' : 'none',
                cursor: 'pointer',
                height: 24,
                transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                width: 24,
              }}
              title={hex}
              type="button"
            />
          );
        })}
      </div>
    </div>
  );
});

ColorControl.displayName = 'ColorControl';

// ============================================================================
// SharePanel
// ============================================================================

const SharePanel = memo<SharePanelProps>(({
  colors,
  onChange,
  onClose,
  onDownloadWorld,
  onDownloadSnapshot,
  onShareX,
  onShareLinkedIn,
  downloading = null,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay listener to avoid the opening click from immediately closing
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  const handleRemix = useCallback(() => {
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    onChange({
      background: pick(REMIX_BG),
      protocol: pick(REMIX_ACCENT),
      user: pick(REMIX_ACCENT),
    });
  }, [onChange]);

  const set = useCallback(
    (key: keyof ShareColors) => (hex: string) => {
      onChange({ ...colors, [key]: hex });
    },
    [colors, onChange],
  );

  return (
    <div
      ref={panelRef}
      style={{
        animation: 'slideInRight 0.25s ease-out',
        background: '#fff',
        borderLeft: '1px solid #e0e0e0',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        padding: '24px 20px',
        position: 'absolute',
        right: 0,
        top: 0,
        width: 320,
        zIndex: 50,
      }}
    >
      {/* Header */}
      <h2
        style={{
          color: '#1a1a1a',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 16,
          fontWeight: 600,
          margin: '0 0 4px',
        }}
      >
        Edit snapshot
      </h2>
      <p
        style={{
          color: '#888',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          lineHeight: 1.5,
          margin: '0 0 24px',
        }}
      >
        Style your world and share it on social media.
      </p>

      {/* Color controls */}
      <ColorControl label="World background" onChange={set('background')} swatches={BG_SWATCHES} value={colors.background} />
      <ColorControl label="Protocols color" onChange={set('protocol')} swatches={PROTOCOL_SWATCHES} value={colors.protocol} />
      <ColorControl label="User color" onChange={set('user')} swatches={USER_SWATCHES} value={colors.user} />

      {/* Remix */}
      <button
        onClick={handleRemix}
        style={{
          alignItems: 'center',
          background: '#f5f5f5',
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          color: '#555',
          cursor: 'pointer',
          display: 'flex',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          gap: 8,
          justifyContent: 'center',
          marginBottom: 12,
          padding: '10px 0',
          transition: 'background 0.15s ease',
          width: '100%',
        }}
        type="button"
      >
        &#x21bb; Remix
      </button>

      {/* Close */}
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          color: '#888',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          padding: '10px 0',
          transition: 'background 0.15s ease',
          width: '100%',
        }}
        type="button"
      >
        Close
      </button>
    </div>
  );
});

SharePanel.displayName = 'SharePanel';

export default SharePanel;
