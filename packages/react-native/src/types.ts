// ============================================================================
// @swarming/react-native — Types
// ============================================================================

import type { TopToken, TraderEdge, ForceGraphConfig } from '@web3viz/core';
import type { ViewStyle } from 'react-native';

/** Built-in color themes */
export type SwarmingTheme = 'dark' | 'light' | 'midnight';

/** Performance tier — controls rendering quality vs battery usage */
export type PerformanceTier = 'low' | 'medium' | 'high';

/** Node data for static graphs */
export interface SwarmingNode {
  id: string;
  label: string;
  group?: string;
  radius?: number;
  color?: string;
}

/** Edge data for static graphs */
export interface SwarmingEdge {
  source: string;
  target: string;
  label?: string;
}

/** Static data passed directly (alternative to WebSocket source) */
export interface StaticData {
  nodes: SwarmingNode[];
  edges?: SwarmingEdge[];
}

/** Renderer backend selection */
export type RendererBackend = 'webview' | 'gl';

/** Event emitted when a node is tapped */
export interface NodeSelectEvent {
  node: TopToken;
  index: number;
}

/** Props for the main Swarming component */
export interface SwarmingProps {
  /** WebSocket URL for real-time data */
  source?: string;
  /** Static data (nodes and edges) — alternative to source */
  data?: StaticData;
  /** Color theme (default: 'dark') */
  theme?: SwarmingTheme;
  /** Maximum number of nodes to render */
  maxNodes?: number;
  /** Force simulation config overrides */
  simulationConfig?: Partial<ForceGraphConfig>;
  /** React Native view style */
  style?: ViewStyle;
  /** Renderer backend: 'webview' (default, broad compat) or 'gl' (native GPU) */
  renderer?: RendererBackend;
  /** Performance tier — adjusts FPS target and quality (default: 'medium') */
  performance?: PerformanceTier;
  /** Enable haptic feedback on node selection (requires expo-haptics) */
  haptics?: boolean;
  /** Reduce rendering when battery is low (requires expo-battery) */
  batteryAware?: boolean;
  /** Show last cached visualization when disconnected */
  offlineCache?: boolean;
  /** Callback when a node is tapped */
  onNodeSelect?: (event: NodeSelectEvent) => void;
  /** Callback when the graph is ready */
  onReady?: () => void;
  /** Callback on connection state change */
  onConnectionChange?: (connected: boolean) => void;
  /** Pre-computed topTokens (for external data management) */
  topTokens?: TopToken[];
  /** Pre-computed traderEdges (for external data management) */
  traderEdges?: TraderEdge[];
}

/** Theme color config passed to renderers */
export interface ThemeColors {
  background: string;
  groundColor: string;
  nodeColor: string;
  edgeColor: string;
  labelColor: string;
  hubGlow: string;
}

/** Performance config derived from tier */
export interface PerformanceConfig {
  targetFps: number;
  maxNodes: number;
  bloomEnabled: boolean;
  shadowsEnabled: boolean;
  labelDensity: number;
}
