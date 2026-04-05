// ============================================================================
// @swarming/react — Main Entry Point
//
// Usage:
//   import { Swarming } from '@swarming/react'
//   <Swarming source="wss://..." theme="dark" />
// ============================================================================

export { Swarming, type SwarmingProps, type SwarmingHandle } from './Swarming';

// Re-export engine types for convenience
export type {
  SwarmingNode,
  SwarmingConfig,
  SwarmingInstance,
  SwarmingTheme,
  ThemeInput,
  PhysicsConfig,
} from '@swarming/engine';
