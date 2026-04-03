# @web3viz/core - Main Entry Point

## File Path

```
packages/core/src/index.ts
```

## Purpose

This file serves as the **barrel export** (public API surface) for the `@web3viz/core` package. It re-exports all types, classes, functions, and constants from the package's sub-modules, enabling consumers to import everything from a single entry point.

Consumers can use either the top-level import or deep imports:

```ts
// Top-level (convenient)
import { ForceGraphSimulation, CATEGORIES, type TopToken } from '@web3viz/core';

// Deep imports (tree-shakeable)
import { ForceGraphSimulation } from '@web3viz/core/engine';
import type { TopToken } from '@web3viz/core/types';
```

---

## Module Dependencies

This file imports from four internal sub-modules:

| Import Source | What is Imported |
|---|---|
| `./types/agent` | Agent-related type definitions |
| `./types` | Core domain type definitions |
| `./engine/ForceGraphSimulation` | Force-directed graph simulation class and config type |
| `./engine/SpatialHash` | 3D spatial indexing class |
| `./categories` | Category/source constants, configs, types, and helper functions |
| `./providers` | Data provider interface, registry functions, and factory |

---

## Exported Members

### Agent Types (from `./types/agent`)

All exported as **type-only** exports (erased at compile time, no runtime footprint).

| Export | Kind | Description |
|---|---|---|
| `AgentIdentity` | `interface` | Identity descriptor for an AI agent (ID, name, role, address) |
| `AgentTaskStatus` | `type` | Union of task lifecycle states: `'queued' \| 'planning' \| 'in-progress' \| 'waiting' \| 'completed' \| 'failed' \| 'cancelled'` |
| `AgentTask` | `interface` | A discrete task assigned to an agent |
| `ToolCallStatus` | `type` | Union of tool call states: `'started' \| 'streaming' \| 'completed' \| 'failed'` |
| `AgentToolCall` | `interface` | A single tool invocation made by an agent |
| `AgentEventType` | `type` | Union of all possible agent event type strings |
| `AgentEvent` | `interface` | A single event emitted by an agent over WebSocket |
| `AgentFlowTrace` | `interface` | Aggregated view of an agent's full activity trace |
| `ExecutorStatus` | `type` | Union of executor states: `'running' \| 'paused' \| 'stopped' \| 'error'` |
| `ExecutorState` | `interface` | State of the 24/7 autonomous executor |
| `AgentGraphNodeType` | `type` | Node types for agent visualization graphs |
| `AgentGraphNode` | `interface` | Extended graph node for agent-specific rendering |

### Core Types (from `./types`)

All exported as **type-only** exports.

| Export | Kind | Description |
|---|---|---|
| `BuiltInSource` | `type` | Union of built-in source IDs: `'pumpfun' \| 'ethereum' \| 'base' \| 'agents' \| 'erc8004' \| 'cex'` |
| `Token` | `interface` | An on-chain token entity |
| `Trade` | `interface` | An on-chain trade event |
| `TopToken` | `interface` | A token ranked by activity, used as a hub node |
| `TraderEdge` | `interface` | An edge between a participant and a hub |
| `Claim` | `interface` | A claim event (fee claims, social claims) |
| `RawEvent` | `type` | Discriminated union of raw event payloads |
| `DataProviderEvent` | `interface` | Unified, categorized event emitted by providers |
| `GraphNode` | `interface` | A node in the force-directed graph |
| `GraphEdge` | `interface` | An edge in the force-directed graph |
| `DataProviderStats` | `interface` | Aggregate stats from a single provider |
| `MergedStats` | `interface` | Combined stats from all active providers |
| `ShareColors` | `interface` | Colors for share/screenshot customization |
| `EmbedConfig` | `interface` | Embed widget configuration |
| `Vec3` | `type` | 3-element number tuple `[x, y, z]` |
| `CameraAnimationRequest` | `interface` | Request to animate the 3D camera |
| `GraphHandle` | `interface` | Imperative API exposed by graph renderers |

### Engine (from `./engine/ForceGraphSimulation` and `./engine/SpatialHash`)

| Export | Kind | Description |
|---|---|---|
| `ForceGraphSimulation` | `class` | Pure d3-force simulation manager (value export) |
| `ForceGraphConfig` | `interface` | Configuration options for the simulation (type export) |
| `SpatialHash` | `class` | 3D spatial hash grid for proximity queries (value export) |

### Categories (from `./categories`)

| Export | Kind | Description |
|---|---|---|
| `CATEGORIES` | `const` (readonly tuple) | Array of all built-in category ID strings |
| `CATEGORY_CONFIGS` | `const` (array) | Array of `CategoryConfig` objects with label, icon, color, sourceId |
| `CATEGORY_CONFIG_MAP` | `const` (record) | Lookup map keyed by `"sourceId:categoryId"` |
| `CATEGORY_BY_ID` | `const` (record) | Lookup map keyed by category ID only (first match wins) |
| `SOURCE_CONFIGS` | `const` (array) | Array of `SourceConfig` objects for built-in data sources |
| `SOURCE_CONFIG_MAP` | `const` (record) | Lookup map of source configs keyed by source ID |
| `createCategory` | `function` | Factory helper to create a custom `CategoryConfig` |
| `createSource` | `function` | Factory helper to create a custom `SourceConfig` |
| `getCategoriesForSource` | `function` | Filter categories by source ID |
| `mergeCategories` | `function` | Merge custom categories with defaults (upsert semantics) |
| `buildCategoryMap` | `function` | Build a `Record<string, CategoryConfig>` from an array |
| `BuiltInCategory` | `type` | Union of all built-in category ID literal strings |
| `CategoryId` | `type` | `BuiltInCategory` extended with arbitrary `string` |
| `CategoryConfig` | `interface` | Configuration for a single event category |
| `SourceConfig` | `interface` | Configuration for a data source/provider |

### Providers (from `./providers`)

| Export | Kind | Description |
|---|---|---|
| `DataProvider` | `interface` | Abstract interface all data providers must implement (type export) |
| `DataProviderOptions` | `interface` | Options for provider initialization (type export) |
| `ConnectionState` | `interface` | Connection status descriptor (type export) |
| `registerProvider` | `function` | Add a provider to the global registry |
| `getProvider` | `function` | Look up a registered provider by ID |
| `getAllProviders` | `function` | Get all registered providers |
| `getEnabledProviders` | `function` | Get only enabled providers |
| `unregisterProvider` | `function` | Remove a provider from the registry |
| `onRegistryChange` | `function` | Subscribe to registry mutations |
| `createProvider` | `function` | Factory helper to create a `DataProvider` from a config object |
| `CreateProviderConfig` | `interface` | Configuration for the `createProvider` factory (type export) |

---

## Line-by-Line Documentation

| Lines | Description |
|---|---|
| 1-12 | Module header comment block documenting the package name, purpose, and usage examples for both barrel and deep imports. |
| 14-28 | **Agent type re-exports.** Type-only re-export of 12 agent-related types from `./types/agent`. These cover agent identity, task lifecycle, tool calls, events, flow traces, executor state, and agent-specific graph node types. |
| 30-49 | **Core type re-exports.** Type-only re-export of 16 domain types from `./types`. These cover source identification, token/trade models, events, graph structures, stats, theming, and camera/3D types. |
| 51-53 | **Engine re-exports.** Value export of `ForceGraphSimulation` class and type export of `ForceGraphConfig` from `./engine/ForceGraphSimulation`. Value export of `SpatialHash` from `./engine/SpatialHash`. |
| 55-72 | **Category re-exports.** Mixed value and type exports from `./categories`. Includes constant arrays (`CATEGORIES`, `CATEGORY_CONFIGS`, `SOURCE_CONFIGS`), lookup maps (`CATEGORY_CONFIG_MAP`, `CATEGORY_BY_ID`, `SOURCE_CONFIG_MAP`), helper functions (`createCategory`, `createSource`, `getCategoriesForSource`, `mergeCategories`, `buildCategoryMap`), and types (`BuiltInCategory`, `CategoryId`, `CategoryConfig`, `SourceConfig`). |
| 74-87 | **Provider re-exports.** Mixed value and type exports from `./providers`. Includes the `DataProvider` interface, configuration interfaces, five registry management functions, and the `createProvider` factory. |

---

## Usage Example

```ts
import {
  ForceGraphSimulation,
  SpatialHash,
  CATEGORIES,
  CATEGORY_CONFIGS,
  registerProvider,
  createProvider,
  type TopToken,
  type DataProviderEvent,
  type AgentEvent,
} from '@web3viz/core';

// Create a simulation
const sim = new ForceGraphSimulation({ maxAgentNodes: 2000 });

// Create a spatial hash for proximity queries
const hash = new SpatialHash(10);

// Register a custom provider
const provider = createProvider({
  id: 'mychain',
  name: 'My Chain',
  sourceConfig: { id: 'mychain', label: 'My Chain', color: '#ff0', icon: 'M' },
  categories: [],
  connect: () => {},
  disconnect: () => {},
  getStats: () => ({ counts: {}, totalTransactions: 0, totalAgents: 0, recentEvents: [], topTokens: [], traderEdges: [], rawEvents: [] }),
  getConnections: () => [],
});
registerProvider(provider);
```
