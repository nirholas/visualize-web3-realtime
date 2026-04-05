// ============================================================================
// Built-in dark theme — default for swarming
// ============================================================================

import { definePlugin } from '../plugin';
import type { ThemeConfig } from '../plugin';

export const DARK_THEME: ThemeConfig = {
  background: '#0a0a0f',
  nodeColors: [
    '#818cf8', '#b6509e', '#00d395', '#00b88d',
    '#00b3ff', '#2f6bff', '#ff6b35', '#e84393',
  ],
  edgeColor: 'rgba(129, 140, 248, 0.12)',
  agentColor: '#7dd3fc',
  bloomStrength: 1.2,
  bloomRadius: 0.75,
  fontFamily: 'Inter, system-ui, sans-serif',
  chainColors: {
    solana: '#9945FF',
    ethereum: '#627EEA',
    base: '#0052FF',
    cex: '#FFB300',
    unknown: '#666666',
  },
  protocolColors: {
    default: '#a0c4ff',
    highlight: '#818cf8',
    agentDefault: '#7dd3fc',
  },
};

export const darkTheme = definePlugin({
  name: 'swarming-theme-dark',
  type: 'theme',
  meta: {
    description: 'Default dark theme for swarming visualizations',
    author: 'swarming',
    icon: '🌙',
    tags: ['theme', 'dark', 'default'],
  },
  theme: DARK_THEME,
});
