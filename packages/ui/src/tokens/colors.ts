// ============================================================================
// @web3viz/ui — Color Tokens
//
// All color values used across the design system. Each color has a CSS
// custom property name and a default value. Themes override these via
// CSS custom properties on a root element.
// ============================================================================

export const colors = {
  // Core
  bg: { var: '--w3v-bg', light: '#ffffff', dark: '#08080f' },
  fg: { var: '--w3v-fg', light: '#161616', dark: '#e8e8e8' },
  muted: { var: '--w3v-muted', light: '#666666', dark: '#9090b8' },
  border: { var: '--w3v-border', light: '#e8e8e8', dark: 'rgba(255,255,255,0.08)' },
  surface: { var: '--w3v-surface', light: '#f5f5f5', dark: 'rgba(255,255,255,0.04)' },
  accent: { var: '--w3v-accent', light: '#3d63ff', dark: '#7b8eea' },

  // Protocol / category colors
  launches: { var: '--w3v-launches', light: '#a78bfa', dark: '#a78bfa' },
  agentLaunches: { var: '--w3v-agent-launches', light: '#f472b6', dark: '#f472b6' },
  trades: { var: '--w3v-trades', light: '#60a5fa', dark: '#60a5fa' },
  claimsWallet: { var: '--w3v-claims-wallet', light: '#fbbf24', dark: '#fbbf24' },
  claimsGithub: { var: '--w3v-claims-github', light: '#34d399', dark: '#34d399' },
  claimsFirst: { var: '--w3v-claims-first', light: '#f87171', dark: '#f87171' },

  // Status / feedback
  success: { var: '--w3v-success', light: '#22c55e', dark: '#22c55e' },
  error: { var: '--w3v-error', light: '#ef4444', dark: '#ef4444' },
  warning: { var: '--w3v-warning', light: '#f59e0b', dark: '#f59e0b' },

  // Graph-specific
  hubColors: [
    '#1a1a2e', '#16213e', '#0f3460', '#2c2c54',
    '#1b1b2f', '#3d3d6b', '#2a2d3e', '#1e3163',
  ],
  graphAgent: '#555566',
  graphGround: { light: '#f8f8fa', dark: '#111118' },
  graphEdge: { light: 'rgba(0,0,0,0.25)', dark: 'rgba(255,255,255,0.15)' },
} as const;

/** Flat color palette for quick access (light theme defaults) */
export const palette = {
  white: '#ffffff',
  black: '#08080f',
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#e8e8e8',
  gray300: '#d0d0d0',
  gray400: '#999999',
  gray500: '#666666',
  gray600: '#444444',
  gray700: '#333333',
  gray800: '#1a1a1a',
  gray900: '#0a0a0a',

  purple400: '#a78bfa',
  pink400: '#f472b6',
  blue400: '#60a5fa',
  amber400: '#fbbf24',
  emerald400: '#34d399',
  red400: '#f87171',
  indigo500: '#3d63ff',
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
