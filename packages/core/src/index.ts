// ============================================================================
// @web3viz/core — Main entry point
//
// Re-exports everything from sub-modules for convenient access.
//
// Usage:
//   import { ForceGraphSimulation, CATEGORIES, type TopToken } from '@web3viz/core';
//
// Or use deep imports:
//   import { ForceGraphSimulation } from '@web3viz/core/engine';
//   import type { TopToken } from '@web3viz/core/types';
// ============================================================================

// Agent types
export type {
  AgentIdentity,
  AgentTaskStatus,
  AgentTask,
  ToolCallStatus,
  AgentToolCall,
  AgentEventType,
  AgentEvent,
  AgentFlowTrace,
  ExecutorStatus,
  ExecutorState,
  AgentGraphNodeType,
  AgentGraphNode,
} from './types/agent';

// Types
export type {
  BuiltInSource,
  Token,
  Trade,
  TopToken,
  TraderEdge,
  Claim,
  RawEvent,
  DataProviderEvent,
  GraphNode,
  GraphEdge,
  DataProviderStats,
  MergedStats,
  ShareColors,
  EmbedConfig,
  Vec3,
  CameraAnimationRequest,
  GraphHandle,
} from './types';

// Engine
export { ForceGraphSimulation, type ForceGraphConfig } from './engine/ForceGraphSimulation';
export { SpatialHash } from './engine/SpatialHash';

// Categories
export {
  CATEGORIES,
  CATEGORY_CONFIGS,
  CATEGORY_CONFIG_MAP,
  CATEGORY_BY_ID,
  SOURCE_CONFIGS,
  SOURCE_CONFIG_MAP,
  createCategory,
  createSource,
  getCategoriesForSource,
  mergeCategories,
  buildCategoryMap,
  type BuiltInCategory,
  type CategoryId,
  type CategoryConfig,
  type SourceConfig,
} from './categories';

// Providers
export {
  type DataProvider,
  type DataProviderOptions,
  type ConnectionState,
  registerProvider,
  getProvider,
  getAllProviders,
  getEnabledProviders,
  unregisterProvider,
  onRegistryChange,
  createProvider,
  type CreateProviderConfig,
} from './providers';
