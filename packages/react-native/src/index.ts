// ============================================================================
// @swarming/react-native — Public API
//
// React Native component for swarming force-directed graph visualization.
//
// Usage:
//   import { Swarming } from '@swarming/react-native'
//   <Swarming source="wss://my-data-stream" theme="midnight" style={{ flex: 1 }} />
// ============================================================================

export { Swarming } from './Swarming';
export { GestureHandler } from './GestureHandler';
export { GLRenderer } from './GLRenderer';
export { WebViewFallback } from './WebViewFallback';
export { THEME_COLORS, PERFORMANCE_CONFIGS } from './themes';

export type {
  SwarmingProps,
  SwarmingTheme,
  SwarmingNode,
  SwarmingEdge,
  StaticData,
  RendererBackend,
  PerformanceTier,
  NodeSelectEvent,
  ThemeColors,
  PerformanceConfig,
} from './types';
