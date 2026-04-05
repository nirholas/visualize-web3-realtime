// ============================================================================
// swarming — Main entry point
//
// 3D force-directed graph visualization for React.
// From npm install to a working graph in 3 lines of JSX.
//
// ESM: import { Swarming } from 'swarming'
// UMD: window.Swarming.create('#viz', { ... })
// ============================================================================

// --- React component (primary API) ---
export { Swarming } from './Swarming';

// --- Headless hook ---
export { useSwarmingEngine, type UseSwarmingEngineOptions, type SwarmingEngineState } from './hooks/useSwarmingEngine';

// --- UMD / imperative API ---
export {
  Swarming as SwarmingFactory,
  type SwarmingOptions,
  type SwarmingInstance,
  type SwarmingNode as SwarmingUmdNode,
  type SwarmingEdge,
  type StaticData,
} from './umd';

// --- Standalone renderer ---
export {
  default as SwarmingRenderer,
  type SwarmingRendererProps,
} from './SwarmingRenderer';

// --- Types ---
export type {
  SwarmingConfig,
  SwarmingHandle,
  SwarmingNode,
  SimNode,
  SimEdge,
  ThemeConfig,
  DataProvider,
  EmitFn,
} from './types';

// --- Physics engine ---
export { SwarmingSimulation, type PhysicsConfig } from './core/physics';

// --- Data providers ---
export { WebSocketProvider } from './providers/WebSocketProvider';
export { StaticProvider } from './providers/StaticProvider';

// --- Defaults & utilities ---
export { defaultMapEvent, DEFAULT_CAMERA, type CameraConfig } from './defaults';
