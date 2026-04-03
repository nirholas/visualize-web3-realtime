'use client';

import React, { memo, useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { fontFamily, fontSize } from '../tokens/typography';
import { borderRadius, shadows } from '../tokens/spacing';

// ============================================================================
// Dialog — accessible modal/popover with focus trap and keyboard handling
// ============================================================================

export interface DialogProps {
  id?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Anchor ref for popover positioning (if omitted, centers on screen) */
  anchorRef?: React.RefObject<HTMLElement | null>;
  style?: CSSProperties;
}

export const Dialog = memo<DialogProps>(({ id, isOpen, onClose, children, anchorRef, style }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap + keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      // Tab trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Focus first focusable element
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const firstFocusable = dialogRef.current.querySelector<HTMLElement>(
          'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
        );
        firstFocusable?.focus();
      }
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Compute position based on anchor
  const positioned = !!anchorRef;

  return (
    <div
      aria-modal="true"
      id={id}
      ref={dialogRef}
      role="dialog"
      style={{
        background: '#ffffff',
        border: '1px solid var(--w3v-border, #e0e0e0)',
        borderRadius: borderRadius.xl,
        boxShadow: shadows.xl,
        fontFamily: fontFamily.mono,
        fontSize: fontSize.sm,
        maxWidth: positioned ? 360 : 480,
        padding: '16px 20px',
        position: positioned ? 'absolute' : 'fixed',
        zIndex: 60,
        ...(positioned
          ? { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 }
          : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
        ...style,
      }}
    >
      {children}
    </div>
  );
});

Dialog.displayName = 'Dialog';

// ============================================================================
// Panel — slide-in side panel
// ============================================================================

export interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  side?: 'left' | 'right';
  style?: CSSProperties;
}

export const Panel = memo<PanelProps>(({
  isOpen,
  onClose,
  children,
  width = 320,
  side = 'right',
  style,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
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

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      style={{
        animation: 'w3v-slide-in 0.25s ease-out',
        background: '#fff',
        borderLeft: side === 'right' ? '1px solid var(--w3v-border, #e0e0e0)' : undefined,
        borderRight: side === 'left' ? '1px solid var(--w3v-border, #e0e0e0)' : undefined,
        boxShadow: side === 'right' ? '-4px 0 24px rgba(0,0,0,0.08)' : '4px 0 24px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        padding: '24px 20px',
        position: 'absolute',
        [side]: 0,
        top: 0,
        width,
        zIndex: 50,
        ...style,
      }}
    >
      {children}
    </div>
  );
});

Panel.displayName = 'Panel';
