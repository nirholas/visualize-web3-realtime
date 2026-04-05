'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { GLASS, TASKBAR_HEIGHT } from '../desktop/desktopConstants';
import type { OnboardingStep } from './useOnboarding';

interface OnboardingCoachMarkProps {
  step: OnboardingStep | null;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

const FONT = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * Compute position for the tooltip based on the target element.
 * Returns inline styles for the tooltip container.
 */
function useAnchorPosition(step: OnboardingStep | null): React.CSSProperties {
  const [pos, setPos] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!step) return;

    // Special targets that don't use querySelector
    if (step.target === 'graph') {
      setPos({
        position: 'fixed',
        top: '38%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    if (step.target === 'taskbar') {
      setPos({
        position: 'fixed',
        bottom: TASKBAR_HEIGHT + 20,
        left: '50%',
        transform: 'translateX(-50%)',
      });
      return;
    }

    // Try to find element by CSS selector
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) {
      // Fallback to center
      setPos({
        position: 'fixed',
        top: '38%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const margin = 16;

    switch (step.arrow) {
      case 'bottom':
        // Tooltip appears above the element
        setPos({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + margin,
          left: Math.max(16, Math.min(rect.left + rect.width / 2, window.innerWidth - 200)),
          transform: 'translateX(-50%)',
        });
        break;
      case 'top':
        setPos({
          position: 'fixed',
          top: rect.bottom + margin,
          left: Math.max(16, Math.min(rect.left + rect.width / 2, window.innerWidth - 200)),
          transform: 'translateX(-50%)',
        });
        break;
      case 'left':
        setPos({
          position: 'fixed',
          top: rect.top + rect.height / 2,
          left: rect.right + margin,
          transform: 'translateY(-50%)',
        });
        break;
      case 'right':
        setPos({
          position: 'fixed',
          top: rect.top + rect.height / 2,
          right: window.innerWidth - rect.left + margin,
          transform: 'translateY(-50%)',
        });
        break;
      default:
        setPos({
          position: 'fixed',
          top: '38%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        });
    }
  }, [step]);

  return pos;
}

export const OnboardingCoachMark = memo<OnboardingCoachMarkProps>(({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onSkip,
}) => {
  const anchorStyle = useAnchorPosition(step);
  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <AnimatePresence>
      {step && (
        <>
          {/* Dim overlay */}
          <m.div
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              zIndex: 9600,
              pointerEvents: 'auto',
            }}
            transition={{ duration: 0.25 }}
            onClick={onSkip}
          />

          {/* Tooltip */}
          <m.div
            key={step.id}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            style={{
              ...anchorStyle,
              width: 340,
              maxWidth: 'calc(100vw - 32px)',
              background: GLASS.bgSolid,
              backdropFilter: GLASS.blur,
              WebkitBackdropFilter: GLASS.blur,
              border: GLASS.border,
              borderRadius: GLASS.radius,
              boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5)',
              padding: 20,
              zIndex: 9700,
              fontFamily: FONT,
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Step counter */}
            <div style={{
              fontSize: 10,
              color: '#64748b',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              {stepIndex + 1} of {totalSteps}
            </div>

            {/* Title */}
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#e2e8f0',
              marginBottom: 8,
              lineHeight: 1.3,
            }}>
              {step.title}
            </div>

            {/* Description */}
            <div style={{
              fontSize: 12,
              color: '#94a3b8',
              lineHeight: 1.6,
              marginBottom: 18,
            }}>
              {step.description}
            </div>

            {/* Arrow indicator for bottom-pointing steps */}
            {step.arrow === 'bottom' && (
              <div style={{
                position: 'absolute',
                bottom: -6,
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: 12,
                height: 12,
                background: GLASS.bgSolid,
                borderRight: GLASS.border,
                borderBottom: GLASS.border,
              }} />
            )}

            {/* Buttons */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}>
              <button
                onClick={onSkip}
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  fontSize: 11,
                  padding: '6px 0',
                  letterSpacing: '0.02em',
                }}
              >
                Skip tour
              </button>

              <button
                onClick={onNext}
                type="button"
                style={{
                  background: 'rgba(99, 102, 241, 0.8)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  borderRadius: 8,
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  padding: '8px 18px',
                }}
              >
                {isLastStep ? 'Done' : 'Next'}
              </button>
            </div>

            {/* Progress dots */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 5,
              marginTop: 14,
            }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === stepIndex ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === stepIndex
                      ? 'rgba(99, 102, 241, 0.9)'
                      : i < stepIndex
                        ? 'rgba(99, 102, 241, 0.4)'
                        : 'rgba(255, 255, 255, 0.12)',
                    transition: 'all 250ms ease',
                  }}
                />
              ))}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
});

OnboardingCoachMark.displayName = 'OnboardingCoachMark';
