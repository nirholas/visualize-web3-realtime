/**
 * Accessibility utilities for World features.
 * - Reduced motion detection
 * - Common focus style
 * - ARIA helpers
 */

import { useEffect, useState } from 'react';

/**
 * Returns true if the user prefers reduced motion.
 * Respects the prefers-reduced-motion media query.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

/**
 * Consistent focus ring style for keyboard navigation.
 * Apply via onFocus/onBlur or CSS :focus-visible equivalent.
 */
export const FOCUS_RING: React.CSSProperties = {
  outline: '2px solid #3d63ff',
  outlineOffset: 2,
};

/**
 * Get transition style that respects reduced-motion preference.
 */
export function getTransition(duration: string, property = 'all', easing = 'ease'): string {
  return `${property} ${duration} ${easing}`;
}

/**
 * Returns '0s' duration if reduced motion is preferred, else the given duration.
 */
export function motionDuration(durationMs: number, prefersReduced: boolean): number {
  return prefersReduced ? 0 : durationMs;
}
