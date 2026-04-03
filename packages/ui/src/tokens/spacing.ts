// ============================================================================
// @web3viz/ui — Spacing & Layout Tokens
// ============================================================================

export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
} as const;

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 2px 8px rgba(0,0,0,0.1)',
  lg: '0 4px 16px rgba(0,0,0,0.12)',
  xl: '0 8px 32px rgba(0,0,0,0.15)',
  glow: (color: string, alpha = 0.4) => `0 2px 12px ${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`,
} as const;

export const zIndex = {
  base: 0,
  dropdown: 10,
  overlay: 20,
  modal: 30,
  toast: 40,
  panel: 50,
  max: 100,
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1200px',
} as const;

export const transitions = {
  fast: '0.15s ease',
  normal: '0.25s ease-out',
  slow: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;
