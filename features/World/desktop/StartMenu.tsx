'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { GLASS, APPS, TASKBAR_HEIGHT } from './desktopConstants';
import type { WindowId } from './desktopTypes';
import { getAppIcon, JourneyIcon } from './AppIcons';

interface StartMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWindow: (id: WindowId) => void;
  onStartJourney?: () => void;
  journeyDisabled?: boolean;
}

export const StartMenu = memo<StartMenuProps>(({
  isOpen,
  onClose,
  onOpenWindow,
  onStartJourney,
  journeyDisabled,
}) => {
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // Don't close if clicking the start button itself (handled by toggle)
        const target = e.target as HTMLElement;
        if (target.closest('[title="Start"]')) return;
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearch('');
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleAppClick = useCallback((id: WindowId) => {
    onOpenWindow(id);
    onClose();
  }, [onOpenWindow, onClose]);

  if (!isOpen) return null;

  const filteredApps = APPS.filter(
    (a) => a.label.toLowerCase().includes(search.toLowerCase()) ||
           a.description?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        bottom: TASKBAR_HEIGHT + 16,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 520,
        maxHeight: '70vh',
        background: GLASS.bgSolid,
        backdropFilter: GLASS.blur,
        WebkitBackdropFilter: GLASS.blur,
        border: GLASS.border,
        borderRadius: GLASS.radiusLg,
        boxShadow: GLASS.shadow,
        zIndex: 9500,
        fontFamily: "'IBM Plex Mono', monospace",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'startMenuOpen 200ms ease-out',
      }}
    >
      {/* User / branding header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '20px 24px 12px',
      }}>
        {/* Avatar */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #c084fc 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          color: '#fff',
          fontWeight: 600,
        }}>
          W3
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>
            Web3 Realtime
          </div>
          <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.04em' }}>
            Live blockchain visualizer
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 24px 16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '8px 12px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type here to search"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e2e8f0',
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          />
        </div>
      </div>

      {/* Pinned apps header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px 8px',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
          Pinned
        </span>
      </div>

      {/* App grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 4,
        padding: '0 16px 16px',
      }}>
        {filteredApps.map((app) => {
          const Icon = getAppIcon(app.icon);
          return (
            <AppTile
              key={app.id}
              label={app.label}
              icon={<Icon />}
              onClick={() => handleAppClick(app.id)}
            />
          );
        })}

        {/* Journey as a special action tile */}
        {(!search || 'journey'.includes(search.toLowerCase())) && onStartJourney && (
          <AppTile
            label="Journey"
            icon={<JourneyIcon />}
            onClick={() => { onStartJourney(); onClose(); }}
            disabled={journeyDisabled}
          />
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: GLASS.borderLight,
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 9, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Web3 Realtime v1.0
        </span>
      </div>
    </div>
  );
});

StartMenu.displayName = 'StartMenu';

/* ------------------------------------------------------------------ */
/*  App tile sub-component                                            */
/* ------------------------------------------------------------------ */

const AppTile = memo<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}>(({ label, icon, onClick, disabled }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      type="button"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '12px 8px',
        borderRadius: 8,
        border: 'none',
        background: hovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
        color: disabled ? '#475569' : '#e2e8f0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 150ms',
        fontFamily: "'IBM Plex Mono', monospace",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: 'rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 10, letterSpacing: '0.02em' }}>
        {label}
      </span>
    </button>
  );
});

AppTile.displayName = 'AppTile';
