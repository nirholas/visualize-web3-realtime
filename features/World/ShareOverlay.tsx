'use client';

import { forwardRef, memo } from 'react';

// ============================================================================
// ShareOverlay — metadata bars rendered on top of the canvas when the share
// panel is open, so they become part of the exported screenshot.
// ============================================================================

interface ShareOverlayProps {
  address?: string;
  activeSince?: string;
  transactionCount?: number;
  volume?: number;
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

const barStyle: React.CSSProperties = {
  alignItems: 'center',
  backdropFilter: 'blur(8px)',
  background: 'rgba(0, 0, 0, 0.55)',
  display: 'flex',
  fontFamily: "'IBM Plex Mono', monospace",
  justifyContent: 'space-between',
  left: 0,
  padding: '8px 16px',
  position: 'absolute',
  right: 0,
  zIndex: 30,
};

const ShareOverlay = memo(forwardRef<HTMLDivElement, ShareOverlayProps>(
  (
    {
      address = '0x0000...0000',
      activeSince = 'Jan 2025',
      transactionCount = 0,
      volume = 0,
    },
    ref,
  ) => (
    <div
      ref={ref}
      data-share-overlay
      style={{
        inset: 0,
        pointerEvents: 'none',
        position: 'absolute',
        zIndex: 30,
      }}
    >
      {/* Top bar */}
      <div style={{ ...barStyle, top: 0 }}>
        <span style={{ color: '#fff', fontSize: 11, letterSpacing: '0.06em' }}>
          Address {truncateAddress(address)}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
          Active since {activeSince}
        </span>
      </div>

      {/* Bottom bar */}
      <div style={{ ...barStyle, bottom: 0 }}>
        <span style={{ color: '#fff', fontSize: 11, letterSpacing: '0.06em' }}>
          {transactionCount.toLocaleString()} Transactions
        </span>
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {formatVolume(volume)} Volume
        </span>
      </div>
    </div>
  ),
));

ShareOverlay.displayName = 'ShareOverlay';

export default ShareOverlay;
