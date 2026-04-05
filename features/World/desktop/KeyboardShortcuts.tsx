'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { GLASS } from './desktopConstants';
import type { WindowId } from './desktopTypes';

interface ShortcutEntry {
  keys: string[];
  description: string;
}

const SHORTCUT_SECTIONS: { title: string; shortcuts: ShortcutEntry[] }[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Toggle this help overlay' },
      { keys: ['Space'], description: 'Play / Pause' },
      { keys: ['Escape'], description: 'Close open menu or overlay' },
    ],
  },
  {
    title: 'Windows',
    shortcuts: [
      { keys: ['1'], description: 'Toggle Filters' },
      { keys: ['2'], description: 'Toggle Live Feed' },
      { keys: ['3'], description: 'Toggle Stats' },
      { keys: ['4'], description: 'Toggle AI Chat' },
      { keys: ['5'], description: 'Toggle Share' },
      { keys: ['6'], description: 'Toggle Data Sources' },
    ],
  },
];

const WINDOW_KEYS: Record<string, WindowId> = {
  '1': 'filters',
  '2': 'livefeed',
  '3': 'stats',
  '4': 'aichat',
  '5': 'share',
  '6': 'sources',
};

interface KeyboardShortcutsProps {
  onToggleWindow: (id: WindowId) => void;
  onTogglePlay: () => void;
}

export const KeyboardShortcuts = memo<KeyboardShortcutsProps>(({
  onToggleWindow,
  onTogglePlay,
}) => {
  const [visible, setVisible] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't capture when typing in inputs
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === '?') {
      e.preventDefault();
      setVisible((v) => !v);
      return;
    }

    if (e.key === 'Escape' && visible) {
      setVisible(false);
      return;
    }

    if (e.key === ' ' && !visible) {
      e.preventDefault();
      onTogglePlay();
      return;
    }

    const windowId = WINDOW_KEYS[e.key];
    if (windowId && !visible) {
      e.preventDefault();
      onToggleWindow(windowId);
    }
  }, [visible, onTogglePlay, onToggleWindow]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!visible) return null;

  return (
    <div
      onClick={() => setVisible(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 150ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxHeight: '70vh',
          overflow: 'auto',
          background: GLASS.bgSolid,
          border: GLASS.border,
          borderRadius: GLASS.radiusLg,
          boxShadow: GLASS.shadow,
          fontFamily: "'IBM Plex Mono', monospace",
          animation: 'winOpen 200ms ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 12px',
          borderBottom: GLASS.borderLight,
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#e2e8f0',
            letterSpacing: '0.04em',
          }}>
            Keyboard Shortcuts
          </span>
          <button
            onClick={() => setVisible(false)}
            type="button"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
            }}
          >
            &#x2715;
          </button>
        </div>

        {/* Sections */}
        <div style={{ padding: '12px 20px 20px' }}>
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}>
                {section.title}
              </div>
              {section.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.description}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#c8d0dc' }}>
                    {shortcut.description}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 24,
                          height: 22,
                          padding: '0 6px',
                          fontSize: 10,
                          fontWeight: 500,
                          fontFamily: "'IBM Plex Mono', monospace",
                          color: '#e2e8f0',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 4,
                        }}
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          borderTop: GLASS.borderLight,
          padding: '10px 20px',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: 9, color: '#475569', letterSpacing: '0.04em' }}>
            Press <kbd style={{
              padding: '1px 5px',
              fontSize: 9,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
              color: '#94a3b8',
            }}>?</kbd> to dismiss
          </span>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
});

KeyboardShortcuts.displayName = 'KeyboardShortcuts';
