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
            background: 'rgba(255, 255, 255, 0.7)',
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
                  color: '#999',
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
                  color: '#161616',
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
                  color: '#333',
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
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid #e8e8e8',
              borderRadius: 8,
              color: '#161616',
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
