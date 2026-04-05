'use client';

import { memo, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { GLASS, TASKBAR_HEIGHT } from '../desktop/desktopConstants';

interface OnboardingPromptProps {
  visible: boolean;
  onStart: () => void;
  onDismiss: () => void;
}

const FONT = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * A subtle nudge that appears for first-time visitors asking if they want
 * a guided walkthrough. Sits above the taskbar, non-intrusive.
 */
export const OnboardingPrompt = memo<OnboardingPromptProps>(({
  visible,
  onStart,
  onDismiss,
}) => {
  const [hoverStart, setHoverStart] = useState(false);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          style={{
            position: 'fixed',
            bottom: TASKBAR_HEIGHT + 20,
            right: 20,
            width: 300,
            background: GLASS.bgSolid,
            backdropFilter: GLASS.blur,
            WebkitBackdropFilter: GLASS.blur,
            border: GLASS.border,
            borderRadius: GLASS.radius,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            padding: 18,
            zIndex: 9400,
            fontFamily: FONT,
          }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 1.5 }}
        >
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#e2e8f0',
            marginBottom: 6,
          }}>
            First time here?
          </div>

          <div style={{
            fontSize: 11,
            color: '#94a3b8',
            lineHeight: 1.55,
            marginBottom: 14,
          }}>
            Take a quick tour to learn how to navigate the 3D graph, enable data sources, and explore live blockchain activity.
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <button
              onClick={onStart}
              onMouseEnter={() => setHoverStart(true)}
              onMouseLeave={() => setHoverStart(false)}
              type="button"
              style={{
                background: hoverStart
                  ? 'rgba(99, 102, 241, 0.9)'
                  : 'rgba(99, 102, 241, 0.7)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.02em',
                padding: '7px 16px',
                transition: 'background 150ms',
              }}
            >
              Show me around
            </button>

            <button
              onClick={onDismiss}
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontFamily: FONT,
                fontSize: 11,
                padding: '7px 8px',
              }}
            >
              No thanks
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
});

OnboardingPrompt.displayName = 'OnboardingPrompt';
