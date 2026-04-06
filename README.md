<p align="center">
  <img src="docs/assets/hero.gif" alt="Real-time Web3 + AI Agent Visualization" width="800" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@web3viz/core"><img src="https://img.shields.io/npm/v/@web3viz/core?style=flat-square&color=6366f1" alt="npm version" /></a>
  <a href="https://bundlephobia.com/package/@web3viz/react-graph"><img src="https://img.shields.io/bundlephobia/minzip/@web3viz/react-graph?style=flat-square&color=22c55e&label=bundle" alt="bundle size" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="license" /></a>
  <a href="https://discord.gg/your-discord"><img src="https://img.shields.io/discord/0000000000?style=flat-square&logo=discord&logoColor=white&color=5865F2&label=discord" alt="discord" /></a>
  <a href="https://github.com/nirholas/visualize-web3-realtime/stargazers"><img src="https://img.shields.io/github/stars/nirholas/visualize-web3-realtime?style=flat-square&color=f59e0b" alt="stars" /></a>
</p>

<h1 align="center">Real-time Web3 + AI Agent Visualization</h1>

<p align="center">
  <strong>A GPU-accelerated, real-time network visualization engine for Web3 and AI agents, built with Next.js 14, React Three Fiber, and D3-force. Capable of rendering over 5,000 nodes at 60fps.</strong>
</p>

<p align="center">
  <a href="https://www.web3viz.dev/world"><strong>Live Demo</strong></a> · <a href="docs/"><strong>Documentation</strong></a> · <a href="https://discord.gg/your-discord"><strong>Discord</strong></a>
</p>

---

## Get Started in 30 Seconds

```bash
npm install @web3viz/core @web3viz/react-graph
```

```tsx
import { ForceGraph } from '@web3viz/react-graph'

function App() {
  const nodes = //... your nodes
  const edges = //... your edges
  return <ForceGraph nodes={nodes} edges={edges} />
}
```

GPU-accelerated force-directed graph with instanced rendering, mouse repulsion, proximity webs, and spring physics — out of the box.

Or scaffold the full application:

```bash
git clone https://github.com/nirholas/visualize-web3-realtime.git
cd visualize-web3-realtime
npm install && npm run dev
```

Open **http://localhost:3100** — the live visualization will start immediately. No API keys needed for the default providers.

---

## Features

<table>
<tr>
<td width="33%" align="center">
<img src="docs/assets/feature-performance.gif" alt="60fps performance" width="240" /><br />
<strong>60fps @ 5,000 nodes</strong><br />
<sub>InstancedMesh rendering with spatial hashing for O(1) lookups</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-websocket.gif" alt="Any data source" width="240" /><br />
<strong>Real-time Data Providers</strong><br />
<sub>Built-in provider system for WebSockets, REST, or any custom data stream</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-physics.gif" alt="Force-directed physics" width="240" /><br />
<strong>Force-directed 3D physics</strong><br />
<sub>d3-force-3d with framerate-independent damping and configurable springs</sub>
</td>
</tr>
<tr>
<td width="33%" align="center">
<img src="docs/assets/feature-interaction.gif" alt="Mouse interaction" width="240" /><br />
<strong>Rich interaction</strong><br />
<sub>Hover, click, drag, orbit, zoom. Mouse-repulsion physics. Camera fly-to.</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-themes.gif" alt="Themes" width="240" /><br />
<strong>Theming & Design System</strong><br />
<sub>Full component library with dark/light presets and CSS custom properties</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-export.gif" alt="Export & share" width="240" /><br />
<strong>Export & share</strong><br />
<sub>Screenshot with metadata overlay, share URLs, and embeddable widget</sub>
</td>
</tr>
<tr>
<td width="33%" align="center">
<img src="docs/assets/feature-collab.gif" alt="Multiplayer collaboration" width="240" /><br />
<strong>Multiplayer collaboration</strong><br />
<sub>Room-based cursors, camera sync, shared annotations, presenter mode</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-editor.gif" alt="Visual graph editor" width="240" /><br />
<strong>Visual graph editor</strong><br />
<sub>Create and edit nodes/edges, undo/redo, import/export JSON, Mermaid, CSV, SVG</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-ai.gif" alt="AI chat assistant" width="240" /><br />
<strong>AI chat assistant</strong><br />
<sub>Natural language graph control via Claude Sonnet with tool-use integration</sub>
</td>
</tr>
<tr>
<td width="33%" align="center">
<img src="docs/assets/feature-agents.gif" alt="Agent monitoring" width="240" /><br />
<strong>Agent monitoring</strong><br />
<sub>3D visualization of AI agent orchestration, tasks, and tool calls</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-wasm.gif" alt="WASM physics" width="240" /><br />
<strong>WASM physics engine</strong><br />
<sub>Rust Barnes-Hut simulation compiled to WebAssembly — 3-5× faster than JS</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-multiframework.gif" alt="Multi-framework" width="240" /><br />
<strong>Multi-framework</strong><br />
<sub>React, Vue, Svelte, React Native, vanilla JS, and CDN embed</sub>
</td>
</tr>
</table>

---

## Multi-Framework Support

swarming runs everywhere — pick your stack:

**React**
```tsx
import { ForceGraph } from '@swarming/react'

function App() {
  return <ForceGraph nodes={hubs} edges={connections} />
}
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

export default () => <SwarmingView nodes={hubs} edges={connections} />
```

---

## Multiplayer Collaboration

Real-time multi-user graph editing powered by `swarming-collab-server`:

- **Room-based sessions** — create or join a room, see other users' cursors live in 3D
- **Camera sync** — follow a peer's viewpoint or broadcast yours in presenter mode
- **Shared annotations** — collaboratively annotate nodes and edges
- **Reconnection** — automatic re-join with state recovery

Start the relay server:
```bash
npx swarming-collab-server   # WebSocket relay on port 4444
```

---

## AI Integration

### World Chat

An AI assistant embedded in the visualization that can control the graph through natural language. Powered by Claude Sonnet with tool-use — ask it to focus on a node, filter categories, change colors, or explain what's happening.

### MCP Server

Model Context Protocol server (`@web3viz/mcp`) exposes live data to AI agents:

| Resource | Description |
|---|---|
| `protocol_stats` | DeFi Llama TVL and protocol metrics |
| `recent_trades` | Real-time trade feed |
| `agent_activity` | cookie.fun agent rankings |
| `proof_status` | LuminAIR STARK proof verification status |

### Agent Monitoring

Full agent orchestration dashboard at `/agents` — 3D force graph of agents, tasks, tool calls, and tokens. Includes sidebar, stats bar, timeline, live feed, and task inspector.

---

## ZK Proof Verification

Built-in Giza LuminAIR integration for zero-knowledge proof verification. The `VerifyBadge` and `VerificationModal` components provide step-by-step STARK proof verification directly in the UI. Gracefully degrades to demo mode if `@gizatech/luminair-web` is not installed.

---

## Visual Graph Editor

Full-featured graph editing mode:

- Create, delete, and drag nodes and edges
- Inline label editing and context menus
- Undo/redo with full history (`Ctrl+Z` / `Ctrl+Shift+Z`)
- Marquee selection and copy/paste
- Auto-layout algorithms
- Import/export: JSON, Mermaid, CSV, SVG

---

## Built-in Data Providers

| Provider | Chain / Source | Data |
|---|---|---|
| **Ethereum** | Ethereum | Uniswap / DEX swaps and liquidity events |
| **Base** | Base | Real-time on-chain activity |
| **Solana PumpFun** | Solana | Token launches, trades, and claims tracking |
| **ERC-8004** | Multi-chain | ERC-8004 token events |
| **CEX Volume** | Binance | Liquidations and trade data |
| **Mock** | — | Synthetic events for development and testing |

Build your own: [docs/PROVIDERS.md](docs/PROVIDERS.md)

---

## Demo Scenarios

6 pre-built demos at [`/demos`](https://swarming.dev/demos) with mock and live data:

| Demo | Description |
|---|---|
| AI Agents | Multi-agent orchestration visualization |
| API Traffic | Service mesh and API call monitoring |
| GitHub | Repository activity and contributor networks |
| IoT | Sensor networks and device telemetry |
| Kubernetes | Pod topology, traffic, and scaling events |
| Social Networks | Interaction graphs and content cascades |

---

## Desktop Shell UI

A windowed desktop-style interface for power users:

- Draggable and resizable panels
- Taskbar with app icons, start menu, and system tray
- Connection status toasts
- Keyboard shortcuts
- Onboarding coach marks for first-time users

---

## Use Cases

| | Application | Description |
|---|---|---|
| **Web3** | DeFi, NFTs, DAOs | Real-time visualization of on-chain activity, tokenomics, and governance |
| **AI Agents** | Orchestration graphs | Multi-agent task execution, tool calls, swarm coordination |
| **Infrastructure** | Service meshes | Kubernetes pods, API traffic, CI/CD pipelines, log clustering |
| **Social** | Interaction networks | Chat flows, follow graphs, content virality cascades |
| **Finance** | Trading activity | Order flow, liquidity movements, market microstructure |
| **Blockchain** | Transaction flows | DEX swaps on Ethereum/Base/Solana, token launches, bridge messages |
| **ZK Proofs** | Verification | STARK proof verification with Giza LuminAIR integration |
| **IoT** | Sensor networks | Device telemetry, fleet tracking, energy grid flows |

---

## Performance

swarming uses InstancedMesh (single draw call per node type), SpatialHash grids, and framerate-independent physics.

| | swarming | d3-force (SVG) | sigma.js | cytoscape |
|---|---|---|---|---|
| **1,000 nodes** | 60 fps | 45 fps | 55 fps | 40 fps |
| **5,000 nodes** | 60 fps | 12 fps | 30 fps | 8 fps |
| **10,000 nodes** | 45 fps | 3 fps | 15 fps | crash |
| **Rendering** | WebGL 3D | SVG / Canvas | WebGL 2D | Canvas 2D |
| **Streaming data** | Built-in | DIY | DIY | DIY |
| **React native** | Yes (R3F) | Wrapper | Wrapper | Wrapper |

---

## API Overview

### `<ForceGraph>` Props

| Prop | Type | Description |
|---|---|---|
| `nodes` | `HubNode[]` | Hub nodes (up to 8) |
| `edges` | `Edge[]` | Connections between nodes (up to 5,000) |
| `simulationConfig` | `SimulationConfig` | Physics parameters (charge, damping, springs) |
| `background` | `string` | Scene background color |
| `showLabels` | `boolean` | Toggle hub labels |
| `showGround` | `boolean` | Toggle ground plane |
| `fov` | `number` | Camera field of view |
| `cameraPosition` | `[x, y, z]` | Initial camera position |

### Imperative Handle

```tsx
const ref = useRef<GraphHandle>(null)

ref.current.focusHub(0)                            // Fly to hub
ref.current.animateCameraTo([10, 20, 30], origin)  // Custom fly-to
ref.current.setOrbitEnabled(true)                   // Auto-rotate
```

Full API reference: [docs/COMPONENTS.md](docs/COMPONENTS.md)

---

## Build Your Own Provider

Any streaming data source becomes a visualization:

```typescript
import type { DataProvider } from '@swarming/core'

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

---

## Packages

### Core

| Package | Description |
|---|---|
| [`@swarming/core`](packages/core/) | Types, physics engine, provider interface. Zero React deps. |
| [`@swarming/engine`](packages/engine/) | Framework-agnostic engine — vanilla JS API with `createSwarming()` |
| [`swarming-physics`](packages/swarming-physics/) | WASM Barnes-Hut force simulation (Rust → WebAssembly, 3-5× faster) |
| [`@swarming/providers`](packages/providers/) | Data providers (Mock, WebSocket, + build your own) |
| [`@swarming/ui`](packages/ui/) | Design system — buttons, panels, feeds, filters, theming |
| [`@swarming/utils`](packages/utils/) | Screenshots, share URLs, formatting helpers |

### Framework Wrappers

| Package | Description |
|---|---|
| [`@swarming/react`](packages/react-graph/) | `<ForceGraph>` component (Three.js + React Three Fiber) |
| [`@swarming/vue`](packages/vue/) | Vue 3 wrapper for the swarming engine |
| [`@swarming/svelte`](packages/svelte/) | Svelte wrapper for the swarming engine |
| [`@swarming/react-native`](packages/react-native/) | React Native + Expo with GL renderer, haptics, and gestures |
| [`swarming`](packages/swarming/) | CDN/UMD bundle — zero-build embed via `<script>` tag |

### Collaboration & Tooling

| Package | Description |
|---|---|
| [`swarming-collab-server`](packages/swarming-collab-server/) | WebSocket relay for multiplayer (rooms, cursors, presenter mode) |
| [`@web3viz/mcp`](packages/mcp/) | MCP server — DeFi Llama, cookie.fun, proof registry for AI agents |
| [`create-swarming-app`](packages/create-swarming-app/) | CLI scaffolder — `npx create-swarming-app` |
| [`create-swarming-plugin`](packages/create-swarming-plugin/) | Plugin project scaffolder |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| 3D Engine | Three.js + React Three Fiber |
| Physics | d3-force-3d + WASM Barnes-Hut (Rust) |
| Animation | Framer Motion |
| Post-processing | SMAA, N8AO ambient occlusion, selective bloom |
| Styling | Tailwind CSS + CSS custom properties |
| AI | Claude Sonnet (tool-use), Model Context Protocol |
| ZK Proofs | Giza LuminAIR (STARK verification) |
| Collaboration | WebSocket relay with room-based sync |
| Language | TypeScript (strict mode) |
| Monorepo | npm workspaces + Turborepo |

---

## Pages & Routes

| Route | Description |
|---|---|
| `/world` | Main 3D visualization with live data providers |
| `/agents` | Agent monitoring dashboard |
| `/demos/*` | 6 demo scenarios (AI agents, API traffic, GitHub, IoT, K8s, social) |
| `/embed` | Embeddable widget with URL param customization |
| `/tools/*` | Tool comparison pages (Cosmograph, Graphistry, and more) |
| `/showcase` | Community showcase gallery with filtering and search |
| `/plugins` | Plugin directory |
| `/benchmarks` | Interactive benchmark results viewer |
| `/blog` | Blog with markdown content |

---

## Documentation

| | |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, performance internals |
| [Providers](docs/PROVIDERS.md) | Build custom data providers |
| [Components](docs/COMPONENTS.md) | ForceGraph + UI component API reference |
| [Deployment](docs/DEPLOYMENT.md) | Vercel, Docker, self-hosted |
| [SDK](SDK.md) | Package descriptions and usage guide |
| [Contributing](CONTRIBUTING.md) | Dev setup, code style, PR guidelines |
| [Changelog](CHANGELOG.md) | Notable changes |

---

## Community

swarming is MIT-licensed and open to contributions.

**High-impact areas:**
- New data providers (network traffic, IoT, social, blockchain)
- Performance (WebGPU, compute shaders)
- Framework wrappers (Vue, Svelte, React Native improvements)
- Collaboration features and multiplayer UX
- Mobile/touch interaction
- Accessibility
- Documentation and examples

If swarming is useful to you, consider [starring the repo](https://github.com/nirholas/swarming.world) — it helps others discover the project and motivates continued development.

<a href="https://discord.gg/swarming">Join the Discord</a> · <a href="CONTRIBUTING.md">Contributing Guide</a> · <a href="https://swarming.dev">Showcase Gallery</a>

---

## Sponsors

<p align="center">
  <sub>Interested in sponsoring? See <a href=".github/FUNDING.yml">FUNDING.yml</a> or reach out on Discord.</sub>
</p>

---

<p align="center">
  MIT License · Built by <a href="https://github.com/nirholas">@nirholas</a>
</p>

<p align="center">
  <sub>See your data swarm.</sub>
</p>
