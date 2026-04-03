'use client';

import React, { forwardRef, memo, type CSSProperties } from 'react';
import { fontFamily, fontSize, fontWeight } from '../tokens/typography';

// ============================================================================
// ShareOverlay — metadata bars overlaid on canvas during share mode
// ============================================================================

export interface ShareOverlayProps {
  address?: string;
  activeSince?: string;
  transactionCount?: number;
  volume?: number;
  style?: CSSProperties;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

const barStyle: CSSProperties = {
  alignItems: 'center',
  backdropFilter: 'blur(8px)',
  background: 'rgba(0, 0, 0, 0.55)',
  display: 'flex',
  fontFamily: fontFamily.mono,
  fontSize: fontSize.sm,
  justifyContent: 'space-between',
  left: 0,
  padding: '8px 16px',
  position: 'absolute',
  right: 0,
  zIndex: 25,
};

export const ShareOverlay = memo(forwardRef<HTMLDivElement, ShareOverlayProps>(
  ({ address, activeSince, transactionCount, volume, style }, ref) => (
    <div ref={ref} style={{ pointerEvents: 'none', ...style }}>
      {/* Top bar */}
      <div style={{ ...barStyle, top: 0 }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em' }}>
          {address ? truncateAddress(address) : 'Web3Viz World'}
        </span>
        {activeSince && (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: fontSize['2xs'] }}>
            Active since {activeSince}
          </span>
        )}
      </div>
      {/* Bottom bar */}
      <div style={{ ...barStyle, bottom: 0 }}>
        {transactionCount != null && (
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>
            {transactionCount.toLocaleString()} txns
          </span>
        )}
        {volume != null && (
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>
            {formatVolume(volume)} volume
          </span>
        )}
      </div>
    </div>
  ),
));

ShareOverlay.displayName = 'ShareOverlay';
