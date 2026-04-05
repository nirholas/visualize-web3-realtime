/**
 * Landing page layout, typography, and color constants.
 * Matches the app's visual identity (IBM Plex Mono, dark navy, glassmorphism).
 */

// ── Typography ──────────────────────────────────────────────────────────────

export const FONT_FAMILY = "'IBM Plex Mono', monospace"
export const BODY_FONT = `300 15px ${FONT_FAMILY}`
export const BODY_LINE_HEIGHT = 26
export const HEADLINE_FONT_FAMILY = FONT_FAMILY
export const PULLQUOTE_FONT = `500 12px ${FONT_FAMILY}`
export const PULLQUOTE_LINE_HEIGHT = 22
export const DROP_CAP_LINES = 3

// ── Colors ──────────────────────────────────────────────────────────────────

export const BG_COLOR = '#0a0a12'
export const TEXT_COLOR = '#c8c8d8'
export const HEADLINE_COLOR = '#e2e8f0'
export const DROP_CAP_COLOR = '#818cf8'
export const MUTED_COLOR = '#555570'
export const ACCENT_INDIGO = '#818cf8'

/** Orb colors drawn from the app's COLOR_PALETTE and CHAIN_COLORS */
export const ORB_COLORS = [
  { hex: '#818cf8', rgb: [129, 140, 248] as const },  // Indigo
  { hex: '#b6509e', rgb: [182, 80, 158] as const },   // Purple
  { hex: '#00d395', rgb: [0, 211, 149] as const },     // Green
  { hex: '#00b3ff', rgb: [0, 179, 255] as const },     // Cyan
  { hex: '#9945FF', rgb: [153, 69, 255] as const },    // Solana purple
] as const

// ── Layout ────────────────────────────────���─────────────────────────────────

export const GUTTER = 48
export const COL_GAP = 40
export const BOTTOM_GAP = 20
export const MIN_SLOT_WIDTH = 50
export const MAX_CONTENT_WIDTH = 1500

// ── Responsive ──────────────────────────────────────────────────────────────

export const NARROW_BREAKPOINT = 760
export const NARROW_GUTTER = 20
export const NARROW_COL_GAP = 20
export const NARROW_BOTTOM_GAP = 16
export const NARROW_ORB_SCALE = 0.58
export const NARROW_ACTIVE_ORBS = 3

// ── Glassmorphism tokens (mirrored from desktopConstants) ───────────────────

export const GLASS = {
  bg: 'rgba(18, 18, 30, 0.72)',
  bgSolid: 'rgba(18, 18, 30, 0.88)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  blur: 'blur(20px)',
  shadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
  radius: 12,
} as const
