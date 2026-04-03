'use client';

import React, { memo, type CSSProperties, type ReactNode } from 'react';
import { fontFamily, fontSize, fontWeight } from '../tokens/typography';
import { borderRadius, shadows } from '../tokens/spacing';
import { Dialog } from '../primitives/Dialog';

// ============================================================================
// InfoPopover — accessible info dialog
// ============================================================================

export interface InfoPopoverProps {
  id?: string;
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  title?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export const InfoPopover = memo<InfoPopoverProps>(({
  id,
  isOpen,
  onClose,
  anchorRef,
  title = 'About',
  children,
  style,
}) => (
  <Dialog id={id} isOpen={isOpen} onClose={onClose} anchorRef={anchorRef} style={style}>
    {title && (
      <h3
        style={{
          fontFamily: fontFamily.mono,
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
          color: 'var(--w3v-fg, #161616)',
          margin: '0 0 12px',
        }}
      >
        {title}
      </h3>
    )}
    {children || (
      <div
        style={{
          fontFamily: fontFamily.mono,
          fontSize: fontSize.sm,
          color: 'var(--w3v-muted, #555)',
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: '0 0 10px' }}>
          This is a real-time visualization of on-chain activity. Each hub represents
          a category of transactions, and the connecting nodes show individual wallets
          interacting with the protocol.
        </p>
        <p style={{ margin: '0 0 10px' }}>
          The force-directed graph uses physics simulation to naturally cluster related
          activity. Hub sizes scale with trading volume.
        </p>
        <p style={{ margin: 0 }}>
          Use the sidebar filters to focus on specific categories. Search for any wallet
          address in the bottom stats bar.
        </p>
      </div>
    )}
  </Dialog>
));

InfoPopover.displayName = 'InfoPopover';
