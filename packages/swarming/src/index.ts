// ============================================================================
// Swarming — Main entry point
//
// ESM: import { Swarming } from 'swarming'
// UMD: window.Swarming.create('#viz', { ... })
// ============================================================================

export { Swarming, type SwarmingOptions, type SwarmingInstance, type SwarmingNode, type SwarmingEdge, type StaticData } from './umd';
export { default as SwarmingRenderer, type SwarmingRendererProps } from './SwarmingRenderer';
