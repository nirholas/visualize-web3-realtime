# Changelog

Notable changes to swarming. Entries are grouped by theme rather than strictly by date.

---

## Core Visualization

- **ForceGraph** — 3D force-directed graph with React Three Fiber + d3-force-3d, instanced meshes for 5,000+ nodes at 60fps
- **PostProcessing** — SMAA anti-aliasing, N8AO ambient occlusion, selective bloom
- **SpatialHash** — O(1) neighbor lookups for proximity lines
- **Camera animations** — Smooth fly-to with configurable duration, orbit controls
- **WebGPU support** — GPU-accelerated Barnes-Hut simulation with auto-detection fallback to WebGL
- **Framerate-independent physics** — Consistent behavior at 30fps through 144fps

## Desktop Shell UI

- **Window manager** — Draggable, resizable windows with minimize/maximize/close
- **Taskbar** — App icons with connection indicator lights and system clock
- **Start Menu** — Grid launcher for 8 window apps (Filters, Live Feed, Stats, AI Chat, Share, Embed, Sources, Timeline)
- **Glassmorphism design** — Frosted glass effects with design tokens
- **localStorage persistence** — Window position, size, z-order survives page reload
- **Keyboard shortcuts** — Escape to close, arrow navigation, Enter to select
- **Connection toasts** — Provider connection status notifications

## Onboarding & User Experience

- **Onboarding coach marks** — 7-step guided walkthrough with localStorage persistence
- **Welcome overlay** — Action buttons and help icon for initial orientation
- **Dark mode** — Full light/dark theme support via `DarkModeContext` and `ThemeProvider`
- **Journey system** — Guided camera animation tours

## Data Providers

- **PumpFun provider** — Solana token launches, trades, bonding curves, whale/sniper detection, claims (7 discriminators)
- **Ethereum provider** — Uniswap V2/V3 swaps, ERC-20 transfers, mints via RPC WebSocket
- **CEX volume provider** — Binance spot trades (10 pairs, >$50K filter) and futures liquidations
- **Agent provider** — Meta-provider detecting AI agents across chains + cookie.fun API polling (15+ framework keywords)
- **Base provider** — Base L2 swaps, transfers, mints
- **ERC-8004 provider** — ERC-8004 token events
- **Mock provider** — Synthetic events for development/testing
- **Custom stream provider** — User-defined WebSocket, REST, SSE, or callback streams
- **Provider panel** — UI for toggling providers on/off with connection status
- **Category filtering** — Collapsible source groups, 34 per-category toggles
- **BoundedMap/BoundedSet** �� LRU-evicting collections preventing memory leaks
- **WebSocketManager** — Exponential backoff reconnection (max 50 retries, 30s max delay), heartbeat keep-alive (30s interval)

## AI Integration

- **World Chat** — Claude Sonnet integration with 5 scene-manipulation tools (sceneColorUpdate, cameraFocus, dataFilter, agentSummary, tradeVisualization)
- **Component registry** — Zod-based schema definitions converted to Anthropic tool definitions
- **Rate limiting** — Per-IP rate limiting on all API routes (20-30 req/60s, memory-bounded)
- **Input sanitization** — Max 50 messages, 4000 chars each, context value sanitization

## Agent Monitoring

- **AgentForceGraph** — 3D agent/task/tool graph with particle trails across 6 tool categories
- **Task inspector** — Full task detail with tool call output, sub-agent tracking, reasoning text
- **Executor banner** — Backend health monitoring (healthy/degraded/offline/reconnecting)
- **Agent sidebar** — Status indicators (active/idle/error), tool category toggles
- **Stats bar** — Active agents, task counts, tool calls/min
- **Timeline scrubber** — 1x/2x/4x playback speed
- **Visual effects** — Spawn particles, completion celebrations, reasoning halos, error shake animations

## Agent Executor

- **Executor server** — HTTP/WebSocket architecture for agent task orchestration
- **AgentManager** — Agent lifecycle (spawn, status transitions, task assignment)
- **ClaudeAgentClient** — Claude SDK wrapper with MCP tool integration
- **TaskQueue** — FIFO task queue with state tracking
- **StateStore** — SQLite persistence via better-sqlite3
- **REST API** — /api/status, /api/agents, /api/tasks, /api/events

## MCP Server

- **protocol_stats** — DeFi Llama TVL for Aave, Uniswap, Compound, MakerDAO, Lido
- **recent_trades** — Real-time trade feed with chain/category filtering
- **agent_activity** — cookie.fun top agent rankings (7-day interval)
- **proof_status** — LuminAIR STARK proof verification results (max 500 entries)

## ZK Proof Verification

- **VerificationModal** — Step-by-step STARK proof verification UI
- **VerifyBadge** — Inline verification indicator
- **useVerification hook** — Wraps @gizatech/luminair-web WASM verifier
- **Graceful degradation** — Demo mode if @gizatech/luminair-web not installed

## Scrollytelling & Landing

- **ScrollytellingPage** — Scroll-driven animations with Framer Motion useScroll
- **DashboardMockup** — Three animated states (data stream, physics particles, chart)
- **FloatingParticles** — React Three Fiber background particles
- **Editorial engine** — Zero-DOM text measurement with Pretext library, animated orbs as text obstacles
- **GizaScene** — Instanced geometry, custom GLSL shaders, 120 agents per protocol

## Demo Scenarios

- **6 domain demos** — GitHub activity, Kubernetes pods, API traffic, AI agents, social networks, IoT sensors
- **Staggered simulation** — Hub reveal (700ms intervals), particle generation (400ms intervals), max 200 particles
- **DemoPageShell** — Shared wrapper with Live/Mock toggle

## Tool Showcases

- **AI Office** — Procedural 3D agents with wander behavior
- **Blockchain Viz** — P2P network simulation
- **Cosmograph** — GPU graph library comparison
- **Creative Coding** — WebGL shader playground
- **Graphistry** — GPU graph intelligence
- **NVEIL** — Volumetric 3D data rendering
- **Reagraph** — React network graph

## Multi-Framework

- **@swarming/engine** — Framework-agnostic simulation
- **@swarming/react** — React wrapper
- **@swarming/vue** — Vue 3 wrapper
- **@swarming/svelte** — Svelte wrapper
- **@swarming/react-native** — React Native + Expo
- **swarming** — CDN/UMD bundle
- **swarming-physics** — Rust/WASM Barnes-Hut (3-5x faster)

## Content Pages

- **Blog** — 5 posts: building viz engine, websocket-to-3d, swarming-vs-alternatives, zero-dom-reads, rendering-5000-particles
- **Docs hub** — 31 documentation sections (Getting Started, Guide, API Reference, Examples, Community)
- **Playground** — Interactive code editor with 5 presets and URL-based sharing
- **Showcase** — Community gallery with filtering, sorting, search
- **Plugins** — Plugin directory (6 built-in + 10 community)
- **Benchmarks** — Performance comparison against 8 graph libraries

## Infrastructure

- **Turborepo monorepo** — npm workspaces with shared configs
- **Strict TypeScript** — Full strict mode across all packages
- **GitHub Actions CI** — Lint, typecheck, build, test, coverage, bundle size check
- **Benchmarks workflow** — Automated performance testing with Playwright
- **Middleware** — CSP headers, HSTS, API key authentication, request logging
- **Security headers** — X-Frame-Options, Permissions-Policy, Content-Security-Policy
- **PWA** — Web app manifest, app icons (192/512px)
- **SEO** — Sitemap (48+ routes), robots.txt, dynamic OG images, JSON-LD structured data
- **Environment variables** — 12 configurable env vars via .env.example
- **SVG diagrams** — 18 architecture diagrams in public/diagrams/

## Documentation

- **README** — Comprehensive project overview with all features, chains, routes, packages, architecture
- **SDK.md** — Package descriptions and usage guide
- **CONTRIBUTING.md** — Development setup, code style, PR guidelines
- **Architecture docs** — System design, data flow, performance architecture, feature modules
- **Provider guide** — Built-in providers, custom provider creation, key types, tips
- **Component reference** — ForceGraph, UI primitives, design tokens, theme system
- **Deployment guide** — Vercel, Docker, Netlify, PM2, systemd, env vars
- **Pages reference** — All 27 pages, 4 API routes, layouts, error boundaries, special files
