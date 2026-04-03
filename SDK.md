# @web3viz — Real-Time Web3 Visualization SDK

A production-grade **monorepo** for building real-time, interactive 3D visualizations of on-chain activity. Ships as reusable npm packages, a design system, and a full reference application.

> **Live demo**: The `/world` route connects to live Solana PumpFun data with zero configuration.

---

## Architecture

```
visualize-web3-realtime/
├── packages/
│   ├── core/           # Pure TS — types, engine, categories, provider interface
│   ├── ui/             # Design system — tokens, theme, primitives, composed components
│   ├── react-graph/    # React Three Fiber force-directed 3D graph component
│   ├── providers/      # Data provider hooks (PumpFun, Mock, useDataProvider)
│   ├── utils/          # Shared utilities (screenshot, share URL, formatters)
│   ├── tsconfig/       # Shared TypeScript configs
│   └── tailwind-config/# Shared Tailwind CSS config with design tokens
├── apps/
│   └── playground/     # Standalone Next.js demo app (uses mock data)
├── app/                # Main Next.js 14 app (live PumpFun data)
├── features/           # Feature modules for the main app
├── hooks/              # Original hooks (being migrated to packages/providers)
└── turbo.json          # Turborepo pipeline config
```

## Packages

### `@web3viz/core`

Pure TypeScript foundation — zero React dependencies.

- **Types**: `Token`, `Trade`, `Claim`, `TopToken`, `TraderEdge`, `GraphNode`, `GraphEdge`, `ShareColors`, `GraphHandle`, `Vec3`
- **Engine**: `ForceGraphSimulation` (configurable d3-force manager), `SpatialHash` (O(1) 3D neighbor lookups)
- **Categories**: Extensible category system with `CATEGORIES`, `CATEGORY_CONFIGS`, `CategoryConfig`, source configs
- **Providers**: `DataProvider` interface, registry (`registerProvider`, `getProvider`), factory (`createProvider`)

```ts
import { ForceGraphSimulation, CATEGORIES, type Token } from '@web3viz/core';
```

### `@web3viz/ui`

Full design system with dark/light theming.

- **Tokens**: Colors (CSS custom properties), typography (IBM Plex Mono), spacing scale, shadows, z-index, transitions
- **Theme**: `ThemeProvider`, `useTheme()`, `createTheme()`, `lightTheme`/`darkTheme` presets
- **Primitives**: `Button`, `Pill`, `Badge`, `Input` (with hex validation), `Dialog`, `Panel`, `ColorControl`
- **Composed**: `FilterSidebar`, `StatsBar`, `LiveFeed`, `SharePanel`, `ShareOverlay`, `InfoPopover`, `JourneyOverlay`, `WorldHeader`

```tsx
import { ThemeProvider, Button, LiveFeed, StatsBar } from '@web3viz/ui';
```

### `@web3viz/react-graph`

React Three Fiber 3D force-directed graph component.

- Instanced rendering (InstancedMesh) for thousands of nodes at 60fps
- Configurable hub layout, spring physics, mouse repulsion
- Imperative `GraphHandle` API (`focusNode`, `resetCamera`, `getCanvas`)
- Full TypeScript props API

```tsx
import { ForceGraph } from '@web3viz/react-graph';

<ForceGraph
  background="#0a0a0f"
  showLabels
  showGround
  simulationConfig={{ alphaDecay: 0.01 }}
/>
```

### `@web3viz/providers`

Data provider implementations and aggregation hooks.

- **`usePumpFun()`** — Live PumpPortal WebSocket (token launches + trades)
- **`usePumpFunClaims()`** — Solana Mainnet claims WebSocket
- **`useDataProvider()`** — Unified data layer with category filtering
- **`MockProvider`** — Generates fake events for development/testing

```tsx
import { useDataProvider, MockProvider } from '@web3viz/providers';
```

### `@web3viz/utils`

Shared utility functions.

- `captureCanvas()` — Screenshot compositing (WebGL + HTML overlay)
- `buildShareUrl()` / `parseShareParams()` — Share URL encoding
- `formatNumber()` / `formatSol()` / `truncateAddress()` — Display formatting
- `debounce()` / `clamp()` / `lerp()` — Math/timing helpers

```ts
import { captureCanvas, formatSol, truncateAddress } from '@web3viz/utils';
```

---

## Quick Start

### Run the main app (live data)

```bash
npm install
npm run dev
```

Open **http://localhost:3100** → redirected to `/world` visualizer.

### Run the playground (mock data)

```bash
npm install
npm run dev:playground
```

Open **http://localhost:3200** — standalone demo with `MockProvider`.

### Build all packages

```bash
npx turbo build
```

### Type-check everything

```bash
npx turbo typecheck
```

---

## Using as a Template

1. **Fork/clone** this repo
2. Delete `app/` and `features/` (the PumpFun-specific app)
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
| Framework | Next.js 14 (App Router) |
| 3D | React Three Fiber + Three.js |
| Physics | d3-force (configurable simulation) |
| Animation | Framer Motion |
| Styling | Tailwind CSS + CSS custom properties |
| Typography | IBM Plex Mono |
| Language | TypeScript 5.5 (strict mode) |
| Data | WebSocket (PumpPortal + Solana Mainnet) |

---

## License

MIT
