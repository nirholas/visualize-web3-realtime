# Changelog

Notable changes to web3viz. Entries are grouped by theme rather than strictly by date.

---

## Onboarding & User Experience

- **Onboarding coach marks** — Step-by-step guided overlays for first-time users (`OnboardingCoachMark`, `OnboardingPrompt`)
- **Welcome overlay** — Action buttons and help icon for initial user orientation
- **Desktop shell notifications** — Live feed badge on taskbar icons for new events
- **Dark mode** — Full light/dark theme support via `DarkModeContext` and `ThemeProvider`
- **Window component** — Draggable, resizable windows for the desktop shell UI

## Demo & Data

- **Staggered demo data** — Progressive reveal of tokens and edges for smoother onboarding
- **Static demo data** — Pre-built `topTokens` and `traderEdges` for instant rendering without live connections
- **Mock provider** — `MockProvider` generates synthetic events for development and testing

## Provider System

- **Provider panel** — UI for managing data sources, toggling providers on/off
- **Custom stream provider** — Dynamic addition and removal of user-defined data sources
- **Base & ERC-8004 providers** — WebSocket-based providers for Base chain and ERC-8004 tokens
- **Ethereum provider** — Real-time Uniswap/DEX activity via WebSocket
- **Agent provider** — SperaxOS agent event integration with mock fallback
- **CEX volume provider** — Binance liquidation and trade data
- **Provider auto-play** — Providers connect automatically on mount
- **Category filtering** — Collapsible source groups, per-category toggles
- **BoundedMap/BoundedSet** — Memory-safe bounded collections for streaming data

## Visualization

- **Boot loader removal** — Faster initial load by eliminating boot-loader overhead
- **Camera improvements** — Better default perspective and ground plane visibility
- **Post-processing** — SMAA anti-aliasing, N8AO ambient occlusion, selective bloom
- **Cleaner idle scene** — Removed `Ground` and `ContactShadows` from idle/network scenes
- **Instanced rendering** — Single draw call per node type for 5,000+ nodes at 60fps

## Landing Page

- **Editorial overlay** — Full landing page with dynamic components and branding
- **Giza scene** — 3D shader-based landing with protocol visualization
- **Branding** — Updated project identity and links

## Agent Executor

- **Executor server** — Shared HTTP/WebSocket architecture for agent task orchestration
- **Agent tracker** — Hierarchical agent state management
- **Agent monitoring** — Real-time agent event streaming and visualization

## Tools

- **NVEIL** — 3D data rendering demo
- **Graphistry** — Graph analytics integration
- **AI Office** — AI agent visualization tool
- **Cosmograph** — Large-scale graph visualization

## Infrastructure

- **Turborepo monorepo** — Package-based architecture with shared configs
- **Strict TypeScript** — Full strict mode across all packages
- **Environment variables** — Moved from hardcoded keys to `.env` configuration
- **SVG diagrams** — Architecture diagrams for providers, agents, and executor

## Documentation

- **README** — Comprehensive project overview with quick start, comparison table, API examples
- **SDK.md** — Package descriptions and usage guide
- **CONTRIBUTING.md** — Development setup, code style, PR guidelines
- **Architecture docs** — System design, data flow, performance architecture
- **Provider guide** — Step-by-step guide to building custom providers
- **Component reference** — Full API docs for ForceGraph, UI primitives, and composed components
- **Deployment guide** — Vercel, Docker, self-hosted deployment instructions
