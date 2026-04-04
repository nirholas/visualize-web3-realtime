// ============================================================================
// @web3viz/ui — Color Tokens
//
// All color values used across the design system. Each color has a CSS
// custom property name and a default value. Themes override these via
// CSS custom properties on a root element.
// ============================================================================

export const colors = {
  // Core — optimized contrast ratios for reduced eye strain
  // Dark bg uses subtle blue-purple undertone to complement accent palette
  // Text uses off-white (#d8d8e8) to avoid halation against near-black
  bg: { var: '--w3v-bg', light: '#fafafa', dark: '#0a0a12' },
  fg: { var: '--w3v-fg', light: '#1a1a2e', dark: '#d8d8e8' },
  muted: { var: '--w3v-muted', light: '#5a5a72', dark: '#8888a8' },
  border: { var: '--w3v-border', light: '#e2e2ea', dark: 'rgba(140,140,200,0.1)' },
  surface: { var: '--w3v-surface', light: '#f0f0f6', dark: 'rgba(140,140,200,0.05)' },
  accent: { var: '--w3v-accent', light: '#4f46e5', dark: '#818cf8' },

  // Protocol / category colors — tuned per mode for optimal vibrancy
  // Dark mode: slightly desaturated to glow without searing
  // Light mode: deeper saturation for readability on bright backgrounds
  launches: { var: '--w3v-launches', light: '#8b5cf6', dark: '#a78bfa' },
  agentLaunches: { var: '--w3v-agent-launches', light: '#db2777', dark: '#f472b6' },
  trades: { var: '--w3v-trades', light: '#3b82f6', dark: '#60a5fa' },
  claimsWallet: { var: '--w3v-claims-wallet', light: '#d97706', dark: '#fbbf24' },
  claimsGithub: { var: '--w3v-claims-github', light: '#059669', dark: '#34d399' },
  claimsFirst: { var: '--w3v-claims-first', light: '#dc2626', dark: '#f87171' },

  // Status / feedback — adjusted per mode
  success: { var: '--w3v-success', light: '#16a34a', dark: '#22c55e' },
  error: { var: '--w3v-error', light: '#dc2626', dark: '#ef4444' },
  warning: { var: '--w3v-warning', light: '#d97706', dark: '#f59e0b' },

  // Graph-specific — richer hub colors with purple undertones
  hubColors: [
    '#12122a', '#141430', '#0e2a52', '#242448',
    '#161628', '#2e2e58', '#222336', '#1a2850',
  ],
  graphAgent: '#4a4a62',
  graphGround: { light: '#f4f4fa', dark: '#0e0e18' },
  graphEdge: { light: 'rgba(20,20,60,0.2)', dark: 'rgba(140,140,220,0.12)' },
} as const;

/** Flat color palette for quick access */
export const palette = {
  white: '#fafafa',
  black: '#0a0a12',
  gray50: '#f6f6fa',
  gray100: '#f0f0f6',
  gray200: '#e2e2ea',
  gray300: '#c8c8d4',
  gray400: '#8888a8',
  gray500: '#5a5a72',
  gray600: '#3a3a50',
  gray700: '#2a2a3e',
  gray800: '#1a1a2e',
  gray900: '#0e0e18',

  purple400: '#a78bfa',
  pink400: '#f472b6',
  blue400: '#60a5fa',
  amber400: '#fbbf24',
  emerald400: '#34d399',
  red400: '#f87171',
  indigo500: '#4f46e5',
  green500: '#22c55e',
} as const;

/** Color swatches for share panel customization */
export const swatches = {
  background: [
    '#ffffff', '#3a3a3a', '#768bea', '#84bbdc',
    '#87c47d', '#d18949', '#cc6b57', '#7e61ee',
  ],
  protocol: [
    '#ffffff', '#d2d2d2', '#7b8eea', '#86bcdc',
    '#89c57f', '#d18b4e', '#ce715f', '#8165ee',
  ],
  user: [
    '#ffffff', '#d2d2d2', '#7b8eea', '#86bcdc',
    '#89c57f', '#d18b4e', '#ce715f', '#8165ee',
  ],
  remix: {
    backgrounds: [
      '#ffffff', '#08080f', '#1a1a2e', '#0f3460', '#16213e',
      '#3a3a3a', '#768bea', '#84bbdc', '#87c47d', '#d18949',
      '#cc6b57', '#7e61ee', '#e2e2e2', '#fdf6e3', '#282a36',
    ],
    accents: [
      '#7b8eea', '#86bcdc', '#89c57f', '#d18b4e', '#ce715f',
      '#8165ee', '#e06c75', '#56b6c2', '#c678dd', '#98c379',
      '#d19a66', '#61afef', '#e5c07b', '#ff79c6', '#50fa7b',
    ],
  },
} as const;
