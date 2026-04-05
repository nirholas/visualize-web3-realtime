# CLAUDE.md

## Project Overview

Real-time Web3 + AI agent visualization built with Next.js 14, React Three Fiber, and D3-force. Monorepo with npm workspaces.

## Build & Run

```bash
npm run build        # Build the main web app (runs next build)
npm run dev          # Dev server on port 3100
npm run lint         # ESLint
npm run typecheck    # TypeScript check (root tsconfig, excludes broken packages)
npm test             # Run all tests (vitest)
npm test -- --run packages/core  # Run tests for a specific package
```

**Do NOT use `turbo run build`** — `packages/executor` (missing `ws` dep) and `apps/playground` (broken import) will fail. Use `npm run build` which only builds the main Next.js app.

To type-check a specific package:
```bash
npx tsc --noEmit -p packages/providers/tsconfig.json
```

## Project Structure

```
app/                    # Next.js App Router (pages, API routes)
  api/executor/         # Proxy to executor backend
  api/world-chat/       # Claude Sonnet chat endpoint
features/
  World/                # 3D visualization — ForceGraph, StatsBar, Timeline, etc.
    desktop/            # Desktop shell UI (taskbar, windows)
    utils/              # shared.ts (hex, formatting), accessibility.ts
    verification/       # Giza LuminAIR verification components
  Agents/               # Agent visualization — AgentForceGraph, AgentSidebar
packages/
  core/                 # Core types and interfaces (see packages/core/CLAUDE.md)
  providers/            # Data providers (see packages/providers/CLAUDE.md)
  react-graph/          # React graph components
  ui/                   # Shared UI components
  utils/                # Shared utilities
  mcp/                  # MCP server (DeFi Llama, cookie.fun, proof registry)
  executor/             # ⚠️ BROKEN — missing ws dep (see README)
apps/
  playground/           # ⚠️ BROKEN — broken import (see README)
```

## Verification After Changes

Always verify your changes with:
```bash
npm run build          # Must pass
npm run typecheck      # Must pass
npm test               # Must pass
```

## Key Conventions

- Path aliases: `@/*` maps to project root, `@web3viz/<pkg>` maps to `packages/<pkg>/src`
- `tsconfig.json` excludes: `packages/executor`, `apps/playground`, `providers`, `temp`, `extracted`, `scripts`
- Provider infrastructure uses `BoundedMap`/`BoundedSet` (LRU-evicting) — do not use unbounded Maps/Sets for caches
- `WebSocketManager` in `packages/providers/src/shared/` handles reconnection with exponential backoff
- Verification components use inline styles (no Tailwind dependency)
- `@gizatech/luminair-web` degrades gracefully if not installed (demo mode)
- All external data must be validated with `packages/providers/src/shared/validate.ts` helpers

## Testing

Tests use vitest with jsdom. Config in `vitest.config.ts`. Tests live in `__tests__/` directories adjacent to source.

Coverage targets: `packages/core/src`, `packages/providers/src`, `packages/utils/src`, `features/World/utils`

## Code Style

- TypeScript strict mode
- React functional components with hooks
- Tailwind CSS for styling (except verification components)
- No default exports for non-page components
