'use client';

import { forwardRef, memo } from 'react';
import { truncateAddress, formatVolume } from './utils/shared';

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

const barStyle: React.CSSProperties = {
  alignItems: 'center',
  backdropFilter: 'blur(8px)',
  background: 'rgba(255, 255, 255, 0.85)',
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
        <span style={{ color: '#161616', fontSize: 11, letterSpacing: '0.06em' }}>
          Address {truncateAddress(address)}
        </span>
        <span style={{ color: '#999', fontSize: 10 }}>
          Active since {activeSince}
        </span>
      </div>

      {/* Bottom bar */}
      <div style={{ ...barStyle, bottom: 0 }}>
        <span style={{ color: '#161616', fontSize: 11, letterSpacing: '0.06em' }}>
          {transactionCount.toLocaleString()} Transactions
        </span>
        <span style={{ color: '#161616', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {formatVolume(volume)} Volume
        </span>
      </div>
    </div>
  ),
));

ShareOverlay.displayName = 'ShareOverlay';

export default ShareOverlay;
