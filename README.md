<p align="center">
  <img src="docs/assets/hero.gif" alt="swarming — real-time network visualization" width="800" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@swarming/core"><img src="https://img.shields.io/npm/v/@swarming/core?style=flat-square&color=6366f1" alt="npm version" /></a>
  <a href="https://bundlephobia.com/package/@swarming/react"><img src="https://img.shields.io/bundlephobia/minzip/@swarming/react?style=flat-square&color=22c55e&label=bundle" alt="bundle size" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="license" /></a>
  <a href="https://discord.gg/swarming"><img src="https://img.shields.io/discord/0000000000?style=flat-square&logo=discord&logoColor=white&color=5865F2&label=discord" alt="discord" /></a>
  <a href="https://github.com/nirholas/swarming.world/stargazers"><img src="https://img.shields.io/github/stars/nirholas/swarming.world?style=flat-square&color=f59e0b" alt="stars" /></a>
</p>

<h1 align="center">swarming</h1>

<p align="center">
  <strong>GPU-accelerated real-time network visualization. 5,000+ nodes at 60fps. Any data stream.</strong>
</p>

<p align="center">
  <a href="https://swarming.dev/world"><strong>Live Demo</strong></a> · <a href="docs/"><strong>Documentation</strong></a> · <a href="https://discord.gg/swarming"><strong>Discord</strong></a>
</p>

---

## Get Started in 30 Seconds

```bash
npm install @swarming/core @swarming/react
```

```tsx
import { ForceGraph } from '@swarming/react'

function App() {
  return <ForceGraph nodes={hubs} edges={connections} />
}
```

GPU-accelerated force-directed graph with instanced rendering, mouse repulsion, proximity webs, and spring physics — out of the box.

Or scaffold a full app:

```bash
git clone https://github.com/nirholas/swarming.world.git
cd swarming.world
npm install && npm run dev
```

Open **http://localhost:3100** — live visualization starts immediately. No API keys needed.

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
<strong>Any data source</strong><br />
<sub>Built-in provider system — plug in WebSockets, REST, or custom streams</sub>
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
<strong>Theming & design system</strong><br />
<sub>Full component library with dark/light presets and CSS custom properties</sub>
</td>
<td width="33%" align="center">
<img src="docs/assets/feature-export.gif" alt="Export & share" width="240" /><br />
<strong>Export & share</strong><br />
<sub>Screenshot with metadata overlay, share URLs, and embeddable widget</sub>
</td>
</tr>
</table>

---

## Use Cases

| | Application | Description |
|---|---|---|
| **Infrastructure** | Service meshes | Kubernetes pods, API traffic, CI/CD pipelines, log clustering |
| **AI Agents** | Orchestration graphs | Multi-agent task execution, tool calls, swarm coordination |
| **IoT** | Sensor networks | Device telemetry, fleet tracking, energy grid flows |
| **Social** | Interaction networks | Chat flows, follow graphs, content virality cascades |
| **Finance** | Trading activity | Order flow, liquidity movements, market microstructure |
| **Blockchain** | Transaction flows | DEX swaps, token launches, bridge messages in real-time |

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

| Package | Description |
|---|---|
| [`@swarming/core`](packages/core/) | Types, physics engine, provider interface. Zero React deps. |
| [`@swarming/react`](packages/react-graph/) | `<ForceGraph>` component (Three.js + React Three Fiber) |
| [`@swarming/providers`](packages/providers/) | Data providers (Mock, WebSocket, + build your own) |
| [`@swarming/ui`](packages/ui/) | Design system — buttons, panels, feeds, filters, theming |
| [`@swarming/utils`](packages/utils/) | Screenshots, share URLs, formatting helpers |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| 3D Engine | Three.js + React Three Fiber |
| Physics | d3-force-3d |
| Animation | Framer Motion |
| Styling | Tailwind CSS + CSS custom properties |
| Language | TypeScript (strict mode) |
| Monorepo | npm workspaces |

---

## Documentation

| | |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, performance internals |
| [Providers](docs/PROVIDERS.md) | Build custom data providers |
| [Components](docs/COMPONENTS.md) | ForceGraph + UI component API reference |
| [Deployment](docs/DEPLOYMENT.md) | Vercel, Docker, self-hosted |
| [Contributing](CONTRIBUTING.md) | Dev setup, code style, PR guidelines |
| [Changelog](CHANGELOG.md) | Notable changes |

---

## Community

swarming is MIT-licensed and open to contributions.

**High-impact areas:**
- New data providers (network traffic, IoT, social, blockchain)
- Performance (WebGPU, compute shaders)
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
