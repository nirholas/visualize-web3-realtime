'use client';

import { AnimatePresence, m } from 'framer-motion';

interface JourneyOverlayProps {
  description?: string;
  isVisible: boolean;
  label?: string;
  onSkip: () => void;
  title?: string;
}

export default function JourneyOverlay({
  description,
  isVisible,
  label,
  onSkip,
  title,
}: JourneyOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          style={{
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            inset: 0,
            justifyContent: 'center',
            pointerEvents: 'none',
            position: 'absolute',
            zIndex: 30,
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <m.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 12 }}
            key={`${label}-${title}`}
            style={{
              maxWidth: 760,
              padding: '0 20px',
              textAlign: 'center',
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {label ? (
              <div
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </div>
            ) : null}

            {title ? (
              <div
                style={{
                  color: '#ffffff',
                  fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 'clamp(28px, 4vw, 52px)',
                  fontWeight: 600,
                  lineHeight: 1.05,
                  marginBottom: 10,
                }}
              >
                {title}
              </div>
            ) : null}

            {description ? (
              <div
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 'clamp(13px, 1.2vw, 16px)',
                  lineHeight: 1.45,
                }}
              >
                {description}
              </div>
            ) : null}
          </m.div>

          <button
            onClick={onSkip}
            style={{
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 8,
              color: '#ffffff',
              cursor: 'pointer',
              fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
              letterSpacing: '0.04em',
              padding: '8px 14px',
              pointerEvents: 'auto',
              position: 'absolute',
              right: 16,
              textTransform: 'uppercase',
              top: 16,
            }}
            type="button"
          >
            Skip
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
