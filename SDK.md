# @web3viz — Real-Time Web3 Visualization SDK

A production-grade **monorepo** for building real-time, interactive 3D visualizations of on-chain activity. Ships as reusable npm packages, a design system, and a full reference application.

> **Live demo**: The `/world` route connects to live Solana PumpFun data with zero configuration.

---

## Architecture

```
visualize-web3-realtime/
├── packages/
│   ├── core/               # Pure TS — types, engine, categories, plugins, themes
│   ├── providers/          # Data providers (PumpFun, Ethereum, CEX, Agent, Mock, Custom)
│   ├── react-graph/        # React Three Fiber force-directed 3D graph component
│   ├── ui/                 # Design system — tokens, theme, primitives, composed components
│   ├── utils/              # Shared utilities (screenshot, share URL, formatters)
│   ├── mcp/                # MCP server (DeFi Llama, cookie.fun, proof registry)
│   ├── executor/           # Agent execution server (WebSocket + REST, Claude SDK)
│   ├── engine/             # Framework-agnostic force simulation engine
│   ├── react/              # React wrapper for swarming engine
│   ├── vue/                # Vue 3 wrapper
│   ├── svelte/             # Svelte wrapper
│   ├── react-native/       # React Native + Expo wrapper
│   ├── swarming/           # CDN/UMD bundle
│   ├── swarming-physics/   # Rust/WASM Barnes-Hut simulation (3-5x faster)
│   ├── swarming-collab-server/ # WebSocket relay for multiplayer
│   ├── agent-bridge/       # CLI for connecting external AI agents
│   ├── create-swarming-app/    # Project scaffolder CLI
│   ├── create-swarming-plugin/ # Plugin scaffolder CLI
│   ├── tsconfig/           # Shared TypeScript configs
│   └── tailwind-config/    # Shared Tailwind CSS config
├── apps/
│   ├── playground/         # Standalone Next.js demo app
│   └── mobile-demo/        # Expo React Native demo
├── app/                    # Main Next.js 14 app (live data)
├── features/               # Feature modules (World, Agents, Scrollytelling, Landing, Demos, Tools)
├── hooks/                  # Custom React hooks (useAgentEvents, useAgentProvider)
└── turbo.json              # Turborepo pipeline config
```

## Packages

### `@web3viz/core`

Pure TypeScript foundation — zero React dependencies.

- **Types**: `Token`, `Trade`, `Claim`, `TopToken`, `TraderEdge`, `GraphNode`, `GraphEdge`, `ShareColors`, `GraphHandle`, `Vec3`, `DataProviderEvent`, `MergedStats`
- **Agent Types**: `AgentIdentity`, `AgentTask`, `AgentToolCall`, `AgentEvent`, `AgentFlowTrace`, `ExecutorState`
- **Engine**: `ForceGraphSimulation` (configurable d3-force-3d manager), `SpatialHash` (O(1) 3D neighbor lookups)
- **Categories**: 34 built-in categories across 6 sources. Extensible via `CategoryConfig`.
- **Plugins**: `PluginManager` with source, theme, and renderer plugin types. Built-in: ethereum, solana, mock, websocket.
- **Themes**: `darkTheme`, `lightTheme` presets with chain/protocol color mappings.
- **Providers**: `DataProvider` interface, registry (`registerProvider`, `getProvider`), factory (`createProvider`)

```ts
import { ForceGraphSimulation, CATEGORIES, type Token } from '@web3viz/core';
```

### `@web3viz/providers`

Data provider implementations and aggregation hooks.

- **`PumpFunProvider`** — Solana token launches, trades, bonding curves, whale/sniper detection, claims
- **`EthereumProvider`** — Uniswap V2/V3 swaps, ERC-20 transfers, mints via RPC WebSocket
- **`CexVolumeProvider`** — Binance spot trades (10 pairs, >$50K filter) and liquidations
- **`AgentProvider`** — Meta-provider detecting AI agent activity + cookie.fun API polling
- **`MockProvider`** — Generates synthetic events for development/testing
- **`CustomStreamProvider`** — User-defined WebSocket, REST, SSE, or callback streams
- **`useProviders()`** — React hook aggregating events from all active providers
- **Shared**: `WebSocketManager` (exponential backoff, heartbeat), `BoundedMap`/`BoundedSet` (LRU caches), `validate.ts` (runtime validators)

```tsx
import { useProviders, PumpFunProvider, MockProvider } from '@web3viz/providers';
```

### `@web3viz/react-graph`

React Three Fiber 3D force-directed graph component.

- Instanced rendering (InstancedMesh) for thousands of nodes at 60fps
- Configurable hub layout, spring physics, mouse repulsion
- Imperative `GraphHandle` API (`focusHub`, `animateCameraTo`, `takeSnapshot`, `setOrbitEnabled`, `getCanvasElement`)
- `PostProcessing` component (bloom, depth-of-field)
- `SwarmingProvider` context for plugin system
- WebGPU support with auto-detection fallback to WebGL
- Full TypeScript props API

```tsx
import { ForceGraph, SwarmingProvider } from '@web3viz/react-graph';
```

### `@web3viz/ui`

Full design system with dark/light theming.

- **Tokens**: Colors (CSS custom properties), typography (IBM Plex Mono), spacing scale, shadows, z-index, transitions, agent-specific colors
- **Theme**: `ThemeProvider`, `useTheme()`, `createTheme()`, `lightTheme`/`darkTheme` presets
- **Primitives**: `Button`, `Pill`, `StatPill`, `Badge`, `StatusDot`, `TextInput`, `HexInput`, `Dialog`, `Panel`, `ColorControl`, `SwatchPicker`
- **Composed**: `FilterSidebar`, `StatsBar`, `LiveFeed`, `SharePanel`, `ShareOverlay`, `InfoPopover`, `JourneyOverlay`, `StartJourneyButton`, `ConnectionIndicator`, `WorldHeader`

```tsx
import { ThemeProvider, Button, LiveFeed, StatsBar } from '@web3viz/ui';
```

### `@web3viz/utils`

Shared utility functions.

- `captureWebGLSnapshot()` / `downloadWebGLSnapshot()` — WebGL canvas capture
- `snapshotToBlob()` — Canvas to Blob conversion
- `buildShareUrl()` / `parseShareParams()` — Share URL encoding
- `buildShareText()` — Generate share text (title + stats)
- `shareOnX()` / `shareOnLinkedIn()` — Social sharing intents
- `formatNumber()` / `formatSol()` / `truncateAddress()` — Display formatting
- `debounce()` / `clamp()` / `lerp()` — Math/timing helpers
- `downloadBlob()` / `timestampedFilename()` — File download helpers

```ts
import { captureWebGLSnapshot, formatSol, truncateAddress } from '@web3viz/utils';
```

### `@web3viz/mcp`

Model Context Protocol server for AI agents.

- **Resources**: `protocol_stats` (DeFi Llama TVL), `recent_trades` (live trade feed), `agent_activity` (cookie.fun rankings), `proof_status` (LuminAIR STARK proofs)
- **API**: `fetchResource(name, params?)`, `listResources()`, `registerRecentEventsSource()`, `addProofResult()`
- **Protocols tracked**: Aave, Uniswap, Compound, MakerDAO, Lido

```ts
import { fetchResource, listResources } from '@web3viz/mcp';
```

### `@web3viz/executor`

Agent execution server for autonomous DeFi tasks.

- **ExecutorServer** — HTTP server + WebSocket broadcaster (port 8765 default)
- **AgentManager** — Agent lifecycle (spawn, status transitions, task assignment)
- **ClaudeAgentClient** — Claude SDK wrapper with MCP tool integration
- **TaskQueue** — FIFO task queue with state tracking
- **EventBroadcaster** — WebSocket broadcast (snapshot, event, heartbeat messages)
- **StateStore** — SQLite persistence (better-sqlite3)
- **HealthMonitor** — CPU, memory, connection tracking
- **Agent roles**: coder, researcher, planner
- **REST endpoints**: /api/status, /api/agents, /api/tasks, /api/events

> **Note:** Currently broken — missing `ws` dependency.

### Framework Wrappers

| Package | Description |
|---|---|
| `@swarming/engine` | Framework-agnostic force simulation engine (vanilla JS API) |
| `@swarming/react` | React wrapper |
| `@swarming/vue` | Vue 3 wrapper |
| `@swarming/svelte` | Svelte wrapper |
| `@swarming/react-native` | React Native + Expo with GL renderer |
| `swarming` | CDN/UMD bundle — zero-build embed via `<script>` tag |

### Tooling

| Package | Description |
|---|---|
| `swarming-physics` | Rust/WASM Barnes-Hut force simulation (3-5x faster than JS) |
| `swarming-collab-server` | WebSocket relay for multiplayer collaboration |
| `agent-bridge` | CLI to connect external AI agents to visualization |
| `create-swarming-app` | Project scaffolder — `npx create-swarming-app` |
| `create-swarming-plugin` | Plugin project scaffolder |

---

## Quick Start

### Run the main app (live data)

```bash
npm install
npm run dev
```

Open **http://localhost:3100** — the `/world` visualizer with live PumpFun data.

### Run tests

```bash
npm test                     # Run all tests (vitest)
npm run test:coverage        # With coverage
npm test -- --run packages/core  # Specific package
```

### Build and verify

```bash
npm run build       # Production build (Next.js only)
npm run typecheck   # TypeScript check (root tsconfig)
npm run lint        # ESLint
```

> **Do NOT use `turbo run build`** — broken packages (executor, playground) will fail. Use `npm run build`.

---

## Using as a Template

1. **Fork/clone** this repo
2. Delete `app/` and `features/` (the reference application)
3. Keep `packages/` — these are your reusable building blocks
4. Create your own `apps/my-app/` with `@web3viz/*` imports
5. Implement a custom `DataProvider` for your data source

### Creating a Custom Provider

```ts
import { createProvider } from '@web3viz/core';

const myProvider = createProvider({
  id: 'my-protocol',
  label: 'My Protocol',
  connect: (emit) => {
    const ws = new WebSocket('wss://...');
    ws.onmessage = (e) => emit({ type: 'trade', data: parse(e.data) });
    return () => ws.close();
  },
});
```

---

## Design Tokens

All colors use CSS custom properties for runtime theming:

| Token | Default (Dark) | Description |
|-------|---------------|-------------|
| `--w3v-bg` | `#0a0a0f` | Background |
| `--w3v-surface` | `#141420` | Card/panel surface |
| `--w3v-border` | `#2a2a3a` | Borders |
| `--w3v-text` | `#e2e2f0` | Primary text |
| `--w3v-text-muted` | `#8888aa` | Secondary text |
| `--w3v-accent` | `#a78bfa` | Accent/brand |

Override any token via CSS or the `ThemeProvider`:

```tsx
<ThemeProvider theme={createTheme({ background: '#ffffff', text: '#111' })}>
  <App />
</ThemeProvider>
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + npm workspaces |
| Framework | Next.js 14 (App Router), React 18 |
| 3D | React Three Fiber + Three.js + @react-three/drei |
| Physics | d3-force-3d (CPU) + WASM Barnes-Hut (Rust) |
| Animation | Framer Motion |
| Styling | Tailwind CSS + CSS custom properties |
| Typography | IBM Plex Mono |
| AI | Claude Sonnet (@anthropic-ai/sdk) with tool-use |
| MCP | Model Context Protocol server |
| ZK Proofs | Giza LuminAIR (STARK verification) |
| Code Editor | CodeMirror 6 |
| Testing | Vitest + jsdom + React Testing Library |
| CI/CD | GitHub Actions |
| Language | TypeScript 5.5 (strict mode) |
| Data | WebSocket (PumpPortal, Ethereum RPC, Binance) + REST (cookie.fun, DeFi Llama) |

---

## License

MIT
