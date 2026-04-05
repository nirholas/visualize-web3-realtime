<p align="center">
  <img src="https://img.shields.io/badge/3D-Force%20Graph-blueviolet?style=for-the-badge" />
  <img src="https://img.shields.io/badge/React-Three%20Fiber-61dafb?style=for-the-badge" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178c6?style=for-the-badge" />
  <img src="https://img.shields.io/badge/60fps-5%2C000%2B%20nodes-22c55e?style=for-the-badge" />
</p>

# swarming.world

> **Live:** [swarming.world](https://swarming.world/world) · [visualizing.vercel.app](https://visualizing.vercel.app/world)

**Real-time 3D force-graph visualization toolkit for streaming data.**

Plug in any data source — blockchain transactions, AI agent activity, network traffic, social graphs, IoT telemetry — and get a beautiful, interactive, 60fps particle network out of the box.

```bash
npm install @web3viz/core @web3viz/react-graph @web3viz/ui
```

```tsx
import { ForceGraph } from '@web3viz/react-graph';

<ForceGraph topTokens={hubs} traderEdges={edges} />
```

That's it. You have a GPU-accelerated force-directed graph with instanced rendering, mouse repulsion, proximity webs, camera orbits, and spring physics.

---

## Why web3viz?

Most real-time visualization tools make you choose: **pretty or performant, simple API or flexible architecture, one data source or build everything yourself.**

web3viz gives you all of it:

| | web3viz | D3.js | Sigma.js | Cytoscape |
|---|---|---|---|---|
| 3D rendering | Yes (Three.js) | SVG/Canvas only | WebGL 2D | Canvas 2D |
| Nodes at 60fps | 5,000+ | ~500 | ~10,000 (2D) | ~1,000 |
| Streaming data | Built-in provider system | DIY | DIY | DIY |
| React integration | Native (R3F) | Wrapper needed | Wrapper needed | Wrapper needed |
| Camera system | Orbit, focus, tour | N/A | Basic pan/zoom | Pan/zoom |
| Design system included | Yes | No | No | No |
| TypeScript | Strict mode | Partial | Yes | Yes |

---

## Quick Start

### See it live in 30 seconds

```bash
git clone https://github.com/nirholas/swarming.world.git
cd swarming.world
npm install
npm run dev
```

Open **http://localhost:3100** — a live visualization of Solana PumpFun activity starts immediately. No API keys needed.

### Use the mock provider for development

```bash
npm run dev:playground
```

Opens a standalone demo with synthetic data — no blockchain connection required.

---

## Packages

web3viz is a modular monorepo. Use the pieces you need:

| Package | Description | Size |
|---|---|---|
| [`@web3viz/core`](packages/core/) | Types, physics engine, provider interface, category system. Zero React deps. | ~15KB |
| [`@web3viz/react-graph`](packages/react-graph/) | React Three Fiber `<ForceGraph />` component | ~25KB |
| [`@web3viz/providers`](packages/providers/) | Data provider implementations (PumpFun, Mock, + your own) | ~20KB |
| [`@web3viz/ui`](packages/ui/) | Design system — buttons, panels, feeds, filters, theming | ~30KB |
| [`@web3viz/utils`](packages/utils/) | Screenshots, share URLs, formatting helpers | ~8KB |
| [`@web3viz/executor`](packages/executor/) | Standalone agent executor server (WebSocket broadcast) | ~15KB |

### Dependency graph

![Dependency Graph](public/diagrams/dependency-graph.svg)

---

## Build Your Own Provider

The provider system is the core abstraction. Any streaming data source becomes a visualization by implementing one interface:

```typescript
import type { DataProvider } from '@web3viz/core';

class EthereumSwapProvider implements DataProvider {
  readonly id = 'uniswap';
  readonly name = 'Uniswap V3';
  readonly sourceConfig = {
    id: 'ethereum',
    label: 'Ethereum',
    color: '#627EEA',
    icon: '⬡',
  };
  readonly categories = [
    { id: 'swaps', label: 'Swaps', icon: '⇄', color: '#627EEA', source: 'ethereum' },
    { id: 'liquidity', label: 'LP Events', icon: '◈', color: '#8799EE', source: 'ethereum' },
  ];

  connect() {
    const ws = new WebSocket('wss://your-indexer.com/stream');
    ws.onmessage = (msg) => {
      const swap = JSON.parse(msg.data);
      this.emit({
        id: swap.txHash,
        providerId: this.id,
        category: 'swaps',
        timestamp: Date.now(),
        label: `${swap.tokenIn} → ${swap.tokenOut}`,
        amount: swap.amountUSD,
        address: swap.sender,
        tokenAddress: swap.pool,
      });
    };
  }

  // ... implement remaining interface methods
}
```

Register it and the entire UI lights up:

```typescript
import { registerProvider } from '@web3viz/core';

registerProvider(new EthereumSwapProvider());
```

The `<ForceGraph>`, `<StatsBar>`, `<LiveFeed>`, and `<FilterSidebar>` all react automatically.

---

## Use Cases

### Blockchain & DeFi
- **DEX activity** — Uniswap, Jupiter, Raydium swaps in real-time
- **Token launches** — PumpFun, pump.fun clones, fair launch platforms
- **MEV visualization** — Searcher bundles, sandwich attacks, arbitrage paths
- **Cross-chain bridges** — Wormhole, LayerZero message flows
- **NFT minting** — Collection mints as particle clusters
- **Validator networks** — Stake delegation flows, attestation patterns

### AI & Agents
- **Agent orchestration** — Visualize multi-agent task execution (built-in executor)
- **LLM tool calls** — Watch agents invoke tools, spawn sub-agents, reason
- **Swarm behavior** — Multi-agent coordination patterns

### Infrastructure & DevOps
- **API traffic** — Request flows across microservices
- **Log streams** — Error clustering, anomaly detection
- **Kubernetes** — Pod scheduling, service mesh traffic
- **CI/CD pipelines** — Build/deploy event streams

### Social & Communication
- **Chat networks** — Message flows in Discord, Slack, Telegram
- **Social graphs** — Follow/interaction networks
- **Content virality** — Repost/share cascades

### IoT & Sensor Data
- **Device telemetry** — Temperature, pressure, vibration clusters
- **Fleet tracking** — Vehicle/drone position streams
- **Smart grid** — Energy production/consumption flows

---

## The `<ForceGraph>` Component

The visualization engine at the heart of web3viz:

```tsx
import { ForceGraph, type GraphHandle } from '@web3viz/react-graph';

const graphRef = useRef<GraphHandle>(null);

<ForceGraph
  ref={graphRef}
  topTokens={hubs}           // Hub nodes (up to 8)
  traderEdges={edges}        // Participant → hub connections (up to 5,000)
  simulationConfig={{
    hubChargeStrength: -200,
    agentChargeStrength: -8,
    centerStrength: 0.03,
    hubLinkDistance: 25,
    damping: 0.92,
  }}
  background="#0a0a0f"
  showLabels
  showGround={false}
  fov={50}
  cameraPosition={[0, 15, 45]}
/>
```

### Imperative API

```typescript
graphRef.current.focusHub(0);                          // Fly camera to hub
graphRef.current.animateCameraTo([10, 20, 30], origin); // Custom animation
graphRef.current.setOrbitEnabled(true);                 // Auto-rotate
graphRef.current.getHubCount();                         // Number of hubs
```

### Performance

| Metric | Value |
|---|---|
| Max nodes at 60fps | 5,000+ |
| Rendering | InstancedMesh (single draw call per node type) |
| Spatial queries | SpatialHash grid — O(1) neighbor lookups |
| Physics | Framerate-independent damping (`damping^(dt*60)`) |
| Lines | Up to 800 proximity + 320 tether lines |
| Blending | Additive (luminous glow effect) |

---

## UI Components

The design system works standalone or with the graph:

```tsx
import { ThemeProvider, StatsBar, LiveFeed, FilterSidebar } from '@web3viz/ui';

<ThemeProvider theme="dark">
  <StatsBar stats={stats} />
  <LiveFeed events={recentEvents} />
  <FilterSidebar categories={categories} onToggle={handleToggle} />
</ThemeProvider>
```

**Included components:** Button, Pill, Badge, Input, Dialog, Panel, ColorControl, StatsBar, LiveFeed, FilterSidebar, SharePanel, InfoPopover, JourneyOverlay.

**Theming:** CSS custom properties with light/dark presets. Fully customizable via design tokens.

---

## Guided Tours

Built-in camera tour system for onboarding users:

```typescript
import { useJourney } from '@web3viz/ui';

const { start, skip, currentStep } = useJourney({
  steps: [
    { label: 'Welcome', camera: [0, 30, 60], duration: 3000 },
    { label: 'Most Active', focusHub: 0, duration: 4000 },
    { label: 'Explore', freeOrbit: true },
  ],
});
```

---

## Architecture

![Provider Architecture](public/diagrams/provider-architecture.svg)

### Monorepo Structure

```
web3viz/
├── packages/
│   ├── core/              # Types, engine, provider interface (0 deps)
│   ├── react-graph/       # <ForceGraph> component (Three.js + d3-force)
│   ├── providers/         # PumpFun, Mock, and provider hooks
│   ├── ui/                # Design system (tokens, theme, components)
│   ├── utils/             # Screenshots, sharing, formatting
│   └── executor/          # Standalone agent executor (Node.js)
├── apps/
│   └── playground/        # Demo app with mock data
├── app/                   # Reference app: live PumpFun visualizer
│   ├── world/             # Blockchain visualization route
│   ├── agents/            # AI agent monitoring route
│   └── embed/             # Embeddable widget
└── features/              # Feature modules for the reference app
```

---

## Reference App: PumpFun Visualizer

The included reference app connects to live Solana data:

- **2 concurrent WebSocket streams** — PumpPortal (trades) + Solana RPC (claims)
- **6 event categories** — Launches, Agent Launches, Trades, Wallet/GitHub/First Claims
- **AI agent detection** — Regex heuristic on token names
- **Address search** — Find any wallet in the network, camera flies to it
- **Share/export** — Screenshot with metadata overlay, social sharing
- **Guided tour** — 7-step narrated camera walkthrough

### Routes

| Route | Description |
|---|---|
| `/world` | Live PumpFun visualization |
| `/world?address=<addr>` | Auto-search for a Solana address |
| `/agents` | AI agent monitoring dashboard |
| `/embed` | Embeddable widget |

---

## Configuration

### Physics

All simulation parameters are configurable:

| Parameter | Default | Description |
|---|---|---|
| `hubChargeStrength` | `-200` | Hub-to-hub repulsion |
| `agentChargeStrength` | `-8` | Node-to-node repulsion |
| `centerStrength` | `0.03` | Pull toward origin |
| `hubLinkDistance` | `25` | Spring rest length (hubs) |
| `agentLinkDistance` | `5-8` | Spring rest length (nodes) |
| `damping` | `0.92` | Velocity decay per frame |
| `alphaDecay` | `0.01` | Simulation cooling rate |

### Rendering

| Parameter | Default | Description |
|---|---|---|
| Hub count | `8` | Max hub nodes |
| Max particles | `5,000` | Instanced mesh capacity |
| Proximity lines | `800` | Max inter-node lines |
| Tether lines/hub | `40` | Lines connecting nodes to hubs |
| Camera orbit | `0.06 rad/s` | Auto-rotation speed |
| Repulsion radius | `6` | Mouse cursor push radius |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| Framework | Next.js 14 (App Router) |
| Landing Page | Pretext Editorial Engine |
| 3D Engine | Three.js + React Three Fiber |
| Physics | d3-force-3d |
| Animation | Framer Motion |
| Styling | Tailwind CSS + CSS custom properties |
| Language | TypeScript (strict mode) |
| Agent Server | Node.js + SQLite + WebSocket |

---

## Contributing

We welcome contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**High-impact areas:**
- New data providers (Ethereum, Base, Arbitrum, Bitcoin, ...)
- Performance optimizations (WebGPU, compute shaders)
- Mobile/touch interaction improvements
- Accessibility enhancements
- Documentation and examples

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server (port 3100) |
| `npm run dev:playground` | Playground with mock data |
| `npm run dev:executor` | Agent executor server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check across all packages |
| `npm run lint` | ESLint |

---

## License

MIT

---

<p align="center">
  <sub>Built for builders who want their data to look as good as it works.</sub>
</p>
