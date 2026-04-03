'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface InfoPopoverProps {
  anchorRef: React.RefObject<HTMLElement>;
  id: string;
  isOpen: boolean;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function InfoPopover({ anchorRef, id, isOpen, onClose }: InfoPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    lastFocusedRef.current = document.activeElement as HTMLElement;

    const container = popoverRef.current;
    const firstFocusable = container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const withinPopover = popoverRef.current?.contains(target);
      const withinAnchor = anchorRef.current?.contains(target);
      if (!withinPopover && !withinAnchor) onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !popoverRef.current) return;

      const focusables = Array.from(
        popoverRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled'));

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [anchorRef, isOpen, onClose]);

  const floatingStyle = useMemo<React.CSSProperties>(() => {
    if (isMobile) {
      return {
        left: '50%',
        position: 'fixed',
        top: 64,
        transform: 'translateX(-50%)',
        width: 'min(92vw, 400px)',
      };
    }

    return {
      position: 'absolute',
      right: 0,
      top: 'calc(100% + 10px)',
      width: 400,
    };
  }, [isMobile]);

  return (
    <div
      aria-hidden={!isOpen}
      aria-modal="true"
      id={id}
      ref={popoverRef}
      role="dialog"
      style={{
        ...floatingStyle,
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 12,
        boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
        color: '#111111',
        opacity: isOpen ? 1 : 0,
        padding: 18,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'opacity 200ms ease, transform 200ms ease',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <h2
          style={{
            fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 16,
            fontWeight: 600,
            margin: 0,
          }}
        >
          Web3 World
        </h2>
        <button
          aria-label="Close info popover"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid rgba(0,0,0,0.2)',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 12,
            height: 28,
            width: 28,
          }}
          type="button"
        >
          X
        </button>
      </div>

      <p style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.6, margin: '0 0 10px 0' }}>
        A live visualization of blockchain activity across multiple chains and protocols,
        mapping real-time token launches, trades, and on-chain events.
      </p>
      <p style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.6, margin: '0 0 10px 0' }}>
        Each point represents a wallet actively trading tokens. Larger hubs represent the
        busiest categories by activity, and every line reveals a fresh trade relationship.
      </p>
      <p style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
        Everything you see is backed by on-chain data streaming in over WebSocket. Let it run
        and watch the network evolve in real time.
      </p>
    </div>
  );
}
