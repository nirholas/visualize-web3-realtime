# Pages & Routes

Complete reference for every page, API route, and special file in the Next.js App Router (`app/` directory).

---

## Page Routes (27 pages)

### `/` — Home

- **File:** `app/page.tsx`
- **Description:** Scrollytelling home page. Dynamically imports `ScrollytellingPage` (no SSR). Features scroll-driven animations with three dashboard mockup states (data stream, physics particles, chart visualization), hero section, floating particle background (React Three Fiber), and footer CTA.

### `/landing` — Alternate Landing

- **File:** `app/landing/page.tsx`
- **Description:** Identical to home — renders `LandingEngine` with its own layout/metadata. Metadata: _"Swarming — Real-time Data Visualization Library for React & Three.js"_.

### `/world` — Real-time 3D Visualization

- **File:** `app/world/page.tsx`
- **Description:** Core product page. Real-time 3D force-directed graph of blockchain activity (Solana, Ethereum, Base). Desktop shell UI with draggable windows, stats bar, timeline, share panel, and onboarding journey overlay.
- **Key components:** `ForceGraph`, `DesktopShell`, `DarkModeProvider`, `InfoPopover`, `JourneyOverlay`, `SharePanel`, `CustomStreamProvider`
- **Data:** `useProviders` hook connects live WebSocket streams
- **Metadata:** _"Real-time Network Visualization — Force Directed Graph React"_

### `/agents` — AI Agent Dashboard

- **File:** `app/agents/page.tsx`
- **Description:** AI agent visualization dashboard. 3D force graph of autonomous agents executing tasks with a sidebar, live event feed, timeline, stats bar, and task inspector panel.
- **Key components:** `AgentForceGraph`, `AgentSidebar`, `AgentStatsBar`, `AgentLiveFeed`, `AgentTimeline`, `ExecutorBanner`, `TaskInspectorPanel`
- **Data:** `useAgentProvider`, `useAgentKeyboardShortcuts`
- **Metadata:** _"AI Agent Visualization — Monitor Autonomous Agents in Real Time"_

### `/embed` — Embeddable Widget

- **File:** `app/embed/page.tsx`
- **Description:** Stripped-down force graph for iframe embedding. Supports URL query parameters for customization.
- **Query params:** `?theme=`, `?bg=`, `?maxNodes=`, `?labels=`, `?watermark=`
- **Key components:** `ForceGraph`, `useProviders`
- **SEO:** `robots: noindex/nofollow`

### `/playground` — Code Playground

- **File:** `app/playground/page.tsx`
- **Description:** Interactive code playground with split-pane editor/preview, preset selector, controls panel, and sharing via URL hash.
- **Key components:** `PlaygroundEditor`, `PlaygroundPreview`, `PresetSelector`, `ShareButton`, `ControlsPanel`

### `/blog` — Blog Index

- **File:** `app/blog/page.tsx`
- **Description:** Blog listing page. Grid of posts with tags, reading time, and dates.
- **Metadata:** _"Blog — Swarming"_

### `/blog/[slug]` — Blog Post (dynamic)

- **File:** `app/blog/[slug]/page.tsx`
- **Dynamic:** Yes — `[slug]` param
- **Description:** Individual blog post. Dynamically loads a content component per slug. Uses `generateStaticParams` and `generateMetadata` for static generation.
- **Known slugs:** `swarming-vs-alternatives`, `websocket-to-3d`, `zero-dom-reads`, `building-realtime-viz-engine`, `rendering-5000-particles`

### `/docs/[[...slug]]` — Documentation Hub (catch-all)

- **File:** `app/docs/[[...slug]]/page.tsx`
- **Dynamic:** Yes — optional catch-all `[[...slug]]`
- **Description:** Documentation hub. Renders the docs index at `/docs` or a specific doc page at any nested path. Uses navigation sidebar, content loader, and prev/next links.
- **Key components:** `DocsShell`, `loadContent`, `getAllSlugs`, `docsNavigation`
- **Metadata:** Title template: _"%s | swarming.docs"_

### `/plugins` — Plugin Directory

- **File:** `app/plugins/page.tsx`
- **Description:** Browsable catalog of data source, theme, and renderer plugins with search and filtering.

### `/showcase` — Community Showcase

- **File:** `app/showcase/page.tsx`
- **Description:** Filterable, sortable grid of community projects. Loads from `showcase.json` data.
- **Key components:** `ShowcaseGrid`, `CategoryFilter`, `SubmitButton`

### `/benchmarks` — Performance Benchmarks

- **File:** `app/benchmarks/page.tsx`
- **Description:** Performance comparison table of swarming vs d3-force, Sigma, Cytoscape, vis-network, force-graph, and ngraph at various node counts. Displays FPS, memory, and timing metrics.
- **Metadata:** _"Performance Benchmarks — Swarming"_

### `/tools` — Tools Hub

- **File:** `app/tools/page.tsx`
- **Description:** Index page with a card grid linking to all visualization tool demos, grouped by category.
- **Metadata:** _"Visualization Tools — GPU Graphs, WebGL Experiments & Network Simulations"_

### `/tools/blockchain-viz` — Blockchain Network Simulation

- **File:** `app/tools/blockchain-viz/page.tsx`
- **Description:** Blockchain P2P network simulation with data packets flowing between nodes.
- **Key component:** `BlockchainVizDemo` (dynamic import, no SSR)

### `/tools/ai-office` — AI Office World

- **File:** `app/tools/ai-office/page.tsx`
- **Description:** Procedural 3D world of autonomous AI agents — pure math, no imported assets.
- **Key component:** `AIOfficeDemo` (dynamic import, no SSR)

### `/tools/cosmograph` — GPU Graph (Cosmograph)

- **File:** `app/tools/cosmograph/page.tsx`
- **Description:** GPU-accelerated WebGL graph visualization via Apache Arrow & DuckDB.
- **Key component:** `CosmographDemo` (dynamic import, no SSR)

### `/tools/creative-coding` — Creative Coding Playground

- **File:** `app/tools/creative-coding/page.tsx`
- **Description:** WebGL shader playground inspired by Cables.gl and Nodes.io.
- **Key component:** `CreativeCodingDemo` (dynamic import, no SSR)

### `/tools/nveil` — Volumetric Data Rendering

- **File:** `app/tools/nveil/page.tsx`
- **Description:** Volumetric 3D data rendering and spatial dashboard.
- **Key component:** `NveilDemo` (dynamic import, no SSR)

### `/tools/reagraph` — React Network Graph

- **File:** `app/tools/reagraph/page.tsx`
- **Description:** React-native WebGL network graph using Three.js + D3 force layout.
- **Key component:** `ReagraphDemo` (dynamic import, no SSR)

### `/tools/graphistry` — Visual Graph Intelligence

- **File:** `app/tools/graphistry/page.tsx`
- **Description:** GPU-powered visual graph intelligence platform.
- **Key component:** `GraphistryDemo` (dynamic import, no SSR)

### `/demos` — Demos Hub

- **File:** `app/demos/page.tsx`
- **Description:** Index page with a filterable card grid of all demo scenarios.

### `/demos/github` — GitHub Activity

- **File:** `app/demos/github/page.tsx`
- **Description:** GitHub repo activity visualization — events as particles (push, PR, issue, star, fork).
- **Key components:** `DemoPageShell`, `DemoGraph`, `GITHUB_DATASET`

### `/demos/kubernetes` — Kubernetes Cluster

- **File:** `app/demos/kubernetes/page.tsx`
- **Description:** Kubernetes cluster pod lifecycle monitor (running, pending, error, terminated).
- **Key components:** `DemoPageShell`, `DemoGraph`, `K8S_DATASET`

### `/demos/api-traffic` — API Traffic Monitor

- **File:** `app/demos/api-traffic/page.tsx`
- **Description:** API traffic monitoring — HTTP requests flowing to endpoints, color-coded by status code.
- **Key components:** `DemoPageShell`, `DemoGraph`, `API_DATASET`

### `/demos/ai-agents` — AI Agent Swarm

- **File:** `app/demos/ai-agents/page.tsx`
- **Description:** Multi-agent task orchestration (research, code, review, plan, execute).
- **Key components:** `DemoPageShell`, `DemoGraph`, `AGENT_DATASET`

### `/demos/social` — Social Network

- **File:** `app/demos/social/page.tsx`
- **Description:** Real-time social interaction graph (like, repost, follow, reply).
- **Key components:** `DemoPageShell`, `DemoGraph`, `SOCIAL_DATASET`

### `/demos/iot` — IoT Sensor Network

- **File:** `app/demos/iot/page.tsx`
- **Description:** Distributed IoT sensor network — readings for temperature, humidity, motion, pressure, light.
- **Key components:** `DemoPageShell`, `DemoGraph`, `IOT_DATASET`

---

## API Routes (4 routes)

### `POST /api/world-chat` — Claude Chat

- **File:** `app/api/world-chat/route.ts`
- **Description:** Chat endpoint powered by Claude Sonnet (`claude-sonnet-4-6`) via the Anthropic SDK. Per-IP rate limiting (20 requests per 60 seconds, max 10,000 IPs tracked).
- **Env:** Requires `ANTHROPIC_API_KEY`
- **Validation:** Max 50 messages, max 4,000 chars per message, non-empty strings, context value sanitization
- **Tools:** `sceneColorUpdate`, `cameraFocus`, `dataFilter`, `agentSummary`, `tradeVisualization`
- **Request body:** `{ messages: [{ role, content }], context: { stats, hubCount, agentMetrics? } }`
- **Response:** `{ message: string, actions: [{ type, params }] }`

### `GET|POST /api/executor` — Executor Proxy

- **File:** `app/api/executor/route.ts`
- **Description:** Proxy to the executor backend. Rate-limited: 30 requests per 60 seconds per IP.
- **Env:** `EXECUTOR_URL` (default: `http://localhost:8765`)
- **Allowed paths (whitelist):** `/api/status`, `/api/tasks`, `/api/agents`
- **Security:** Path validation (no protocol schemes, double slashes, or directory traversal). 5-10 second timeouts.

### `GET /api/agents/cookie` — Cookie.fun Agent Proxy

- **File:** `app/api/agents/cookie/route.ts`
- **Description:** Proxy to the cookie.fun agents API for AI agent rankings.
- **Upstream:** `https://api.cookie.fun/v2/agents/agentsPaged`
- **Allowed query params:** `interval`, `page`, `pageSize`
- **Caching:** Next.js ISR revalidate=60, Cache-Control: public, s-maxage=60, stale-while-revalidate=120
- **Timeout:** 10 seconds

### `GET /api/thumbnail` — OG Image Generation

- **File:** `app/api/thumbnail/route.tsx`
- **Runtime:** Edge (no Node.js dependencies)
- **Description:** Generates 400x300px OG images for demo pages with seeded random node positions and radial glow effects.
- **Query param:** `?demo=` (github|kubernetes|social|api-traffic|ai-agents|iot)
- **Demo colors:** GitHub (#818cf8), Kubernetes (#38bdf8), Social (#f472b6), API Traffic (#fbbf24), AI Agents (#a78bfa), IoT (#34d399)

---

## Layouts (10 layouts)

| Scope | File | Purpose |
|-------|------|---------|
| Root | `app/layout.tsx` | IBM Plex Mono font, global CSS, metadata, JSON-LD schema, SEO |
| `/agents` | `app/agents/layout.tsx` | Agent dashboard metadata and OG/Twitter cards |
| `/benchmarks` | `app/benchmarks/layout.tsx` | Benchmark page metadata |
| `/blog` | `app/blog/layout.tsx` | Blog section metadata |
| `/blog/[slug]` | `app/blog/[slug]/layout.tsx` | Passthrough wrapper (per-post metadata via `generateMetadata`) |
| `/docs` | `app/docs/layout.tsx` | Docs title template: _"%s \| swarming.docs"_ |
| `/embed` | `app/embed/layout.tsx` | Full-viewport container, `noindex/nofollow` |
| `/landing` | `app/landing/layout.tsx` | Landing page metadata |
| `/tools` | `app/tools/layout.tsx` | Tools section metadata |
| `/world` | `app/world/layout.tsx` | Visualization page metadata and OG/Twitter cards |

---

## Loading Screens (4)

| Scope | File | Behaviour |
|-------|------|-----------|
| Root | `app/loading.tsx` | Spinner on dark background |
| `/agents` | `app/agents/loading.tsx` | Spinner + "Loading agents" |
| `/tools` | `app/tools/loading.tsx` | Spinner on dark background |
| `/world` | `app/world/loading.tsx` | Spinner + "Loading visualization" |

---

## Error Boundaries (4)

| Scope | File | Message | Recovery |
|-------|------|---------|----------|
| Root | `app/error.tsx` | "Something went wrong" | "Try again" button |
| `/agents` | `app/agents/error.tsx` | "Agent dashboard crashed" | "Reload dashboard" |
| `/tools` | `app/tools/error.tsx` | "Tool crashed" | "Reload tool" |
| `/world` | `app/world/error.tsx` | "Visualization crashed" | "Reload visualization" |

---

## Special Files

| File | Purpose |
|------|---------|
| `app/not-found.tsx` | Global 404 — "Page not found" |
| `app/manifest.ts` | PWA web app manifest |
| `app/robots.ts` | Robots.txt generation |
| `app/sitemap.ts` | Sitemap generation |
| `app/opengraph-image.tsx` | Dynamic OG image |
| `app/icon.tsx` | Dynamic favicon (32×32) |
| `app/icon-192.tsx` | PWA icon (192×192) |
| `app/icon-512.tsx` | PWA icon (512×512) |
| `app/apple-icon.tsx` | Apple touch icon |
| `app/globals.css` | Global styles (Tailwind base + custom) |

---

## Route Map (visual overview)

```
/                           → Landing (marketing)
/landing                    → Alternate landing
/world                      → 3D blockchain visualization ★
/agents                     → AI agent dashboard ★
/embed                      → Embeddable widget (iframe)
/playground                 → Code playground
/blog                       → Blog index
/blog/:slug                 → Blog post
/docs/*                     → Documentation hub
/plugins                    → Plugin directory
/showcase                   → Community showcase
/benchmarks                 → Performance comparison
/tools                      → Tools hub index
/tools/blockchain-viz       → Blockchain P2P simulation
/tools/ai-office            → AI office 3D world
/tools/cosmograph           → GPU-accelerated graph
/tools/creative-coding      → WebGL shader playground
/tools/nveil                → Volumetric 3D data
/tools/reagraph             → React network graph
/tools/graphistry           → GPU graph intelligence
/demos                      → Demos hub index
/demos/github               → GitHub activity viz
/demos/kubernetes           → K8s cluster monitor
/demos/api-traffic          → API traffic monitor
/demos/ai-agents            → AI agent swarm
/demos/social               → Social network graph
/demos/iot                  → IoT sensor network
/api/world-chat             → Claude chat API (POST)
/api/executor               → Executor proxy API (GET/POST)
/api/agents/cookie          → Cookie.fun agent rankings (GET)
/api/thumbnail              → OG image generation (GET, Edge)
```
