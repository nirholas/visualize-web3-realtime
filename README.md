<p align="center">
  <img src="docs/assets/svg/header-banner.svg" alt="swarming" width="800" />
</p>

<p align="center">
  <img src="docs/assets/hero.gif" alt="Real-time Web3 + AI Agent Visualization" width="800" />
</p>

<p align="center">
  <strong>5,000 nodes. 60fps. One draw call.</strong><br/>
  <sub>GPU-accelerated force-directed graph engine for real-time data streams.<br/>Onchain transactions, AI agent orchestration, infrastructure telemetry — any event source, rendered as particles in 3D space.</sub>
</p>

<p align="center">
  <a href="https://swarming.dev/world"><strong>Live Demo</strong></a> · <a href="docs/"><strong>Documentation</strong></a> · <a href="https://swarming.dev/demos"><strong>Demos</strong></a> · <a href="https://swarming.dev/benchmarks"><strong>Benchmarks</strong></a>
</p>

> Conventional graph libraries render each node as an individual DOM element or canvas draw — $O(n)$ draw calls per frame. swarming uses GPU-instanced rendering: a single `InstancedMesh` call submits all node geometry in one batch, while a `SpatialHash` grid resolves proximity queries in $O(1)$ amortized time. The result is 5,000+ live-streaming nodes at 60fps in a standard browser, with force-directed physics running per-frame.

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

## Get Started in 30 Seconds

```bash
git clone https://github.com/nirholas/visualize-web3-realtime.git
cd visualize-web3-realtime
npm install && npm run dev
```

Open **http://localhost:3100** — live visualization starts immediately. No API keys needed for the default providers.

Or use the packages directly:

```bash
npm install @web3viz/core @web3viz/react-graph
```

```tsx
import { ForceGraph } from '@web3viz/react-graph'

function App() {
  return <ForceGraph topTokens={hubs} traderEdges={edges} background="#0a0a0f" showLabels />
}
```

Or scaffold a full project:

```bash
npx create-swarming-app my-viz       # React + swarming, ready to go
npx create-swarming-plugin my-plugin  # Plugin scaffold with hot reload
```

### What You Get

```
localhost:3100/
├── /world           Force-directed 3D graph — live Solana/ETH/Base streams, desktop shell, AI chat
├── /agents          Agent orchestration graph — task DAGs, tool calls, reasoning traces
├── /embed           Embeddable widget — iframe or <script> tag, URL-parameterized
├── /demos/*         6 simulation scenarios (GitHub activity, K8s pods, API traffic, agents, social, IoT)
├── /playground      Live editor — modify graph parameters, observe results in real time
├── /docs            Full reference documentation
└── /plugins         Extensible plugin registry — data sources, renderers, themes
```

<br/>

## Features

<p align="center">
  <img src="docs/assets/svg/network-animation.svg" alt="Network visualization" width="800" />
</p>

<table>
<tr>
<td width="33%" align="center">
<img src="docs/assets/feature-performance.gif" alt="60fps performance" width="240" /><br />
<strong>GPU-instanced rendering</strong><br />
<sub>Single draw call for 5,000 nodes via InstancedMesh. SpatialHash grid for O(1) proximity queries.</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-websocket.gif" alt="Any data source" width="240" /><br />
<strong>Streaming data providers</strong><br />
<sub>WebSocket, REST, SSE, or custom callback. Event buffering with backpressure handling.</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-physics.gif" alt="Force-directed physics" width="240" /><br />
<strong>Force-directed simulation</strong><br />
<sub>d3-force-3d with framerate-independent damping, configurable charge/spring constants, Barnes-Hut optimization.</sub>
</td>
</tr>
<tr>
<td width="33%" align="center">
<img src="docs/assets/feature-interaction.gif" alt="Mouse interaction" width="240" /><br />
<strong>Interaction model</strong><br />
<sub>GPU raycasting for hover/click. Mouse-repulsion force field. Inertial camera with fly-to interpolation.</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-themes.gif" alt="Themes" width="240" /><br />
<strong>Design system</strong><br />
<sub>Token-based theming with dark/light presets. CSS custom properties. Full component library.</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-export.gif" alt="Export & share" width="240" /><br />
<strong>Capture & export</strong><br />
<sub>WebGL canvas snapshot with metadata overlay. Share URLs with encoded state. Embeddable widget.</sub>
</td>
</tr>
<tr>
<td width="33%" align="center">
<img src="docs/assets/feature-ai.gif" alt="AI chat assistant" width="240" /><br />
<strong>AI scene control</strong><br />
<sub>Natural language graph manipulation via Claude Sonnet tool-use. 5 scene tools.</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-agents.gif" alt="Agent monitoring" width="240" /><br />
<strong>Agent orchestration</strong><br />
<sub>Task DAG visualization. Tool call tracing. Sub-agent spawning. Reasoning state rendering.</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-wasm.gif" alt="WASM physics" width="240" /><br />
<strong>WASM Barnes-Hut</strong><br />
<sub>Rust-compiled N-body simulation via WebAssembly. 3-5x throughput vs JavaScript d3-force.</sub>
</td>
</tr>
<tr>
<td width="33%" align="center">
<img src="docs/assets/feature-collab.gif" alt="Desktop shell" width="240" /><br />
<strong>Desktop shell</strong><br />
<sub>Windowed UI with taskbar, start menu, z-ordering. State persistence via localStorage.</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-editor.gif" alt="Scrollytelling" width="240" /><br />
<strong>Scroll-driven narrative</strong><br />
<sub>GLSL shader scenes, particle systems, timeline-synchronized animation keyframes.</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-multiframework.gif" alt="Multi-framework" width="240" /><br />
<strong>Multi-framework</strong><br />
<sub>React, Vue, Svelte, React Native, vanilla JS, CDN. Same engine, different bindings.</sub>
</td>
</tr>
</table>

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Supported Chains & Data Sources

| Provider | Chain / Source | Data | Authentication |
|---|---|---|---|
| **PumpFun** | Solana | Token launches, trades, bonding curves, whale detection, sniper detection, fee claims | None required |
| **Ethereum** | Ethereum | Uniswap V2/V3 swaps, ERC-20 transfers, token mints | RPC WebSocket (Alchemy, Infura, or public) |
| **Base** | Base (L2) | DEX swaps, transfers, mints | RPC WebSocket |
| **CEX Volume** | Binance | Spot trades (10 pairs, >$50K filter), futures liquidations | None required |
| **Agent** | Multi-chain | AI agent detection across all providers + cookie.fun rankings | None required |
| **ERC-8004** | Multi-chain | ERC-8004 token events | RPC WebSocket |
| **Mock** | Synthetic | Random events for development and testing | None required |
| **Custom** | Any | User-defined WebSocket, REST, SSE, or callback streams | User-provided |

### AI Agent Detection

The Agent provider detects activity from 15+ AI agent frameworks including Virtuals, ELIZA, AI16Z, DegeneAI, Olas, Fetch.ai, Singularity, and Ocean Protocol via keyword matching and cookie.fun API polling.

### DeFi Protocol Tracking (via MCP)

TVL and metrics for Aave, Uniswap, Compound, MakerDAO, and Lido via DeFi Llama public API.

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Pages & Routes

### Core Application

| Route | Description |
|---|---|
| `/` | Scrollytelling home page with scroll-driven animations and dashboard mockups |
| `/world` | **Main 3D visualization** — force graph, desktop shell, AI chat, timeline, provider management, onboarding |
| `/agents` | **AI agent dashboard** — agent/task/tool graph, sidebar, live feed, task inspector, executor connection |
| `/embed` | Embeddable widget with URL param customization (`?theme=`, `?bg=`, `?maxNodes=`, `?labels=`) |
| `/landing` | Alternative marketing page with editorial engine and 3D Giza shader scene |

### Content & Community

| Route | Description |
|---|---|
| `/blog` | 5 technical blog posts (viz engine, websocket-to-3d, comparisons, zero-dom, particles) |
| `/docs/*` | Full documentation hub — Getting Started (3), Guide (17), API Reference (5), Examples (2), Community (4) |
| `/playground` | Interactive code editor + live preview with 5 presets and URL-based sharing |
| `/showcase` | Community gallery with category filtering, sorting, and search |
| `/plugins` | Plugin directory — 6 built-in + 10 community plugins (sources, themes, renderers) |
| `/benchmarks` | Performance comparison charts against 8 graph libraries |

### Demo Scenarios (6)

| Route | Domain | Description |
|---|---|---|
| `/demos/github` | Developer Tools | Repository activity — pushes, PRs, issues, stars, forks |
| `/demos/kubernetes` | Infrastructure | Pod lifecycle — running, pending, error, terminated |
| `/demos/api-traffic` | Infrastructure | HTTP request flow to endpoints, color-coded by status |
| `/demos/ai-agents` | AI & ML | Multi-agent task orchestration (research, code, review, plan) |
| `/demos/social` | Social & Media | Interaction graph — likes, reposts, follows, replies |
| `/demos/iot` | Hardware & IoT | Sensor network — temperature, humidity, motion, pressure, light |

### Tool Showcases (7)

| Route | Description |
|---|---|
| `/tools/ai-office` | Procedural 3D autonomous AI agents — pure math, no imported assets |
| `/tools/blockchain-viz` | Blockchain P2P network simulation with data packets |
| `/tools/cosmograph` | GPU-accelerated WebGL graph via Apache Arrow & DuckDB |
| `/tools/creative-coding` | WebGL shader playground inspired by Cables.gl and Nodes.io |
| `/tools/graphistry` | GPU-powered visual graph intelligence platform |
| `/tools/nveil` | Volumetric 3D data rendering and spatial dashboard |
| `/tools/reagraph` | React-native WebGL network graph using Three.js + D3 |

### API Endpoints (4)

| Endpoint | Method | Description |
|---|---|---|
| `/api/world-chat` | POST | AI chat with 5 scene-manipulation tools (Groq default, Anthropic fallback). Rate-limited: 20 req/60s per IP |
| `/api/executor` | GET/POST | Proxy to executor backend. Whitelisted paths: /api/status, /api/tasks, /api/agents. Rate-limited: 30 req/60s per IP |
| `/api/agents/cookie` | GET | Proxy to cookie.fun agent rankings API. Cached: 60s ISR + stale-while-revalidate |
| `/api/thumbnail` | GET | Edge-runtime OG image generation per demo category |

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Architecture

The system is organized as a data pipeline: event sources emit typed messages into a provider layer that buffers and merges them, then the rendering layer consumes the unified stream and updates GPU buffers directly — bypassing React's reconciliation cycle for graph mutations.

```
┌────────────────────────────────────────────────────────────────────┐
│                        Browser / Client                            │
│                                                                    │
│  Event Sources (WebSocket/REST)                                    │
│  ├── PumpFun (Solana)    ├── Ethereum (RPC)   ├── Binance (CEX)   │
│  ├── Base (RPC)          ├── cookie.fun (REST) ├── Custom streams  │
│  └── Agent (meta)        └── Mock (synthetic)                      │
│         │                                                          │
│         ▼                                                          │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  useProviders() — event buffering, merge, filtering      │      │
│  │  BoundedMap/BoundedSet — LRU-evicting caches             │      │
│  └──────────────┬───────────────────────────────────────────┘      │
│                 │                                                   │
│    ┌────────────┼────────────┬──────────────┐                      │
│    ▼            ▼            ▼              ▼                      │
│  ForceGraph  StatsBar    LiveFeed     DesktopShell                 │
│  (R3F +      (derived    (event log)  (windowed UI)                │
│   InstancedMesh) metrics)                                          │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  GPU Pipeline: InstancedMesh → SpatialHash →            │       │
│  │  BufferGeometry → PostProcessing (SMAA/N8AO/Bloom)      │       │
│  └─────────────────────────────────────────────────────────┘       │
└────────────────────────────────────────────────────────────────────┘
```

### Layer Breakdown

| Layer | Package | Responsibility |
|---|---|---|
| **Core** | `@web3viz/core` | Types, ForceGraphSimulation engine, SpatialHash, 34 event categories, plugin system, theme system. Zero React deps. |
| **Providers** | `@web3viz/providers` | Data provider implementations, WebSocketManager (exponential backoff + heartbeat), BoundedMap/BoundedSet, validation |
| **Rendering** | `@web3viz/react-graph` | ForceGraph React Three Fiber component, PostProcessing (bloom/DOF), SwarmingProvider context, WebGPU support |
| **UI** | `@web3viz/ui` | Design system — tokens, ThemeProvider, primitives, composed components |
| **Utilities** | `@web3viz/utils` | WebGL snapshot capture, social sharing (X, LinkedIn), number formatting, share URLs |
| **MCP** | `@web3viz/mcp` | MCP server — 4 AI-readable resources (protocol_stats, recent_trades, agent_activity, proof_status) |
| **Application** | `app/` + `features/` | Next.js 14 pages, API routes, World visualization, Agents dashboard, Scrollytelling, Demos, Tools, Landing |

### Event Categories (34 total)

| Source | Categories |
|---|---|
| **PumpFun** (Solana) | launches, agentLaunches, trades, bondingCurve, whales, snipers, claimsWallet, claimsGithub, claimsFirst |
| **Ethereum** | ethSwaps, ethTransfers, ethMints |
| **Base** | baseSwaps, baseTransfers, baseMints |
| **Agents** | agentDeploys, agentInteractions, agentSpawn, agentTask, toolCall, subagentSpawn, reasoning, taskComplete, taskFailed |
| **ERC-8004** | erc8004Mints, erc8004Transfers, erc8004Updates |
| **CEX** | cexSpotTrades, cexLiquidations |

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Desktop Shell UI

The `/world` page features a Windows 95-style desktop interface:

- **8 window apps** — Filters, Live Feed, Stats, AI Chat, Share, Embed, Data Sources, Timeline
- **Draggable/resizable windows** with title bar controls (minimize, maximize, close)
- **Taskbar** with app icons, connection indicators, and system clock
- **Start Menu** launcher with app grid
- **Window state persistence** via localStorage (position, size, z-order)
- **Glassmorphism design** with frosted glass effects
- **Keyboard shortcuts** and connection status toasts
- **7-step onboarding** walkthrough for first-time users

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## AI Integration

### World Chat

AI assistant embedded in the visualization powered by Claude Sonnet with tool-use. 5 available tools:

| Tool | Description |
|---|---|
| `sceneColorUpdate` | Change scene element colors (RGB/hex) |
| `cameraFocus` | Focus camera on a hub or position |
| `dataFilter` | Filter by protocols, volume, or time range |
| `agentSummary` | Display agent metrics card |
| `tradeVisualization` | Highlight specific trades |

### MCP Server

Model Context Protocol server (`@web3viz/mcp`) exposes live data to AI agents:

| Resource | Source | Description |
|---|---|---|
| `protocol_stats` | DeFi Llama | TVL and metadata for Aave, Uniswap, Compound, MakerDAO, Lido |
| `recent_trades` | Active providers | Real-time trade feed with chain/category filtering |
| `agent_activity` | cookie.fun | Top AI agent rankings (7-day interval) |
| `proof_status` | Local registry | LuminAIR STARK proof verification results (max 500 entries) |

### Agent Monitoring Dashboard

Full agent orchestration visualization at `/agents`:

- **3D force graph** of agents, tasks, and tool nodes with particle trails
- **6 tool categories**: filesystem, search, terminal, network, code, reasoning
- **Agent sidebar** with status indicators (active/idle/error) and tool toggles
- **Task inspector** with tool call output, sub-agent tracking, reasoning text
- **Executor banner** with health monitoring (healthy/degraded/offline/reconnecting)
- **Stats bar**: active agents, task counts, tool calls/min
- **Timeline scrubber** with 1x/2x/4x playback speed
- **Spawn effects**, completion celebrations, reasoning halos, error shake animations

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## ZK Proof Verification

Built-in Giza LuminAIR integration for STARK proof verification. The `VerifyBadge` and `VerificationModal` components provide step-by-step verification directly in the UI. Gracefully degrades to demo mode if `@gizatech/luminair-web` is not installed.

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Multi-Framework Support

swarming runs everywhere:

**React**
```tsx
import { ForceGraph } from '@swarming/react'
<ForceGraph nodes={hubs} edges={connections} />
```

**Vue 3**
```vue
<script setup>
import { SwarmingGraph } from '@swarming/vue'
</script>
<template>
  <SwarmingGraph :nodes="hubs" :edges="connections" />
</template>
```

**Svelte**
```svelte
<script>
import { SwarmingGraph } from '@swarming/svelte'
</script>
<SwarmingGraph {nodes} {edges} />
```

**Vanilla JS / CDN**
```html
<script src="https://unpkg.com/swarming"></script>
<div id="viz"></div>
<script>
  Swarming.create('#viz', { source: 'wss://your-stream.com' })
</script>
```

**React Native (Expo)**
```tsx
import { SwarmingView } from '@swarming/react-native'
<SwarmingView nodes={hubs} edges={connections} />
```

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Packages

### Core

| Package | Description |
|---|---|
| [`@web3viz/core`](packages/core/) | Types, ForceGraphSimulation engine, SpatialHash, 34 categories, plugin system, theme system. Zero React deps. |
| [`@web3viz/providers`](packages/providers/) | Data providers: PumpFun, Ethereum, Base, CEX Volume, Agent, Mock, Custom. WebSocketManager, BoundedMap/BoundedSet, validation. |
| [`@web3viz/react-graph`](packages/react-graph/) | `<ForceGraph>` 3D component (React Three Fiber). PostProcessing, SwarmingProvider, WebGPU support. |
| [`@web3viz/ui`](packages/ui/) | Design system — tokens, ThemeProvider, primitives, composed components. Dark/light themes. |
| [`@web3viz/utils`](packages/utils/) | WebGL snapshots, share URLs, social sharing (X, LinkedIn), formatting helpers. |
| [`@web3viz/mcp`](packages/mcp/) | MCP server — DeFi Llama, cookie.fun, proof registry, recent trades. 4 AI-readable resources. |

### Framework Wrappers

| Package | Description |
|---|---|
| [`@swarming/engine`](packages/engine/) | Framework-agnostic force simulation engine. Vanilla JS API. |
| [`@swarming/react`](packages/react/) | React wrapper for the swarming engine. |
| [`@swarming/vue`](packages/vue/) | Vue 3 wrapper. |
| [`@swarming/svelte`](packages/svelte/) | Svelte wrapper. |
| [`@swarming/react-native`](packages/react-native/) | React Native + Expo with GL renderer. |
| [`swarming`](packages/swarming/) | CDN/UMD bundle — zero-build embed via `<script>` tag. |

### Tooling & Infrastructure

| Package | Description |
|---|---|
| [`swarming-physics`](packages/swarming-physics/) | Rust/WASM Barnes-Hut force simulation (3-5x faster than JS d3-force). |
| [`swarming-collab-server`](packages/swarming-collab-server/) | WebSocket relay for multiplayer collaboration (room-based broadcast). |
| [`agent-bridge`](packages/agent-bridge/) | CLI to connect external AI agents (Claude Code, OpenClaw, Hermes) to visualization. |
| [`@web3viz/executor`](packages/executor/) | Agent execution server — WebSocket + REST, Claude SDK, task queue, SQLite state. |
| [`create-swarming-app`](packages/create-swarming-app/) | CLI scaffolder — `npx create-swarming-app`. |
| [`create-swarming-plugin`](packages/create-swarming-plugin/) | Plugin project scaffolder. |

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Performance

<p align="center">
  <img src="docs/assets/svg/performance-bar.svg" alt="60fps at 5000 nodes" width="600" />
</p>

Rendering uses `InstancedMesh` (single draw call per node type), `SpatialHash` grids for $O(1)$ amortized proximity lookups, and framerate-independent Verlet integration for deterministic physics regardless of display refresh rate.

| | swarming | d3-force (SVG) | sigma.js | cytoscape |
|---|---|---|---|---|
| **1,000 nodes** | 60 fps | 45 fps | 55 fps | 40 fps |
| **5,000 nodes** | 60 fps | 12 fps | 30 fps | 8 fps |
| **10,000 nodes** | 45 fps | 3 fps | 15 fps | crash |
| **Rendering** | WebGL 3D (instanced) | SVG / Canvas | WebGL 2D | Canvas 2D |
| **Streaming data** | Native provider system | Manual | Manual | Manual |
| **Physics engine** | d3-force-3d + WASM Barnes-Hut | d3-force (JS) | Custom (JS) | Cola.js |

### Per-Frame Budget (16.6ms at 60fps)

| Stage | Time | Technique |
|---|---|---|
| Geometry submission | ~2ms | `InstancedMesh` — 1 draw call for $n$ nodes, matrix updates via `Float32Array` |
| Proximity resolution | ~1ms | `SpatialHash` grid queries + `BufferGeometry` line generation |
| Force simulation | ~1ms | d3-force-3d tick with velocity damping ($\alpha$ decay) |
| Post-processing | ~3ms | SMAA anti-aliasing + N8AO ambient occlusion + selective bloom (configurable) |
| React reconciliation | ~1ms | Graph mutations bypass React state — direct buffer writes |

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## API Overview

### `<ForceGraph>` Props

| Prop | Type | Description |
|---|---|---|
| `topTokens` | `TopToken[]` | Hub nodes (top entities by volume) |
| `traderEdges` | `TraderEdge[]` | Connections between traders and hubs |
| `height` | `number` | Canvas height |
| `background` | `string` | Scene background color |
| `groundColor` | `string` | Ground plane color |
| `simulationConfig` | `ForceGraphConfig` | Physics parameters (charge, damping, springs) |
| `showLabels` | `boolean` | Toggle hub labels |
| `showGround` | `boolean` | Toggle ground plane |
| `fov` | `number` | Camera field of view |
| `cameraPosition` | `[x, y, z]` | Initial camera position |
| `postProcessing` | `PostProcessingProps` | Bloom, DOF settings |
| `renderer` | `'auto' \| 'webgpu' \| 'webgl'` | Renderer selection |

### Imperative Handle

```tsx
const ref = useRef<GraphHandle>(null)

ref.current.focusHub(0)                            // Fly to hub
ref.current.animateCameraTo([10, 20, 30], origin)  // Custom fly-to
ref.current.setOrbitEnabled(true)                   // Auto-rotate
ref.current.takeSnapshot()                         // Capture WebGL canvas
ref.current.getCanvasElement()                     // Access canvas DOM element
```

Full API reference: [docs/COMPONENTS.md](docs/COMPONENTS.md)

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Build Your Own Provider

```typescript
import type { DataProvider } from '@web3viz/core'

class MyProvider implements DataProvider {
  readonly id = 'my-source'
  readonly name = 'My Data Source'
  readonly sourceConfig = { id: 'custom', label: 'Custom', color: '#6366f1', icon: '◉' }
  readonly categories = [
    { id: 'events', label: 'Events', icon: '⚡', color: '#6366f1', source: 'custom' },
  ]

  connect() {
    const ws = new WebSocket('wss://your-stream.com')
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data)
      this.emit({
        id: data.id,
        providerId: this.id,
        category: 'events',
        timestamp: Date.now(),
        label: data.name,
        amount: data.value,
      })
    }
  }
}
```

Guide: [docs/PROVIDERS.md](docs/PROVIDERS.md)

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Environment Variables

Copy `.env.example` to `.env.local`. The app works without any env vars — PumpFun data streams need no authentication.

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | No | — | Groq API key for `/world` AI chat (preferred, free tier) |
| `ANTHROPIC_API_KEY` | No | — | Anthropic API key for `/world` AI chat (fallback) |
| `API_SECRET` | No | — | API key for protected routes (/api/executor, /api/world-chat) |
| `NEXT_PUBLIC_SOLANA_WS_URL` | No | — | Solana RPC WebSocket |
| `NEXT_PUBLIC_ETH_WS_URL` | No | `wss://ethereum-rpc.publicnode.com` | Ethereum RPC WebSocket |
| `NEXT_PUBLIC_BASE_WS_URL` | No | `wss://base-rpc.publicnode.com` | Base chain RPC WebSocket |
| `NEXT_PUBLIC_SPERAXOS_WS_URL` | No | `wss://api.speraxos.io/agents/v1/stream` | Agent event WebSocket |
| `NEXT_PUBLIC_SPERAXOS_API_KEY` | No | — | SperaxOS API key (mock mode if empty) |
| `NEXT_PUBLIC_AGENT_MOCK` | No | `true` | Use mock agent data |
| `EXECUTOR_URL` | No | `http://localhost:8765` | Executor backend URL |
| `EXECUTOR_PORT` | No | `8765` | Executor WebSocket server port |
| `EXECUTOR_MAX_AGENTS` | No | `5` | Max concurrent agents |
| `STATE_PATH` | No | `./data/executor.db` | Executor SQLite database path |

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Tech Stack

<p align="center">
  <img src="docs/assets/svg/tech-stack.svg" alt="Tech stack" width="700" />
</p>

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Language | TypeScript (strict mode) |
| 3D Engine | Three.js + React Three Fiber + @react-three/drei |
| Physics | d3-force-3d (CPU) + WASM Barnes-Hut (GPU, Rust) |
| Post-processing | SMAA, N8AO ambient occlusion, selective bloom |
| Animation | Framer Motion |
| Styling | Tailwind CSS + CSS custom properties |
| Typography | IBM Plex Mono (monospace) |
| AI | Claude Sonnet (@anthropic-ai/sdk) with tool-use |
| MCP | Model Context Protocol server (DeFi Llama, cookie.fun, proofs) |
| ZK Proofs | Giza LuminAIR (STARK verification) |
| Code Editor | CodeMirror 6 (playground) |
| Testing | Vitest + jsdom + React Testing Library |
| Monorepo | npm workspaces + Turborepo |
| CI/CD | GitHub Actions (lint, typecheck, build, test, coverage, bundle size) |
| PWA | Web app manifest, app icons (192/512px) |
| SEO | Sitemap (48+ routes), robots.txt, dynamic OG images, JSON-LD |

<p align="center">
  <img src="docs/assets/svg/tech-stack.svg" alt="Tech stack" width="700" />
</p>

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Security

- **CSP headers** on all routes (script-src, connect-src, worker-src, frame-ancestors)
- **HSTS** with includeSubDomains
- **Rate limiting** on all API routes (per-IP, memory-bounded)
- **API key authentication** for protected routes via `x-api-key` header
- **Path validation** on executor proxy (no traversal, no protocol schemes)
- **Input sanitization** on chat messages (max 50 messages, 4000 chars each)
- **X-Frame-Options** DENY on all routes except `/embed`
- **Permissions-Policy** blocks camera, microphone, geolocation

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Project Structure

```
app/                          # Next.js App Router
  api/                        # API routes (world-chat, executor, agents/cookie, thumbnail)
  world/                      # Main 3D visualization page
  agents/                     # AI agent dashboard
  demos/                      # 6 demo scenarios (github, k8s, api, agents, social, iot)
  tools/                      # 7 tool showcases (ai-office, blockchain-viz, cosmograph...)
  blog/                       # 5 blog posts
  docs/                       # Documentation hub (catch-all route)
  playground/                 # Code editor + live preview
  showcase/                   # Community gallery
  plugins/                    # Plugin directory
  benchmarks/                 # Performance comparisons
  embed/                      # Embeddable widget
  landing/                    # Alternative landing page
features/
  World/                      # 3D blockchain visualization
    desktop/                  # Desktop shell (taskbar, windows, start menu)
    ai/                       # WorldChat + component registry
    verification/             # Giza LuminAIR ZK proof UI
    onboarding/               # 7-step walkthrough
    utils/                    # Formatting, accessibility, screenshots
  Agents/                     # Agent visualization (force graph, sidebar, inspector)
  Scrollytelling/             # Scroll-driven home page animations
  Landing/                    # Editorial engine, 3D Giza scene, GLSL shaders
  Demos/                      # Demo datasets and simulation hook
  Tools/                      # Tool demo components (7 visualizations)
packages/
  core/                       # Types, engine, categories, plugins, themes
  providers/                  # Data providers, WebSocketManager, BoundedMap
  react-graph/                # ForceGraph R3F component, PostProcessing
  ui/                         # Design system, tokens, components
  utils/                      # Snapshots, sharing, formatting
  mcp/                        # MCP server (DeFi Llama, cookie.fun, proofs)
  executor/                   # Agent execution server (broken: missing ws dep)
  engine/                     # Framework-agnostic simulation
  react/                      # React wrapper
  vue/                        # Vue 3 wrapper
  svelte/                     # Svelte wrapper
  react-native/               # React Native + Expo
  swarming/                   # CDN/UMD bundle
  swarming-physics/           # Rust/WASM Barnes-Hut
  swarming-collab-server/     # Multiplayer WebSocket relay
  agent-bridge/               # External agent CLI connector
  create-swarming-app/        # Project scaffolder
  create-swarming-plugin/     # Plugin scaffolder
apps/
  playground/                 # Standalone demo app (broken: broken import)
  mobile-demo/                # Expo React Native demo
hooks/                        # useAgentEvents, useAgentProvider, useAgentKeyboardShortcuts
public/
  .well-known/                # Web3 metadata (x402, nostr, DID, wallets, security.txt)
  diagrams/                   # 18 SVG architecture diagrams
scripts/                      # capture-assets.ts, record-demo.sh, pre-commit hook
benchmarks/                   # Performance benchmarking suite (Playwright + Chrome)
docs/                         # Markdown documentation
prompts/                      # 19 AI development prompts
tasks/                        # 41 project task files
```

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, event lifecycle, performance internals |
| [Providers](docs/PROVIDERS.md) | Built-in providers, custom provider guide, key types, tips |
| [Components](docs/COMPONENTS.md) | ForceGraph props, GraphHandle API, UI primitives, design tokens |
| [Deployment](docs/DEPLOYMENT.md) | Vercel, Docker, Netlify, PM2, systemd, env vars |
| [Pages & Routes](docs/PAGES.md) | All 27 pages, 4 API routes, layouts, error boundaries, special files |
| [SDK](SDK.md) | Package descriptions, quick start, template usage guide |
| [Contributing](CONTRIBUTING.md) | Dev setup, code style, PR guidelines, branch naming |
| [Changelog](CHANGELOG.md) | Notable changes grouped by theme |

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## Use Cases

| | Application | Description |
|---|---|---|
| **Web3** | DeFi, NFTs, DAOs | Real-time visualization of on-chain activity, tokenomics, and governance |
| **AI Agents** | Orchestration graphs | Multi-agent task execution, tool calls, reasoning traces, swarm coordination |
| **Infrastructure** | Service meshes | Kubernetes pods, API traffic, CI/CD pipelines, log clustering |
| **Social** | Interaction networks | Chat flows, follow graphs, content virality cascades |
| **Finance** | Trading activity | Order flow, liquidity movements, whale detection, market microstructure |
| **Blockchain** | Transaction flows | DEX swaps on Ethereum/Base/Solana, token launches, bridge messages |
| **ZK Proofs** | Verification | STARK proof verification with Giza LuminAIR integration |
| **IoT** | Sensor networks | Device telemetry, fleet tracking, energy grid flows |

<img src="docs/assets/svg/gradient-divider.svg" alt="" width="100%" />

<br/>

## When to Use swarming (and When Not To)

| Scenario | Recommended | Rationale |
|----------|-------------|----------|
| Real-time streaming data (WebSocket, SSE) | **Yes** | Provider layer handles connection lifecycle, backpressure, and event merging natively |
| Graphs with 1,000–10,000+ nodes at 60fps | **Yes** | GPU-instanced rendering — $O(1)$ draw calls regardless of node count |
| AI agent orchestration visualization | **Yes** | Purpose-built task DAG renderer with tool call tracing and reasoning state |
| Onchain activity across multiple L1/L2 chains | **Yes** | Pre-built providers for Solana, Ethereum, Base with automatic event categorization |
| Static graphs under 100 nodes | **No** | D3, sigma.js, or vis.js are simpler — swarming's GPU pipeline is unnecessary overhead |
| 2D flowcharts or directed diagrams | **No** | Use Mermaid, Graphviz, or ReactFlow — swarming is optimized for force-directed 3D |
| Headless / server-side graph computation | **No** | Requires WebGL context — browser-only |
| Mobile-first without WebGL | **Partial** | React Native wrapper available; WebGL support varies across mobile GPUs |

## Community

swarming is open to contributions. Areas where contributions have the highest impact:

- **New data providers** — Arbitrum, Polygon, Bitcoin Ordinals, or any non-blockchain event source
- **GPU compute** — WebGPU compute shaders for force simulation, Web Worker offloading
- **Framework bindings** — Vue, Svelte, React Native wrapper improvements
- **Accessibility** — keyboard navigation, screen reader support, high-contrast themes
- **Testing** — unit and integration tests for core simulation and provider modules

The most valuable contribution is a **worked example**: run swarming on your own data, document the result, and submit it to the [Showcase Gallery](https://swarming.dev/showcase).

<a href="CONTRIBUTING.md">Contributing Guide</a> · <a href="https://swarming.dev/showcase">Showcase Gallery</a>

<img src="docs/assets/svg/footer-wave.svg" alt="" width="100%" />

<p align="center">
  <a href="https://star-history.com/#nirholas/visualize-web3-realtime&Date"><img src="https://api.star-history.com/svg?repos=nirholas/visualize-web3-realtime&type=Date" alt="Star History Chart" width="600" /></a>
</p>

<p align="center">
  MIT License · Built by <a href="https://github.com/nirholas">@nirholas</a>
</p>
