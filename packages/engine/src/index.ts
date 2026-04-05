// ============================================================================
// @swarming/engine — Main Entry Point
//
// Framework-agnostic swarming visualization engine.
//
// Usage (Vanilla JS):
//   import { createSwarming } from '@swarming/engine'
//   const viz = createSwarming('#container', { source: 'wss://...' })
//
// Usage (Framework adapters):
//   Adapters import ForceSimulation + ThreeRenderer directly.
// ============================================================================

// Main factory
export { createSwarming } from './SwarmingEngine';

// Physics simulation (for framework adapters)
export { ForceSimulation } from './physics/ForceSimulation';

// Three.js renderer (for framework adapters)
export { ThreeRenderer, type RendererConfig } from './renderers/ThreeRenderer';

// Themes
export { resolveTheme, THEME_DARK, THEME_LIGHT } from './themes';

// Types
export type {
  SwarmingNode,
  SimNode,
  SimEdge,
  SwarmingConfig,
  SwarmingInstance,
  SwarmingEventType,
  SwarmingEventMap,
  SwarmingTheme,
  ThemeInput,
  PhysicsConfig,
  SwarmingSimulation,
  GroupData,
  LeafEdge,
} from './types';
