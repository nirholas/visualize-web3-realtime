# @web3viz/core

Framework-agnostic core types, engine, and configuration. No React dependency.

## Structure

- `src/types/` — All shared type definitions (`Token`, `Trade`, `DataProviderEvent`, `GraphNode`, `GraphEdge`, agent types)
- `src/engine/` — Simulation engines:
  - `ForceGraphSimulation.ts` — D3-force-3d wrapper for graph layout
  - `SpatialHash.ts` — Spatial indexing for efficient node lookup
- `src/categories/` — Category definitions and color configs (`CATEGORIES`, `CATEGORY_CONFIGS`)
- `src/themes/` — Theme system (dark/light)
- `src/plugins/` and `src/plugin.ts` — Plugin API for extending data sources

## Usage

```ts
import { ForceGraphSimulation, CATEGORIES, type DataProviderEvent } from '@web3viz/core';
```

## Testing

```bash
npm test -- --run packages/core
```
