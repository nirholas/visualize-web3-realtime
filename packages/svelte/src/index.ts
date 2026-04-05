// ============================================================================
// @swarming/svelte — Main Entry Point
//
// Usage (action):
//   import { swarming } from '@swarming/svelte'
//   <div use:swarming={{ source: 'wss://...', theme: 'dark' }} />
//
// Usage (programmatic):
//   import { mountSwarming } from '@swarming/svelte'
// ============================================================================

export { swarming, mountSwarming, type SwarmingActionConfig, type SwarmingMount } from './swarming';

// Re-export engine types for convenience
export type {
  SwarmingNode,
  SwarmingConfig,
  SwarmingInstance,
  SwarmingTheme,
  ThemeInput,
  PhysicsConfig,
} from '@swarming/engine';
