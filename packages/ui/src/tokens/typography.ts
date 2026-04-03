// ============================================================================
// @web3viz/ui — Typography Tokens
// ============================================================================

export const fontFamily = {
  mono: "'IBM Plex Mono', monospace",
  sans: "'Inter', system-ui, sans-serif",
} as const;

export const fontSize = {
  '2xs': '9px',
  xs: '10px',
  sm: '11px',
  base: '12px',
  md: '13px',
  lg: '14px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const lineHeight = {
  none: 1,
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.5,
  loose: 1.8,
} as const;

export const letterSpacing = {
  tight: '-0.02em',
  normal: '0',
  wide: '0.04em',
  wider: '0.06em',
  widest: '0.08em',
  label: '0.1em',
} as const;

/** Pre-composed text styles */
export const textStyles = {
  label: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize['2xs'],
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase' as const,
    letterSpacing: letterSpacing.widest,
  },
  caption: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.wide,
  },
  body: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.relaxed,
  },
  heading: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
  },
  stat: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    fontVariantNumeric: 'tabular-nums' as const,
    lineHeight: lineHeight.normal,
  },
} as const;
