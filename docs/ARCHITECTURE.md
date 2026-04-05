# Architecture

Deep dive into how web3viz is designed, how data flows, and why.

---

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                   Browser / Client                   │
│                                                      │
│  ┌──────────────┐   ┌───────────┐   ┌────────────┐ │
│  │  Data Source  │   │  Provider  │   │  Registry  │ │
│  │  (WebSocket)  │──▸│  Instance  │──▸│  (global)  │ │
│  └──────────────┘   └───────────┘   └────────────┘ │
│                            │                         │
│                     ┌──────▼──────┐                  │
│                     │ useProviders │ (React hook)     │
│                     │  - buffer    │                  │
│                     │  - merge     │                  │
│                     │  - filter    │                  │
│                     └──────┬──────┘                  │
│                            │                         │
│              ┌─────────────┼─────────────┐           │
│              ▼             ▼             ▼           │
│        ┌──────────┐ ┌──────────┐ ┌────────────┐    │
│        │ForceGraph│ │ StatsBar │ │  LiveFeed  │    │
│        │  (3D)    │ │  (HUD)   │ │  (events)  │    │
│        └──────────┘ └──────────┘ └────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Layer Breakdown

### 1. Core Layer (`@web3viz/core`)

**Zero dependencies.** Pure TypeScript that defines the contract everything else implements.

| Module | Purpose |
|---|---|
| `types/` | `TopToken`, `TraderEdge`, `DataProviderEvent`, `GraphHandle`, `Vec3` |
| `engine/` | `ForceGraphSimulation` (d3-force wrapper), `SpatialHash` (O(1) neighbors) |
| `categories/` | Category definitions, `CategoryConfig` interface, source configs |
| `providers/` | `DataProvider` interface, registry functions, `createProvider` factory |

The core package can run in Node.js, Deno, or a browser without React.

### 2. Provider Layer (`@web3viz/providers`)

Implements the `DataProvider` interface for each data source. Each provider:

1. Opens WebSocket / RPC connections
2. Parses raw protocol messages
3. Emits normalized `DataProviderEvent` objects
4. Tracks stats (counts, volumes, top tokens, trader edges)

**Providers ship independently** — you only import the ones you need:

```typescript
import { PumpFunProvider } from '@web3viz/providers/pump-fun';
import { MockProvider } from '@web3viz/providers/mock';
```

The `useProviders()` hook aggregates multiple providers:

- **Event buffering:** 100ms debounce prevents render storms
- **Stats merging:** Collects top 8 tokens, all trader edges, per-source breakdowns
- **Category filtering:** Toggle categories and providers on/off

### 3. Rendering Layer (`@web3viz/react-graph`)

React Three Fiber component that turns `topTokens` + `traderEdges` into a 3D scene:

- **InstancedMesh:** Single draw call per node type (hubs, agents)
- **SpatialHash:** O(1) proximity queries for line drawing
- **Framerate-independent physics:** `damping^(dt*60)` ensures consistent behavior at any FPS
- **Post-processing:** SMAA anti-aliasing, N8AO ambient occlusion, selective bloom

### 4. UI Layer (`@web3viz/ui`)

Design system with CSS custom property theming:

- **Tokens:** Colors, spacing, typography, shadows, z-index
- **Theme:** `ThemeProvider` + `createTheme()` + light/dark presets
- **Primitives:** Button, Input, Dialog, Panel, Badge, Pill, ColorControl
- **Composed:** StatsBar, LiveFeed, FilterSidebar, SharePanel, WorldHeader

### 5. Application Layer (`app/` + `features/`)

Next.js 14 App Router pages that compose everything:

- `app/world/page.tsx` — Main visualization (instantiates providers, renders ForceGraph + UI)
- `app/agents/page.tsx` — Agent monitoring dashboard
- `app/embed/page.tsx` — Embeddable widget
- `features/World/` — World-specific components, hooks, utilities
- `features/Agents/` — Agent-specific components

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
