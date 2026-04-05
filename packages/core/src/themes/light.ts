// ============================================================================
// Built-in light theme
// ============================================================================

import { definePlugin } from '../plugin';
import type { ThemeConfig } from '../plugin';

export const LIGHT_THEME: ThemeConfig = {
  background: '#f8f9fa',
  nodeColors: [
    '#6366f1', '#a855f7', '#059669', '#0891b2',
    '#0284c7', '#2563eb', '#ea580c', '#db2777',
  ],
  edgeColor: 'rgba(100, 116, 139, 0.15)',
  agentColor: '#38bdf8',
  bloomStrength: 0.4,
  bloomRadius: 0.5,
  fontFamily: 'Inter, system-ui, sans-serif',
  chainColors: {
    solana: '#7C3AED',
    ethereum: '#4F5FD0',
    base: '#0042CC',
    cex: '#D97706',
    unknown: '#9CA3AF',
  },
  protocolColors: {
    default: '#6B7DB8',
    highlight: '#6366f1',
    agentDefault: '#38bdf8',
  },
};

export const lightTheme = definePlugin({
  name: 'swarming-theme-light',
  type: 'theme',
  meta: {
    description: 'Light theme for swarming visualizations',
    author: 'swarming',
    icon: '☀️',
    tags: ['theme', 'light'],
  },
  theme: LIGHT_THEME,
});
