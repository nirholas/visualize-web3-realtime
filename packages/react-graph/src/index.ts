// ============================================================================
// @web3viz/react-graph — Main Entry Point
//
// React Three Fiber force-directed graph visualization.
//
// Usage:
//   import ForceGraph from '@web3viz/react-graph';
//
//   <ForceGraph topTokens={tokens} traderEdges={edges} />
// ============================================================================

export { default as ForceGraph, type ForceGraphProps } from './ForceGraph';
export { default as PostProcessing, type PostProcessingProps } from './PostProcessing';
export type { GraphHandle } from '@web3viz/core';

// Plugin system React integration
export {
  SwarmingProvider,
  useSwarming,
  useSwarmingTheme,
  useSwarmingProviders,
  usePluginManager,
  type SwarmingProviderProps,
} from './SwarmingProvider';

// Renderer infrastructure
export {
  detectRenderer,
  getRendererSync,
  type RendererType,
  type RendererCapabilities,
} from './renderers/auto-detect';
export { WebGPUForceEngine, type GPUNodeData, type GPUEdgeData } from './renderers/webgpu';
export { configureWebGLRenderer } from './renderers/webgl';
export { useWebGPUSimulation } from './renderers/useWebGPUSimulation';
