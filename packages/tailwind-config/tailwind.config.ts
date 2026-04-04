import type { Config } from 'tailwindcss';

const config: Omit<Config, 'content'> = {
  theme: {
    extend: {
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Core brand — dark-first defaults
        'w3v-bg': 'var(--w3v-bg, #0a0a12)',
        'w3v-fg': 'var(--w3v-fg, #d8d8e8)',
        'w3v-muted': 'var(--w3v-muted, #8888a8)',
        'w3v-border': 'var(--w3v-border, rgba(140,140,200,0.1))',
        'w3v-surface': 'var(--w3v-surface, rgba(140,140,200,0.05))',
        'w3v-accent': 'var(--w3v-accent, #818cf8)',

        // Category / protocol colors
        'w3v-launches': 'var(--w3v-launches, #a78bfa)',
        'w3v-agent-launches': 'var(--w3v-agent-launches, #f472b6)',
        'w3v-trades': 'var(--w3v-trades, #60a5fa)',
        'w3v-claims-wallet': 'var(--w3v-claims-wallet, #fbbf24)',
        'w3v-claims-github': 'var(--w3v-claims-github, #34d399)',
        'w3v-claims-first': 'var(--w3v-claims-first, #f87171)',

        // Status
        'w3v-success': 'var(--w3v-success, #22c55e)',
        'w3v-error': 'var(--w3v-error, #ef4444)',
        'w3v-warning': 'var(--w3v-warning, #f59e0b)',
      },
      borderRadius: {
        'w3v-sm': '4px',
        'w3v-md': '6px',
        'w3v-lg': '8px',
        'w3v-xl': '12px',
        'w3v-full': '9999px',
      },
      boxShadow: {
        'w3v-sm': '0 1px 3px rgba(0,0,0,0.08)',
        'w3v-md': '0 2px 8px rgba(0,0,0,0.1)',
        'w3v-lg': '0 4px 16px rgba(0,0,0,0.12)',
        'w3v-xl': '0 8px 32px rgba(0,0,0,0.15)',
      },
      animation: {
        'w3v-pulse': 'w3v-pulse 2s ease-in-out infinite',
        'w3v-spin': 'w3v-spin 1s linear infinite',
        'w3v-slide-in': 'w3v-slide-in 0.25s ease-out',
        'w3v-fade-in': 'w3v-fade-in 0.2s ease-out',
      },
      keyframes: {
        'w3v-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'w3v-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'w3v-slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'w3v-fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
