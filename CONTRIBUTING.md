# Contributing to web3viz

Thanks for your interest in contributing! This guide covers everything you need to get started.

---

## Development Setup

### Prerequisites

- **Node.js** >= 18
- **npm** >= 10.8.2 (pinned in `engines`)
- **Git**

### Clone and install

```bash
git clone https://github.com/nirholas/swarming.world.git
cd swarming.world
npm install
```

### Run the dev server

```bash
# Live data (connects to PumpPortal + Solana RPC)
npm run dev

# Mock data (no external connections)
npm run dev:playground

# Agent executor backend
npm run dev:executor
```

The main app runs on **http://localhost:3100**, the playground on **http://localhost:3200**.

### Verify everything works

```bash
npm run typecheck   # TypeScript across all packages
npm run lint        # ESLint
npm run build       # Production build
```

---

## Project Structure

This is a **Turborepo monorepo** with npm workspaces:

```
packages/
  core/           # Types, engine, provider interface (0 React deps)
  react-graph/    # <ForceGraph /> 3D component
  providers/      # Data provider implementations
  ui/             # Design system (tokens, theme, components)
  utils/          # Screenshots, sharing, formatters
  executor/       # Agent executor backend (Node.js)
  tsconfig/       # Shared TS configs
  tailwind-config/# Shared Tailwind config

app/              # Next.js 14 reference app (App Router)
features/         # Feature modules for the reference app
apps/playground/  # Standalone demo app
```

### Dependency rules

- `core` has **zero** React dependencies — keep it that way
- `react-graph` depends on `core` only
- `providers` depends on `core` only
- `ui` depends on `core` only
- `utils` depends on `core` only
- Feature modules in `features/` can import from any `@web3viz/*` package

---

## Making Changes

### Branch naming

```
feat/short-description    # New features
fix/short-description     # Bug fixes
docs/short-description    # Documentation
refactor/short-description
```

### Commit messages

Use conventional commits:

```
feat: add Ethereum provider
fix: prevent duplicate WebSocket connections
docs: add provider creation guide
refactor: extract spatial hash to core package
```

### Code style

- **TypeScript strict mode** — no `any` types, no `@ts-ignore`
- **Inline styles** with CSS custom properties for theming (no CSS modules in `packages/ui`)
- **Tailwind CSS** for app-level styling (`app/`, `features/`)
- **IBM Plex Mono** is the primary typeface
- Memoize components with `React.memo` when they receive stable props
- Use `useRef` over `useState` for values that don't trigger re-renders

### File conventions

- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Types/utilities: `camelCase.ts`
- One component per file (colocated sub-components are fine)
- Export barrel files at `src/index.ts` in each package

---

## Pull Requests

1. **Keep PRs focused** — one feature or fix per PR
2. **Run checks before pushing:**
   ```bash
   npm run typecheck && npm run lint && npm run build
   ```
3. **Write a clear description** — what changed, why, and how to test
4. **Include screenshots** for visual changes (the app is a 3D visualization — visuals matter)
5. **Update documentation** if you change public APIs

### PR template

```markdown
## What

Brief description of the change.

## Why

Context and motivation.

## How to test

Steps to verify the change works.

## Screenshots

(if visual changes)
```

---

## High-Impact Contribution Areas

### New data providers

The provider system is the main extensibility point. See [docs/PROVIDERS.md](docs/PROVIDERS.md) for a complete guide. Good candidates:

- **Ethereum DEX** — Uniswap V3, Curve, Balancer
- **L2 chains** — Arbitrum, Optimism, Base, zkSync
- **Bitcoin** — Ordinals, Runes
- **Cross-chain** — Wormhole, LayerZero bridge messages
- **Non-blockchain** — GitHub events, Kubernetes, IoT

### Performance

- WebGPU compute shaders for physics
- Web Worker offloading for d3-force
- LOD (level of detail) for distant nodes
- Frustum culling improvements

### Accessibility

- Keyboard navigation for graph interaction
- Screen reader descriptions of graph state
- High contrast theme
- Reduced motion support

### Mobile

- Touch gesture improvements (pinch zoom, two-finger orbit)
- Responsive layout for `<FilterSidebar>` and `<StatsBar>`
- Performance budgets for mobile GPUs

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SPERAXOS_WS_URL` | No | Agent event WebSocket |
| `NEXT_PUBLIC_SPERAXOS_API_KEY` | No | Agent API key (mock mode if empty) |
| `NEXT_PUBLIC_AGENT_MOCK` | No | `true` for mock agents (default) |
| `EXECUTOR_PORT` | No | Executor server port (default 8765) |

The app works without any env vars — PumpFun data streams need no authentication.

---

## Questions?

Open an issue or start a discussion on GitHub. We're happy to help.
