// ============================================================================
// @swarming/engine — Built-in themes
// ============================================================================

import type { SwarmingTheme, ThemeInput } from './types';

export const THEME_DARK: SwarmingTheme = {
  background: '#0a0a1a',
  hubColors: [
    '#6366f1', '#8b5cf6', '#a78bfa', '#818cf8',
    '#7c3aed', '#6d28d9', '#5b21b6', '#4f46e5',
  ],
  leafColor: '#555566',
  hubEdgeColor: 'rgba(120, 120, 180, 0.45)',
  leafEdgeColor: 'rgba(100, 100, 140, 0.3)',
  labelColor: '#e2e8f0',
  labelBackground: 'rgba(15, 15, 30, 0.85)',
  hubEmissive: 2.0,
  leafEmissive: 1.5,
  bloomIntensity: 1.2,
  bloomThreshold: 0.85,
};

export const THEME_LIGHT: SwarmingTheme = {
  background: '#ffffff',
  hubColors: [
    '#1a1a2e', '#16213e', '#0f3460', '#2c2c54',
    '#1b1b2f', '#3d3d6b', '#2a2d3e', '#1e3163',
  ],
  leafColor: '#555566',
  hubEdgeColor: 'rgba(80, 80, 120, 0.45)',
  leafEdgeColor: 'rgba(120, 120, 140, 0.3)',
  labelColor: '#1a1a2e',
  labelBackground: 'rgba(255, 255, 255, 0.85)',
  hubEmissive: 1.5,
  leafEmissive: 1.0,
  bloomIntensity: 0.8,
  bloomThreshold: 0.9,
};

/** Resolve a theme input to a full theme configuration */
export function resolveTheme(theme: ThemeInput | undefined): SwarmingTheme {
  if (!theme || theme === 'dark') return THEME_DARK;
  if (theme === 'light') return THEME_LIGHT;
  return theme;
}
