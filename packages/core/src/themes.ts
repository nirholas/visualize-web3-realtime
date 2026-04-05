// ============================================================================
// Built-in themes
// ============================================================================

import type { ThemeConfig } from './plugin';

export const DARK_THEME: ThemeConfig = {
  background: '#0a0a12',
  foreground: '#e5e5e5',
  accent: '#4fc3f7',
  hubColors: ['#4fc3f7', '#f06292', '#81c784', '#ffb74d', '#ba68c8', '#4dd0e1'],
  agentColors: ['#90a4ae', '#a5d6a7', '#ef9a9a', '#ffe082', '#ce93d8', '#80deea'],
};

export const LIGHT_THEME: ThemeConfig = {
  background: '#f8f8fa',
  foreground: '#1a1a2e',
  accent: '#1976d2',
  hubColors: ['#1976d2', '#c62828', '#2e7d32', '#ef6c00', '#7b1fa2', '#00838f'],
  agentColors: ['#546e7a', '#388e3c', '#d32f2f', '#f9a825', '#8e24aa', '#0097a7'],
};

export const darkTheme = DARK_THEME;
export const lightTheme = LIGHT_THEME;
