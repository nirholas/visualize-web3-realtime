# Contributing to Swarming

We love contributions! Whether it's a bug fix, new feature, documentation improvement, or a typo fix — every contribution matters. Here's how to get started.

---

## Quick Start (5 minutes)

```bash
git clone https://github.com/nirholas/swarming.world.git
cd swarming.world
npm install
npm run dev
```

Open **http://localhost:3100** to see the dev server with live data.

```bash
# Alternative: mock data mode (no external connections needed)
npm run dev:playground
```

### Verify everything works

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript across all packages
npm run build       # Production build
```

---

## Project Structure

This is a monorepo with npm workspaces:

```
packages/
├── core/             # Types, engine, provider interface (0 React deps)
├── react-graph/      # <ForceGraph /> 3D component
├── providers/        # Data provider implementations
├── ui/               # Design system (tokens, theme, components)
├── utils/            # Screenshots, sharing, formatters
├── executor/         # Agent executor backend (Node.js)
├── mcp/              # MCP server (DeFi Llama, cookie.fun, proof registry)

app/                  # Next.js 14 reference app (App Router)
features/             # Feature modules for the reference app
apps/playground/      # Standalone demo app
```

### Dependency rules

- `core` has **zero** React dependencies — keep it that way
- `react-graph` depends on `core` only
- `providers` depends on `core` only
- `ui` depends on `core` only
- `utils` depends on `core` only
- Feature modules in `features/` can import from any `@web3viz/*` package

---

## What to Work On

Not sure where to start? Here are some options:

- **`good-first-issue`** — Beginner-friendly tasks with clear guidance and mentorship
- **`help-wanted`** — Medium-complexity tasks that need community help
- **Roadmap items** — Check [GitHub Discussions](https://github.com/nirholas/swarming.world/discussions/categories/ideas) for bigger features

### High-Impact Areas

| Area | Examples |
|------|----------|
| **New providers** | Ethereum DEX (Uniswap V3, Curve), L2 chains (Arbitrum, Base), Bitcoin (Ordinals, Runes), non-blockchain (GitHub events, Kubernetes) |
| **Performance** | WebGPU compute shaders, Web Worker offloading, LOD for distant nodes |
| **Accessibility** | Keyboard navigation, screen reader support, high contrast theme, reduced motion |
| **Mobile** | Touch gestures, responsive layout, mobile GPU budgets |
| **Tests** | Unit tests for core utilities, integration tests for providers |
| **Documentation** | API docs, tutorial improvements, new demo templates |

---

## Making Changes

### 1. Fork and branch

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/swarming.world.git
cd swarming.world
git remote add upstream https://github.com/nirholas/swarming.world.git
git checkout -b feat/my-feature
```

### 2. Branch naming

```
feat/short-description      # New features
fix/short-description       # Bug fixes
docs/short-description      # Documentation
refactor/short-description  # Refactoring
test/short-description      # Tests
```

### 3. Make your changes

Follow the code style guidelines below, then verify:

```bash
npm run lint        # Must pass
npm run typecheck   # Must pass
npm run build       # Must pass
```

### 4. Commit with a descriptive message

Use [conventional commits](https://www.conventionalcommits.org/):

```
feat: add Ethereum provider
fix: prevent duplicate WebSocket connections
docs: add provider creation guide
refactor: extract spatial hash to core package
test: add unit tests for BoundedMap
```

### 5. Open a PR

Push your branch and open a pull request against `main`. Fill out the PR template — describe what changed, why, and how to test it. Include screenshots for visual changes.

---

## Code Style

- **TypeScript strict mode** — no `any` types, no `@ts-ignore`
- **Functional components** with hooks
- **Tailwind CSS** for app-level styling (`app/`, `features/`)
- **Inline styles** with CSS custom properties for theming in `packages/ui`
- **IBM Plex Mono** is the primary typeface
- Memoize components with `React.memo` when they receive stable props
- Use `useRef` over `useState` for values that don't trigger re-renders
- Descriptive variable names — no single-letter variables outside loops

### File conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | `PascalCase.tsx` | `ForceGraph.tsx` |
| Hooks | `useCamelCase.ts` | `useGraphData.ts` |
| Types/utilities | `camelCase.ts` | `shared.ts` |
| Tests | `*.test.ts(x)` | `BoundedMap.test.ts` |

One component per file. Colocated sub-components are fine. Each package exports via `src/index.ts`.

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required | Default | Description |
|---|---|---|---|
| **AI** | | | |
| `ANTHROPIC_API_KEY` | No | — | Claude API key for `/world` AI chat |
| **Blockchain Providers** | | | |
| `NEXT_PUBLIC_SOLANA_WS_URL` | No | — | Solana RPC WebSocket (e.g. Helius, Alchemy) |
| `NEXT_PUBLIC_ETH_WS_URL` | No | `wss://ethereum-rpc.publicnode.com` | Ethereum RPC WebSocket |
| `NEXT_PUBLIC_BASE_WS_URL` | No | `wss://base-rpc.publicnode.com` | Base chain RPC WebSocket |
| **SperaxOS Agent API** | | | |
| `NEXT_PUBLIC_SPERAXOS_WS_URL` | No | `wss://api.speraxos.io/agents/v1/stream` | Agent event WebSocket endpoint |
| `NEXT_PUBLIC_SPERAXOS_API_KEY` | No | — | SperaxOS API key (mock mode if empty) |
| `NEXT_PUBLIC_AGENT_MOCK` | No | `true` | Set to `false` to use real agent data |
| **Executor** | | | |
| `EXECUTOR_URL` | No | `http://localhost:8765` | Executor backend URL (used by `/api/executor` proxy) |
| `EXECUTOR_PORT` | No | `8765` | Executor WebSocket server port |
| `EXECUTOR_MAX_AGENTS` | No | `5` | Max concurrent agents |
| `SPERAXOS_URL` | No | `https://api.speraxos.io` | SperaxOS API base URL (executor) |
| `SPERAXOS_API_KEY` | No | — | SperaxOS API key (executor) |
| `STATE_PATH` | No | `./data/executor.db` | Executor state database path |

The app works without any env vars — PumpFun data streams need no authentication.

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload (port 3100) |
| `npm run dev:playground` | Dev with mock data (no external deps) |
| `npm run build` | Production build |
| `npm run lint` | ESLint checks |
| `npm run typecheck` | TypeScript type checking |

---

## Pull Request Guidelines

1. **Keep PRs focused** — one feature or fix per PR
2. **Run all checks** before pushing (`npm run lint && npm run typecheck && npm run build`)
3. **Write a clear description** — what changed, why, and how to test
4. **Include screenshots** for visual changes (the app is a 3D visualization — visuals matter)
5. **Update documentation** if you change public APIs
6. **Respond to review feedback** promptly — we aim to merge within 24 hours

---

## Recognition

We value every contribution and make sure contributors are recognized:

- **All contributors** are listed in the README using the [all-contributors](https://allcontributors.org/) specification
- **`@contributor` role** in Discord after your first merged PR
- **Monthly Contributor Spotlight** in Discord `#announcements`
- **Yearly Top Contributors** acknowledgment in the README and release notes

---

## Getting Help

- **Issues** — [Open an issue](https://github.com/nirholas/swarming.world/issues) for bugs or feature requests
- **Discussions** — [Start a discussion](https://github.com/nirholas/swarming.world/discussions) for questions or ideas
- **Discord** — Join the community for real-time help

We're happy to help! Don't hesitate to ask questions — there are no dumb questions.
