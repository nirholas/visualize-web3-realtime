'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { isValidHex, normalizeHex } from './utils/shared';
import { useDarkMode } from './DarkModeContext';

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
// ColorControl — reusable row (label + hex input + swatches)
// ============================================================================

interface ColorControlProps {
  label: string;
  value: string;
  swatches: string[];
  onChange: (hex: string) => void;
}

const ColorControl = memo<ColorControlProps>(({ label, value, swatches, onChange }) => {
  const isDark = useDarkMode();
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
          color: isDark ? '#64748b' : '#999',
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
          background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e0e0e0',
          borderRadius: 6,
          color: isDark ? '#e2e8f0' : '#333',
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
                border: `2px solid ${selected ? (isDark ? '#e2e8f0' : '#333') : (isDark ? 'rgba(255,255,255,0.12)' : '#e0e0e0')}`,
                borderRadius: '50%',
                boxShadow: selected ? (isDark ? '0 0 0 2px #0a0a12, 0 0 0 4px #e2e8f0' : '0 0 0 2px #fff, 0 0 0 4px #333') : 'none',
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
// FooterButton — small button for share/download actions
// ============================================================================

interface FooterButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const FooterButton = memo<FooterButtonProps>(({ label, onClick, disabled = false }) => {
  const isDark = useDarkMode();
  return (
  <button
    disabled={disabled}
    onClick={onClick}
    style={{
      alignItems: 'center',
      background: disabled ? (isDark ? 'rgba(255,255,255,0.04)' : '#e8e8e8') : (isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'),
      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #d0d0d0',
      borderRadius: 6,
      color: disabled ? (isDark ? '#475569' : '#aaa') : (isDark ? '#e2e8f0' : '#333'),
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 10,
      gap: 4,
      letterSpacing: '0.04em',
      padding: '6px 10px',
      transition: 'background 0.15s ease, color 0.15s ease',
      whiteSpace: 'nowrap',
    }}
    type="button"
  >
    {label}
  </button>
  );
});

FooterButton.displayName = 'FooterButton';

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
  const isDark = useDarkMode();
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
        background: isDark ? 'rgba(14, 14, 22, 0.97)' : '#fff',
        borderLeft: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e0e0e0',
        boxShadow: isDark ? '-4px 0 24px rgba(0,0,0,0.4)' : '-4px 0 24px rgba(0,0,0,0.08)',
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
          color: isDark ? '#e2e8f0' : '#1a1a1a',
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
          color: isDark ? '#64748b' : '#888',
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
          background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e0e0e0',
          borderRadius: 8,
          color: isDark ? '#94a3b8' : '#555',
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
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e0e0e0',
          borderRadius: 8,
          color: isDark ? '#64748b' : '#888',
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

      {/* Spacer to push footer to bottom */}
      <div style={{ flex: 1, minHeight: 16 }} />

      {/* Share / Download footer */}
      <div
        style={{
          borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e0e0e0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'space-between',
          paddingTop: 16,
        }}
      >
        {/* Social share */}
        <div style={{ display: 'flex', gap: 6 }}>
          {onShareX && (
            <FooterButton label="Share on X" onClick={onShareX} />
          )}
          {onShareLinkedIn && (
            <FooterButton label="Share on LinkedIn" onClick={onShareLinkedIn} />
          )}
        </div>
        {/* Downloads */}
        <div style={{ display: 'flex', gap: 6 }}>
          {onDownloadWorld && (
            <FooterButton
              label={downloading === 'world' ? 'Exporting…' : 'Download World'}
              disabled={downloading !== null}
              onClick={onDownloadWorld}
            />
          )}
          {onDownloadSnapshot && (
            <FooterButton
              label={downloading === 'snapshot' ? 'Exporting…' : 'Download Snapshot'}
              disabled={downloading !== null}
              onClick={onDownloadSnapshot}
            />
          )}
        </div>
      </div>
    </div>
  );
});

SharePanel.displayName = 'SharePanel';

export default SharePanel;
