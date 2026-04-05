// ============================================================================
// @swarming/vue — Main Entry Point
//
// Usage:
//   import { Swarming } from '@swarming/vue'
//
//   <Swarming :source="wsUrl" theme="dark" @node-click="handleClick" />
// ============================================================================

export { Swarming } from './Swarming';

// Re-export engine types for convenience
export type {
  SwarmingNode,
  SwarmingConfig,
  SwarmingInstance,
  SwarmingTheme,
  ThemeInput,
  PhysicsConfig,
} from '@swarming/engine';
