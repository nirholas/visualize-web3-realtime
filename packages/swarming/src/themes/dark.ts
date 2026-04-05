import type { ThemeConfig } from '../types';

/** Dark theme — deep navy background with vibrant glowing nodes */
export const dark: ThemeConfig = {
  background: '#0a0a1a',
  hubColors: [
    '#818cf8', // Indigo
    '#b6509e', // Purple
    '#00d395', // Green
    '#00b3ff', // Cyan
    '#2f6bff', // Royal blue
    '#ff6b35', // Orange
    '#e84393', // Pink
    '#00b88d', // Teal
  ],
  leafColor: '#555577',
  hubEdgeColor: '#333355',
  leafEdgeColor: '#222244',
  labelColor: '#e0e0ff',
  labelBackground: 'rgba(10, 10, 26, 0.85)',
  hubEmissive: 2.0,
  leafEmissive: 1.5,
  bloomIntensity: 1.2,
  bloomThreshold: 0.85,
};
