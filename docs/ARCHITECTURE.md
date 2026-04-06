# Architecture

This document provides a deep dive into the architecture of the Real-time Web3 + AI Agent Visualization platform. It explains how the system is designed, how data flows through it, and the rationale behind the architectural decisions.

The project is a monorepo built with **npm workspaces** and **Turborepo**, promoting code reuse, separation of concerns, and a streamlined development experience. The architecture is designed to be modular, scalable, and extensible, allowing for the easy addition of new data sources, visualizations, and features.

---

## System Overview

The following diagram illustrates the high-level architecture of the application:

```
┌───────────────────────────────────────────────────────────┐
│                     Browser / Client                      │
│                                                           │
│  ┌──────────────────┐   ┌─────────────┐   ┌─────────────┐ │
│  │   Data Source    │   │  Data Provider  │   │  Provider   │ │
│  │ (WebSocket/REST) │───▶│   Instance    │───▶│  Registry │ │
│  └──────────────────┘   └─────────────┘   └─────────────┘ │
│                              │                            │
│                       ┌──────▼──────┐                     │
│                       │ useProviders │ (React Hook)         │
│                       │  - Buffers   │                     │
│                       │  - Merges    │                     │
│                       │  - Filters   │                     │
│                       └──────┬──────┘                     │
│                              │                            │
│                ┌─────────────┼─────────────┐              │
│                ▼             ▼             ▼              │
│        ┌───────────┐ ┌───────────┐ ┌────────────┐       │
│        │ ForceGraph│ │  StatsBar │ │  LiveFeed  │       │
│        │   (3D)    │ │   (HUD)   │ │  (Events)  │       │
│        └───────────┘ └───────────┘ └────────────┘       │
└───────────────────────────────────────────────────────────┘
```

---

## Layer Breakdown

The application is divided into several distinct layers, each with a specific responsibility.

### 1. Core Layer (`@web3viz/core`)

This is the foundational layer of the project, containing pure TypeScript with **zero dependencies**. It defines the core types, interfaces, and engine components that the rest of the application builds upon. This package can run in any JavaScript environment (Node.js, Deno, or a browser) without React.

### 2. Provider Layer (`@web3viz/providers`)

This layer is responsible for fetching real-time data from various external sources. It implements the `DataProvider` interface defined in the Core Layer. Each provider is responsible for:

*   Connecting to a data source (e.g., WebSocket, REST API).
*   Parsing the raw data.
*   Emitting normalized `DataProviderEvent` objects.

The `useProviders()` hook in this package is responsible for aggregating data from multiple providers, buffering events, and merging stats.

### 3. Rendering Layer (`@web3viz/react-graph`)

This layer is responsible for rendering the 3D visualization. It's a React Three Fiber component that takes the data from the providers and turns it into a 3D scene. Key features include:

*   **InstancedMesh rendering** for high performance.
*   **Spatial hashing** for efficient proximity queries.
*   **Framerate-independent physics** for consistent behavior.
*   **Post-processing effects** for a polished look and feel.

### 4. UI Layer (`@web3viz/ui`)

This layer provides a comprehensive design system and a library of reusable UI components. It uses CSS custom properties for theming, with light and dark presets.

### 5. Application Layer (`app/` + `features/`)

This is the main Next.js 14 application that brings everything together. It uses the App Router to define the pages and API routes. The `features/` directory contains the feature-specific components that are composed on the pages.

---

## Data Flow

The data flow in the application is designed to be unidirectional and easy to follow:

1.  **Data Ingestion:** The `DataProvider` instances in the Provider Layer connect to external data sources and ingest real-time data.
2.  **Data Normalization:** The providers normalize the raw data into a consistent format (`DataProviderEvent`).
3.  **Data Aggregation:** The `useProviders` hook aggregates the events from all active providers, buffers them to prevent performance issues, and merges the stats.
4.  **Data Consumption:** The React components in the Application Layer consume the aggregated data from the `useProviders` hook.
5.  **Data Visualization:** The Rendering Layer (`ForceGraph` component) takes the data and renders the 3D visualization. The UI Layer components display the supplementary information (stats, live feed, etc.).


---

## Data Flow

### Event Lifecycle

```
1. WebSocket message arrives
   └─▸ Provider.handleXxx() parses raw data

2. Provider emits DataProviderEvent
   └─▸ { id, providerId, category, timestamp, label, amount, address, tokenAddress }

3. useProviders() event callback
   └─▸ Event pushed to buffer (eventBufferRef)

4. 100ms debounce timer fires
   └─▸ flush() merges buffer into allEvents state
   └─▸ Stats recomputed via useMemo (top tokens, trader edges, counts)

5. React re-renders
   └─▸ ForceGraph receives new topTokens + traderEdges
   └─▸ StatsBar receives counts + volume
   └─▸ LiveFeed receives filteredEvents
```

### Graph Update Cycle

```
1. topTokens / traderEdges props change
   └─▸ ForceGraphSimulation.update(hubs, edges)

2. d3-force simulation runs
   └─▸ Hub charge repulsion (-200 default)
   └─▸ Agent charge repulsion (-8 default)
   └─▸ Center gravity (0.03)
   └─▸ Link springs (hub: 25, agent: 5-8)
   └─▸ Collision avoidance (0.7)

3. useFrame() on each animation frame
   └─▸ Read node positions from simulation
   └─▸ Update InstancedMesh matrices
   └─▸ Recompute proximity lines via SpatialHash
   └─▸ Apply mouse repulsion
   └─▸ Apply framerate-independent damping
```

---

## Performance Architecture

### Rendering Budget (per frame at 60fps)

| Operation | Budget | Technique |
|---|---|---|
| Node rendering | ~2ms | InstancedMesh (1 draw call for 5000 nodes) |
| Proximity lines | ~1ms | SpatialHash grid queries + BufferGeometry |
| Physics update | ~1ms | d3-force tick + damping |
| Post-processing | ~3ms | SMAA + N8AO + Bloom (configurable) |
| React overhead | ~1ms | Minimal — graph updates bypass React state |

### Key Optimizations

- **InstancedMesh:** Each node type (hub, agent) uses a single mesh. Position/color/scale written to instance attributes — one draw call per type.
- **SpatialHash:** 3D spatial grid for O(1) neighbor lookups when drawing proximity lines. Avoids O(n²) brute-force distance checks.
- **Framerate independence:** Physics damping uses `damping^(dt*60)` so behavior is identical at 30fps and 144fps.
- **Event buffering:** Provider events are batched into 100ms windows before triggering React state updates.
- **BoundedMap/BoundedSet:** Fixed-capacity collections that evict oldest entries, preventing memory leaks from unbounded streaming data.

---

## Provider System Design

### Why an Interface?

The `DataProvider` interface decouples data sources from visualization. This means:

1. **Swap sources freely** — Mock for dev, PumpFun for prod, your custom source for your app
2. **Multiple sources simultaneously** — Ethereum + Solana + agents all rendered together
3. **Test without network** — MockProvider generates deterministic synthetic data
4. **Publish independently** — Each provider is its own importable module

### Provider Lifecycle

```
new Provider()    → constructor (configure, no connections)
  │
  ▼
provider.connect()    → open WebSocket(s), start processing
  │
  ▼
provider.onEvent(cb)  → subscribe to normalized events
  │
  ▼
provider.getStats()   → read current aggregated stats
  │
  ▼
provider.disconnect() → close connections, clean up
```

See [PROVIDERS.md](PROVIDERS.md) for a complete guide to building your own.

---

## Category System

Categories are the taxonomy for events. Each provider declares which categories it emits:

```typescript
const categories: CategoryConfig[] = [
  { id: 'launches', label: 'Launches', icon: '◉', color: '#22c55e', sourceId: 'pumpfun' },
  { id: 'trades',   label: 'Trades',   icon: '⇄', color: '#3b82f6', sourceId: 'pumpfun' },
];
```

The UI automatically generates filter controls from the category list. Users can toggle categories on/off, and the `useProviders()` hook filters events accordingly.

### Built-in Categories

| Source | Categories |
|---|---|
| PumpFun | launches, agentLaunches, trades, claimsWallet, claimsGithub, claimsFirst |
| Ethereum | ethSwaps, ethTransfers, ethMints |
| Base | baseSwaps, baseTransfers, baseMints |
| Agents | agentDeploys, agentInteractions, agentSpawn, agentTask, toolCall, subagentSpawn, reasoning, taskComplete, taskFailed |
| CEX | cexSpotTrades, cexLiquidations |

---

## Monorepo Tooling

### Turborepo

`turbo.json` defines the build pipeline:

```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"] },
    "dev": { "persistent": true },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

`dependsOn: ["^build"]` means a package's build runs only after its dependencies finish building.

### Package Resolution

Path aliases in `tsconfig.json`:

```json
{
  "@web3viz/core": ["packages/core/src"],
  "@web3viz/ui": ["packages/ui/src"],
  "@web3viz/react-graph": ["packages/react-graph/src"],
  "@web3viz/providers": ["packages/providers/src"],
  "@web3viz/utils": ["packages/utils/src"]
}
```

Next.js `transpilePackages` in `next.config.js` ensures internal packages are bundled correctly.
