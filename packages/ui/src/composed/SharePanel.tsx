'use client';

import React, { memo, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import type { ShareColors } from '@web3viz/core';
import { fontFamily, fontSize } from '../tokens/typography';
import { borderRadius, shadows } from '../tokens/spacing';
import { swatches } from '../tokens/colors';
import { ColorControl } from '../primitives/ColorControl';
import { Button } from '../primitives/Button';

// ============================================================================
// SharePanel — right-side panel for color customization and sharing
// ============================================================================

export interface SharePanelProps {
  isOpen: boolean;
  colors: ShareColors;
  onChange: (colors: ShareColors) => void;
  onClose: () => void;
  onDownloadWorld?: () => void;
  onDownloadSnapshot?: () => void;
  onShareX?: () => void;
  onShareLinkedIn?: () => void;
  downloading?: 'world' | 'snapshot' | null;
  style?: CSSProperties;
}

export const SharePanel = memo<SharePanelProps>(({
  isOpen,
  colors,
  onChange,
  onClose,
  onDownloadWorld,
  onDownloadSnapshot,
  onShareX,
  onShareLinkedIn,
  downloading = null,
  style,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [isOpen, onClose]);

  const handleRemix = useCallback(() => {
    const pick = (arr: readonly string[]) => arr[Math.floor(Math.random() * arr.length)];
    onChange({
      background: pick(swatches.remix.backgrounds),
      protocol: pick(swatches.remix.accents),
      user: pick(swatches.remix.accents),
    });
  }, [onChange]);

  const set = useCallback(
    (key: keyof ShareColors) => (hex: string) => {
      onChange({ ...colors, [key]: hex });
    },
    [colors, onChange],
  );

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      style={{
        animation: 'w3v-slide-in 0.25s ease-out',
        background: 'var(--w3v-bg, #fff)',
        borderLeft: '1px solid var(--w3v-border, #e0e0e0)',
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
        ...style,
      }}
    >
      <h2
        style={{
          color: 'var(--w3v-fg, #1a1a1a)',
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xl,
          fontWeight: 600,
          margin: '0 0 4px',
        }}
      >
        Edit snapshot
      </h2>
      <p
        style={{
          color: 'var(--w3v-muted, #888)',
          fontFamily: fontFamily.mono,
          fontSize: fontSize.sm,
          lineHeight: 1.5,
          margin: '0 0 24px',
        }}
      >
        Style your world and share it on social media.
      </p>

      <ColorControl label="World background" onChange={set('background')} swatches={[...swatches.background]} value={colors.background} />
      <ColorControl label="Protocols color" onChange={set('protocol')} swatches={[...swatches.protocol]} value={colors.protocol} />
      <ColorControl label="User color" onChange={set('user')} swatches={[...swatches.user]} value={colors.user} />

      <Button variant="secondary" onClick={handleRemix} style={{ width: '100%', marginBottom: 12, justifyContent: 'center' }}>
        &#x21bb; Remix
      </Button>

      <Button variant="ghost" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
        Close
      </Button>

      <div style={{ flex: 1, minHeight: 16 }} />

      <div
        style={{
          borderTop: '1px solid var(--w3v-border, #e0e0e0)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'space-between',
          paddingTop: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {onShareX && <Button size="sm" variant="secondary" onClick={onShareX}>Share on X</Button>}
          {onShareLinkedIn && <Button size="sm" variant="secondary" onClick={onShareLinkedIn}>Share on LinkedIn</Button>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onDownloadWorld && (
            <Button size="sm" variant="secondary" disabled={downloading !== null} onClick={onDownloadWorld}>
              {downloading === 'world' ? 'Exporting\u2026' : 'Download World'}
            </Button>
          )}
          {onDownloadSnapshot && (
            <Button size="sm" variant="secondary" disabled={downloading !== null} onClick={onDownloadSnapshot}>
              {downloading === 'snapshot' ? 'Exporting\u2026' : 'Download Snapshot'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

SharePanel.displayName = 'SharePanel';
