import type { ThemeConfig } from '../types';

/** Light theme — clean white background with rich saturated nodes */
export const light: ThemeConfig = {
  background: '#ffffff',
  hubColors: [
    '#4f46e5', // Indigo
    '#9333ea', // Purple
    '#059669', // Emerald
    '#0284c7', // Sky
    '#2563eb', // Blue
    '#ea580c', // Orange
    '#db2777', // Pink
    '#0d9488', // Teal
  ],
  leafColor: '#94a3b8',
  hubEdgeColor: '#cbd5e1',
  leafEdgeColor: '#e2e8f0',
  labelColor: '#1e293b',
  labelBackground: 'rgba(255, 255, 255, 0.9)',
  hubEmissive: 0.8,
  leafEmissive: 0.4,
  bloomIntensity: 0.4,
  bloomThreshold: 0.95,
};
