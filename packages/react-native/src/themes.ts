// ============================================================================
// @swarming/react-native — Theme Definitions
// ============================================================================

import type { SwarmingTheme, ThemeColors, PerformanceTier, PerformanceConfig } from './types';

export const THEME_COLORS: Record<SwarmingTheme, ThemeColors> = {
  dark: {
    background: '#0a0a12',
    groundColor: '#0e0e18',
    nodeColor: '#6366f1',
    edgeColor: 'rgba(99, 102, 241, 0.3)',
    labelColor: '#e2e8f0',
    hubGlow: '#818cf8',
  },
  light: {
    background: '#f8fafc',
    groundColor: '#f4f4fa',
    nodeColor: '#4f46e5',
    edgeColor: 'rgba(79, 70, 229, 0.3)',
    labelColor: '#1e293b',
    hubGlow: '#6366f1',
  },
  midnight: {
    background: '#020617',
    groundColor: '#0f172a',
    nodeColor: '#8b5cf6',
    edgeColor: 'rgba(139, 92, 246, 0.3)',
    labelColor: '#c4b5fd',
    hubGlow: '#a78bfa',
  },
};

export const PERFORMANCE_CONFIGS: Record<PerformanceTier, PerformanceConfig> = {
  low: {
    targetFps: 20,
    maxNodes: 500,
    bloomEnabled: false,
    shadowsEnabled: false,
    labelDensity: 0.3,
  },
  medium: {
    targetFps: 30,
    maxNodes: 2000,
    bloomEnabled: true,
    shadowsEnabled: false,
    labelDensity: 0.6,
  },
  high: {
    targetFps: 60,
    maxNodes: 5000,
    bloomEnabled: true,
    shadowsEnabled: true,
    labelDensity: 1.0,
  },
};
