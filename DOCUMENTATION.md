# swarming.world — Complete Source Documentation

> **Every file, every function, every line — exhaustively documented.**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Root Configuration Files](#2-root-configuration-files)
3. [App Layer (Next.js App Router)](#3-app-layer-nextjs-app-router)
4. [packages/core — Shared Types & Simulation Engine](#4-packagescore--shared-types--simulation-engine)
5. [packages/providers — Data Provider Hooks & Implementations](#5-packagesproviders--data-provider-hooks--implementations)
6. [packages/executor — Agent Execution Backend](#6-packagesexecutor--agent-execution-backend)
7. [packages/ui — Design System & Components](#7-packagesui--design-system--components)
8. [packages/react-graph — React Three.js Graph Wrapper](#8-packagesreact-graph--react-threejs-graph-wrapper)
9. [packages/utils — Shared Utilities](#9-packagesutils--shared-utilities)
10. [packages/tailwind-config & packages/tsconfig](#10-packagestailwind-config--packagestsconfig)
11. [features/World — World Visualization Feature](#11-featuresworld--world-visualization-feature)
12. [features/Agents — Agent Visualization Feature](#12-featuresagents--agent-visualization-feature)
13. [hooks/ — Legacy Provider Hooks](#13-hooks--legacy-provider-hooks)
14. [providers/ — Legacy Data Provider Implementations](#14-providers--legacy-data-provider-implementations)
15. [apps/playground — Development Playground](#15-appsplayground--development-playground)
16. [Static Assets & Data](#16-static-assets--data)

---

## 1. Project Overview

**visualize-web3-realtime** is a real-time 3D visualization platform for blockchain activity and autonomous AI agents. It renders live token launches, trades, fee claims, and agent task executions as an interactive force-directed graph using Three.js.

### Architecture

```
Monorepo (Turborepo + npm workspaces)
├── Root App (Next.js 14, App Router)          — Main web application
├── packages/core                               — Shared types, simulation engine
├── packages/providers                          — Data source implementations
├── packages/executor                           — Agent execution backend (Node.js server)
├── packages/ui                                 — Design system (primitives, tokens, themes)
├── packages/react-graph                        — React Three.js graph wrapper
├── packages/utils                              — Formatting, screenshot, share URL utilities
├── packages/tailwind-config                    — Shared Tailwind CSS configuration
├── packages/tsconfig                           — Shared TypeScript configurations
├── features/World                              — World visualization components & hooks
├── features/Agents                             — Agent visualization components
├── hooks/                                      — Legacy provider hooks (per-chain)
├── providers/                                  — Legacy data provider implementations
└── apps/playground                             — Development/testing playground app
```

### Key Technologies

| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | Server-side rendering, routing, metadata |
| React 18 | UI component framework |
| Three.js + @react-three/fiber | 3D WebGL rendering |
| d3-force | Force-directed graph simulation physics |
| framer-motion | UI animations |
| Tailwind CSS 3.4 | Utility-first CSS framework |
| Turborepo | Monorepo task orchestration |
| TypeScript 5.5 | Static typing |
| WebSocket | Real-time data streaming |
| SQLite (better-sqlite3) | Executor state persistence |
| html2canvas | Screenshot capture |

### Data Flow

```
WebSocket APIs (PumpFun, Solana RPC, Ethereum, SperaxOS)
        ↓
DataProvider instances (connect, parse, normalize events)
        ↓
useProviders() hook (aggregates across providers, manages categories)
        ↓
Page components (WorldPage, AgentsPage)
        ↓
ForceGraph / AgentForceGraph (Three.js 3D rendering)
```

---

## 2. Root Configuration Files

### `package.json`

**Purpose:** Root package manifest for the monorepo.

```jsonc
{
  "name": "visualize-web3-realtime",    // Package name
  "version": "0.1.0",                   // Semantic version
  "private": true,                      // Prevents accidental npm publish
  "packageManager": "npm@10.8.2",       // Pins npm version for reproducibility
  "workspaces": [                       // npm workspaces for monorepo
    "packages/*",                       //   All packages under packages/
    "apps/*"                            //   All apps under apps/
  ],
```

**Scripts:**

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev -p 3100` | Starts the main app dev server on port 3100 |
| `dev:playground` | `turbo run dev --filter=@web3viz/playground` | Starts only the playground app |
| `dev:executor` | `turbo run dev --filter=@web3viz/executor` | Starts only the executor backend |
| `build` | `next build` | Production build of the main app |
| `build:web` | `next build` | Alias for `build` (explicit web target) |
| `start` | `next start -p 3100` | Starts production server on port 3100 |
| `lint` | `next lint` | Runs ESLint via Next.js |
| `typecheck` | `turbo run typecheck` | Type-checks all packages via Turborepo |

**Dependencies:**

| Package | Version | Purpose |
|---|---|---|
| `@react-three/drei` | ^9.122.0 | Three.js helpers (MapControls, etc.) |
| `@react-three/fiber` | ^8.18.0 | React reconciler for Three.js |
| `d3-force` | ^3.0.0 | Force simulation physics (forceSimulation, forceLink, etc.) |
| `framer-motion` | ^11.0.0 | Animation library for React |
| `html2canvas` | ^1.4.1 | HTML-to-canvas screenshot capture |
| `next` | ^14.2.0 | React framework with App Router |
| `react` / `react-dom` | ^18.3.0 | React core |
| `three` | ^0.169.0 | 3D rendering engine |

**Dev Dependencies:**

| Package | Version | Purpose |
|---|---|---|
| `@types/d3-force` | ^3.0.10 | TypeScript types for d3-force |
| `@types/node` | ^20.14.0 | Node.js type definitions |
| `@types/react` / `@types/react-dom` | ^18.3.0 | React type definitions |
| `@types/three` | ^0.169.0 | Three.js type definitions |
| `autoprefixer` | ^10.4.0 | PostCSS plugin for vendor prefixes |
| `postcss` | ^8.4.0 | CSS transformation tool |
| `tailwindcss` | ^3.4.0 | Utility-first CSS framework |
| `turbo` | ^2.0.0 | Monorepo build system |
| `typescript` | ^5.5.0 | TypeScript compiler |

---

### `tsconfig.json`

**Purpose:** Root TypeScript configuration for the main Next.js app.

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",           // Emit ES2022 JavaScript (top-level await, etc.)
    "lib": ["dom", "dom.iterable", "ES2022"],  // Browser + ES2022 type libraries
    "types": ["node"],            // Include Node.js types globally
    "allowJs": true,              // Allow .js files alongside .ts
    "skipLibCheck": true,         // Skip type-checking declaration files (faster builds)
    "strict": true,               // Enable all strict type-checking options
    "noEmit": true,               // Don't emit JS — Next.js handles compilation
    "esModuleInterop": true,      // CommonJS/ES module interop
    "module": "esnext",           // Use ESNext module system
    "moduleResolution": "bundler", // Bundler-style resolution (Next.js)
    "resolveJsonModule": true,    // Allow importing .json files
    "isolatedModules": true,      // Ensure each file can be transpiled independently
    "jsx": "preserve",            // Preserve JSX for Next.js to handle
    "incremental": true,          // Enable incremental compilation
    "plugins": [{ "name": "next" }],  // Next.js TypeScript plugin
    "paths": {                    // Module aliases:
      "@/*": ["./*"],             //   @/ → project root
      "@web3viz/core": ["./packages/core/src/index.ts"],         // Core types
      "@web3viz/core/*": ["./packages/core/src/*/index.ts"],     // Core sub-modules
      "@web3viz/providers": ["./packages/providers/src/index.ts"],
      "@web3viz/providers/*": ["./packages/providers/src/*/index.ts"],
      "@web3viz/react-graph": ["./packages/react-graph/src/index.ts"],
      "@web3viz/ui": ["./packages/ui/src/index.ts"],
      "@web3viz/ui/*": ["./packages/ui/src/*/index.ts"],
      "@web3viz/utils": ["./packages/utils/src/index.ts"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "packages/executor", "apps/playground", "providers", "temp"]
  // Note: packages/executor is excluded because it has its own tsconfig (Node.js target)
  // providers/ is the legacy provider directory, also excluded
}
```

---

### `turbo.json`

**Purpose:** Turborepo pipeline configuration. Defines how tasks cascade across workspaces.

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],  // Re-run tasks when any .env.local changes
  "tasks": {
    "build": {
      "dependsOn": ["^build"],               // Build dependencies before self
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]  // Cache these outputs
    },
    "dev": {
      "cache": false,     // Never cache dev tasks (they're long-running)
      "persistent": true  // Keep running (dev servers don't exit)
    },
    "lint": {},           // No dependencies, no special outputs
    "typecheck": {
      "dependsOn": ["^build"]  // Must build deps first (needs .d.ts files)
    },
    "start": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

### `next.config.js`

**Purpose:** Next.js configuration. Enables React strict mode and transpiles internal monorepo packages.

```js
const nextConfig = {
  reactStrictMode: true,          // Double-renders in dev to catch side effects
  transpilePackages: [            // Transpile these workspace packages (they're TypeScript source)
    '@web3viz/core',
    '@web3viz/providers',
    '@web3viz/react-graph',
    '@web3viz/ui',
    '@web3viz/utils',
  ],
};
module.exports = nextConfig;
```

Without `transpilePackages`, Next.js wouldn't compile the TypeScript in `packages/*/src/` — it would expect pre-built JavaScript.

---

### `postcss.config.js`

**Purpose:** PostCSS plugin pipeline. Processes CSS through Tailwind and Autoprefixer.

```js
module.exports = {
  plugins: {
    tailwindcss: {},    // Process @tailwind directives, utility classes
    autoprefixer: {},   // Add vendor prefixes (-webkit-, -moz-, etc.)
  },
};
```

---

### `tailwind.config.ts`

**Purpose:** Tailwind CSS configuration for the main app.

```ts
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",         // Scan app/ for class usage
    "./features/**/*.{ts,tsx}",    // Scan features/ for class usage
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],  // Custom monospace font
      },
    },
  },
  plugins: [],  // No Tailwind plugins
};
```

Only `app/` and `features/` are scanned for classes. The `packages/` directory uses inline styles, not Tailwind utilities.

---

### `.env.example`

**Purpose:** Template for environment variables. Copy to `.env.local` to configure.

| Variable | Default | Purpose |
|---|---|---|
| **AI** | | |
| `GROQ_API_KEY` | *(empty)* | Groq API key for `/world` AI chat (preferred, free tier) |
| `ANTHROPIC_API_KEY` | *(empty)* | Anthropic API key for `/world` AI chat (fallback) |
| **Blockchain Providers** | | |
| `NEXT_PUBLIC_SOLANA_WS_URL` | *(empty)* | Solana RPC WebSocket URL (e.g. Helius, Alchemy) |
| `NEXT_PUBLIC_ETH_WS_URL` | `wss://ethereum-rpc.publicnode.com` | Ethereum RPC WebSocket URL |
| `NEXT_PUBLIC_BASE_WS_URL` | `wss://base-rpc.publicnode.com` | Base chain RPC WebSocket URL |
| **SperaxOS Agent API** | | |
| `NEXT_PUBLIC_SPERAXOS_WS_URL` | `wss://api.speraxos.io/agents/v1/stream` | WebSocket endpoint for real-time agent events |
| `NEXT_PUBLIC_SPERAXOS_API_KEY` | *(empty)* | API key for SperaxOS authentication |
| `NEXT_PUBLIC_AGENT_MOCK` | `true` | When `true`, uses mock agent data instead of real SperaxOS |
| **Executor** | | |
| `EXECUTOR_PORT` | `8765` | Port for the executor WebSocket server |
| `EXECUTOR_MAX_AGENTS` | `5` | Maximum concurrent agents the executor will manage |
| `SPERAXOS_URL` | `https://api.speraxos.io` | SperaxOS REST API base URL (used by executor) |
| `SPERAXOS_API_KEY` | *(empty)* | API key for executor → SperaxOS communication |
| `STATE_PATH` | `./data/executor.db` | SQLite database path for executor state persistence |

---

### `next-env.d.ts`

**Purpose:** Auto-generated by Next.js. Provides global type references for Next.js and `next/image`.

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
// NOTE: This file should not be edited
```

---

## 3. App Layer (Next.js App Router)

### `app/layout.tsx` — Root Layout

**Purpose:** The root `<html>` shell for every page. Sets metadata, loads fonts, wraps children.

**Line-by-line:**

- **Lines 1-2:** Import global CSS and Next.js `Metadata` type.
- **Lines 4-27:** Export `metadata` object — sets page title, description, OpenGraph tags (for social sharing previews), and Twitter card configuration. The OG image is `/og-preview.png` (1200×630).
- **Lines 29-41:** `RootLayout` component:
  - Renders `<html lang="en">` for accessibility.
  - `<head>`: loads IBM Plex Mono font from Google Fonts (weights 200–600).
  - `<body>`: renders child page content.

No client-side JavaScript in this file — it's a server component.

---

### `app/page.tsx` — Home Page (Root Redirect)

**Purpose:** Immediately redirects `/` to `/world`.

```ts
import { redirect } from "next/navigation";
export default function Home() { redirect("/world"); }
```

- **Line 1:** Imports Next.js server-side redirect.
- **Line 2:** Calls `redirect("/world")` — a 307 temporary redirect. Users never see this page.

---

### `app/globals.css` — Global Styles

**Purpose:** Base styles, animations, responsive breakpoints. Processed by Tailwind + PostCSS.

**Sections:**

**Lines 1-3: Tailwind directives**
```css
@tailwind base;        /* Normalize + base styles */
@tailwind components;  /* Component class utilities */
@tailwind utilities;   /* Utility classes (p-4, flex, etc.) */
```

**Lines 5-29: Base layer**
- `:root` — Sets IBM Plex Mono as default font.
- `html, body` — Full viewport, `overflow: hidden` (the app is a single-screen visualization), `color-scheme: light`.
- `body` — Light gray background (`#cccccc`), dark text (`#1a1a1a`), font smoothing.
- `*` — Universal box-sizing: border-box, zero margin/padding.

**Lines 31-44: Keyframe animations**
- `spin` — 360° rotation (used by loading spinner).
- `fadeOut` — Opacity 1→0 with `pointer-events: none` at end (used by loading screen).
- `pulse` — Opacity 1→0.4→1 cycle (used for pulsing indicators).

**Lines 46-62: Interactive elements**
- `button, a, input` — 150ms ease transition on all properties.
- `button:hover` — Pointer cursor.
- `canvas` — Grab cursor (for 3D navigation).
- `canvas:active` — Grabbing cursor (while dragging).

**Lines 64-89: Responsive breakpoints**
- `≤1200px`: Hide sidebar labels, wrap stats bar, make share panel full-width bottom sheet.
- `≤768px`: Hide desktop sidebar entirely, hide 3rd+ stat pills, hide timeline ticks, hide live feed.
- `slideInRight` animation: slides element from right (used by share panel).

---

### `app/opengraph-image.tsx` — Dynamic OG Image

**Purpose:** Generates a 1200×630 PNG image at build time for social sharing previews using Next.js `ImageResponse`.

- **Line 1:** `runtime = 'edge'` — runs on Edge runtime for fast generation.
- **Lines 3-5:** Exports alt text, dimensions, and content type.
- **Lines 8-61:** `OGImage` component renders JSX-to-image:
  - Dark background (`#0a0a14`), white text.
  - "PumpFun World" title in a bordered rounded box (48px, weight 600).
  - "Real-time 3D Token Visualization" subtitle in muted uppercase.

---

### `app/world/page.tsx` — World Visualization Page

**Purpose:** The main visualization page. Orchestrates the 3D force graph, sidebar, timeline, stats, live feed, share panel, journey system, and embed configurator.

**This is the largest and most complex page component (~810 lines).**

**Imports (lines 1-23):**
- `dynamic` from Next.js for lazy-loading the ForceGraph (Three.js can't SSR).
- React hooks: `memo`, `Suspense`, `useCallback`, `useEffect`, `useMemo`, `useRef`, `useState`.
- All World feature components: InfoPopover, JourneyOverlay, LoadingScreen, ProtocolFilterSidebar, ShareOverlay, SharePanel, LiveFeed, TimelineBar, StartJourney, StatsBar, EmbedConfigurator.
- `useProviders` from `@web3viz/providers` — the central data aggregation hook.
- `providers` array from `./providers` — the active provider instances.
- `useJourney` — guided tour hook.
- Utility functions: `captureCanvas`, `downloadBlob`, `timestampedFilename`, `buildShareUrl`, etc.

**ForceGraph lazy loading (lines 27-31):**
```ts
const ForceGraph = dynamic(() => import('@/features/World/ForceGraph'), {
  ssr: false,  // Three.js uses WebGL — not available in Node.js
  loading: () => <div style={{ width: '100%', height: '100%', background: '#ffffff' }} />,
}) as any;
```

**Helper functions (lines 36-46):**

- `formatStat(value, prefix)` — Formats numbers with K/M/B suffixes. E.g., `1500` → `"1.5K"`, `2500000` → `"2.5M"`.
- `getTotalVolume(volumeMap)` — Sums all values in a `Record<string, number>` (volume across chains).

**Sub-components (lines 52-200):**

- **`StatPill`** (lines 52-75) — A memoized pill showing a label + value. Used in the stats overlay. White background, 1px border, IBM Plex Mono font, 10px uppercase label, 14px bold value.

- **`ConnectionDot`** (lines 81-108) — A memoized connection status indicator. Shows a 5px colored dot (green = connected, red = disconnected) with a label. Used to show WebSocket connection status per provider.

- **`WelcomeOverlay`** (lines 114-179) — Shown when no providers are enabled. Displays "Web3 Realtime" title, instruction text ("Enable a data source from the sidebar..."), and a left-arrow hint ("toggle providers"). Fades in/out via opacity transition.

- **`FadeIn`** (lines 186-200) — Generic opacity transition wrapper. Accepts `visible` boolean, renders children with opacity 0/1 and pointer-events none/auto.

**`WorldPage` component (lines 206-809):**

**State (lines 207-228):**

| State Variable | Type | Purpose |
|---|---|---|
| `isPlaying` | `boolean` | Whether the timeline is auto-advancing |
| `timeFilter` | `number \| null` | Current timeline position (null = live) |
| `infoOpen` | `boolean` | Whether the info popover is visible |
| `userAddress` | `string` | Address entered in the search bar |
| `canvasReady` | `boolean` | Whether the 3D canvas has rendered initial data |
| `highlightedAddress` | `string \| null` | Currently searched/highlighted address |
| `highlightedHubIndex` | `number \| null` | Index of the hub containing the highlighted address |
| `activeHubMint` | `string \| null` | Mint address of the selected protocol hub |
| `searchToast` | `string \| null` | Toast message for search results |
| `searchError` | `boolean` | Whether the search produced an error |
| `shareOpen` | `boolean` | Whether the share panel is visible |
| `embedOpen` | `boolean` | Whether the embed configurator is visible |
| `shareColors` | `ShareColors` | Custom colors for share/export |
| `downloading` | `'world' \| 'snapshot' \| null` | Current download operation |

**Refs (lines 225-228):**
- `infoButtonRef` — Reference to the info button for popover positioning.
- `graphRef` — Reference to the ForceGraph's imperative handle (for camera control, node search).
- `overlayRef` — Reference to the share overlay div (for screenshot capture).

**Provider integration (lines 230-244):**
```ts
const {
  stats, filteredEvents, allEvents, enabledCategories, toggleCategory,
  enabledProviders, toggleProvider: rawToggleProvider, categories, sources, connections,
  allCategories, allSources
} = useProviders({ providers, paused: !isPlaying, startEnabled: false });
```
- `stats` — Aggregated statistics (topTokens, traderEdges, counts, volumes).
- `filteredEvents` — Events matching enabled categories.
- `allEvents` — All events regardless of category filter.
- `enabledCategories` — `Set<string>` of active category IDs.
- `toggleCategory` — Function to enable/disable a category.
- `enabledProviders` — `Set<string>` of active provider IDs.
- `toggleProvider` — Wrapped to auto-play when first provider is enabled (lines 237-243).
- `categories` / `sources` — Category and source configurations from all providers.
- `connections` — WebSocket connection states per provider.

**Auto-play on first provider (lines 237-243):**
When `toggleProvider` is called for a provider that isn't currently enabled, `isPlaying` is set to `true` automatically so the user sees data flowing immediately.

**Canvas ready detection (lines 248-252):**
Sets `canvasReady = true` once `stats.topTokens.length > 0` — triggers the loading screen to fade out.

**Timeline timestamp accumulation (lines 255-272):**
Maintains a rolling buffer of up to 5000 event timestamps for the timeline bar. Uses a `Set` of seen event IDs to avoid duplicates. When `allEvents` changes, new timestamps are extracted and appended.

**Time range calculation (lines 275-284):**
Computes `{ min, max }` from the timestamp buffer. Used for timeline scrubbing and auto-advance calculations.

**Playback auto-advance (lines 290-305):**
When `isPlaying` is true and `timeFilter` is not null (i.e., scrubbing, not live), advances the time filter by `range/200` every 50ms. When the filter reaches the maximum timestamp, it snaps to `null` (live mode).

**Timeline handlers (lines 308-317):**
- `handleTogglePlay` — Toggles `isPlaying`.
- `handleTimeChange` — Sets `timeFilter` and pauses playback when the user manually scrubs.

**Time-filtered data (lines 320-340):**
- `displayTopTokens` — If time filter is active, shows only a fraction of tokens proportional to the scrub position. E.g., at 50% scrub, shows the first 50% of tokens.
- `displayTraderEdges` — Filters edges to only those connected to visible tokens.
- `displayFilteredEvents` — Filters events to only those before the time filter timestamp.

**Protocol filter (lines 343-356):**
`handleProtocolToggle` — Toggles a protocol's highlight by mint address. Single-select (clicking the same mint deselects). Syncs the selection to the URL `?protocols=` parameter via `history.replaceState`.

**URL parameter restoration (lines 359-372):**
On mount, reads `?protocols=` and `?agents=` from the URL. Restores the active hub mint and enables the agents provider if `agents=true`.

**Address search (lines 375-411):**
`handleAddressSearch` — Searches for a wallet address in the graph:
1. First tries `graphRef.current.findAgentHub(address)` — looks for agent nodes.
2. If found, highlights and focuses the camera on the agent.
3. If not, searches `allEvents` for a matching address (case-insensitive).
4. If found in events, maps the event's category to a hub index and focuses the camera.
5. If not found anywhere, shows an error toast.

**Dismiss highlight (lines 413-419):**
Clears `highlightedAddress` and `highlightedHubIndex`, removes `?address=` from URL.

**Auto-search from URL (lines 430-438):**
On mount, reads `?address=` from URL and triggers `handleAddressSearch` after a 2-second delay (to allow data to stream in).

**Download handlers (lines 444-467):**
- `handleDownloadWorld` — Captures the raw canvas as PNG, downloads it.
- `handleDownloadSnapshot` — Captures the canvas + HTML overlay as a combined PNG.

Both use `captureCanvas()` from the screenshot utility and `downloadBlob()` + `timestampedFilename()` for the file download.

**Share handlers (lines 470-496):**
- `handleShareX` — Builds a share URL with custom colors, generates share text with stats, opens Twitter/X share intent.
- `handleShareLinkedIn` — Builds a share URL, opens LinkedIn share intent.
- Parse share URL params on mount (lines 492-496): reads `?bg=`, `?pc=`, `?uc=` color parameters and applies them to `shareColors`.

**Journey integration (lines 498-504):**
```ts
const { isComplete, isRunning, overlay, skipJourney, startJourney } = useJourney({
  enabledCategories, graphRef, stats, userAddress,
});
```
The journey is a guided tour that highlights different parts of the visualization.

**JSX render (lines 508-809):**

The render tree is a single full-viewport `<div>` containing:

1. **LoadingScreen** (line 511) — Shown only when a provider is active but canvas isn't ready.
2. **WelcomeOverlay** (line 514) — Shown until a provider is enabled.
3. **TimelineBar** (lines 517-533) — Top bar with play/pause, scrubber, info button. Fades in when active.
4. **ForceGraph** (lines 536-549) — Full-screen 3D canvas. Receives display data, active protocol, highlights, share colors. Offset 48px from top when active (for timeline bar).
5. **JourneyOverlay** (lines 552-558) — Journey step descriptions.
6. **Search toast** (lines 561-580) — Bottom-center toast for "Address not found" messages.
7. **Header** (lines 583-656) — Top-center: "Web3 Realtime" label, "Agents" link (purple pill), info button with popover.
8. **Connection status** (lines 659-679) — Top-left: colored dots per provider connection.
9. **ProtocolFilterSidebar** (lines 683-690) — Left sidebar: category toggles, provider toggles.
10. **StatsBar** (lines 693-705) — Bottom bar: token count, volume, trades, address search.
11. **LiveFeed** (lines 708-710) — Bottom-right: scrolling list of recent events.
12. **StartJourney** (lines 712-719) — Bottom-right button to start the guided journey.
13. **Share button** (lines 722-749) — "Share" pill button, shown when share panel is closed.
14. **SharePanel + ShareOverlay** (lines 752-772) — Right panel with color pickers, download buttons, social share.
15. **EmbedConfigurator** (lines 775-777) — Modal for generating embed code.
16. **Embed button** (lines 780-806) — Bottom-left "</> Embed" button.

---

### `app/world/providers.ts` — Provider Instance Registry

**Purpose:** Instantiates and exports the array of `DataProvider` instances used by the World page.

```ts
import { PumpFunProvider, MockProvider } from '@web3viz/providers';

export const providers = [
  new PumpFunProvider(),  // Real-time Solana PumpFun data
  new MockProvider(),     // Mock data for development/demo
];
```

To add a new provider: create a class implementing `DataProvider` from `@web3viz/core`, instantiate it, add it to this array. The provider's categories automatically appear in the filter sidebar.

---

### `app/agents/layout.tsx` — Agents Layout

**Purpose:** Layout wrapper for the `/agents` route. Sets page metadata.

```ts
export const metadata = {
  title: 'Agent World — Visualize AI Agents in Real-Time',
  description: 'Watch autonomous AI agents complete tasks, call tools, and coordinate in real-time.',
};

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;  // Pass-through layout (no extra wrapping)
}
```

---

### `app/agents/page.tsx` — Agents Visualization Page

**Purpose:** The agent visualization page. Shows AI agents executing tasks, calling tools, and spawning sub-agents in a 3D force graph.

**This is the second-largest page component (~600 lines).**

**Imports (lines 1-19):**
- `dynamicImport` for lazy-loading `AgentForceGraph`.
- React hooks, Next.js `useSearchParams`.
- Core types: `AgentTask`, `AgentIdentity`.
- Custom hooks: `useAgentProvider`, `useAgentKeyboardShortcuts`.
- Agent feature components: sidebar, stats bar, live feed, timeline, executor banner, loading screen, task inspector.
- Agent theme tokens for dynamic theming.
- Screenshot utilities.

**AgentForceGraph lazy loading (lines 22-43):**
```ts
const AgentForceGraph = dynamicImport(() => import('@/features/Agents/AgentForceGraph'), {
  ssr: false,
  loading: () => <div>Connecting to agent executor...</div>,
}) as any;
```

**Tool categories (line 49):**
```ts
const ALL_TOOL_CATEGORIES = new Set(['filesystem', 'search', 'terminal', 'network', 'code', 'reasoning']);
```
Used to filter which tool calls are visible in the graph.

**`AgentsPageInner` component (lines 55-591):**

**State (lines 57-70):**

| State | Type | Purpose |
|---|---|---|
| `activeAgentId` | `string \| null` | Currently selected agent |
| `selectedTaskId` | `string \| null` | Currently inspected task |
| `pageReady` | `boolean` | Whether first agent data has arrived |
| `activeToolCategories` | `Set<string>` | Which tool categories are visible |
| `isPlaying` | `boolean` | Whether timeline auto-advances |
| `scrubOffset` | `number` | Timeline scrub position |
| `feedVisible` | `boolean` | Whether the live feed panel is shown |
| `colorScheme` | `'dark' \| 'light'` | Current theme |
| `windowWidth` | `number` | Viewport width for responsive layout |
| `downloading` | `boolean` | Whether a screenshot is being captured |
| `demoActive` | `boolean` | Whether the demo/mock mode is running |

**Agent provider integration (lines 72-77):**
```ts
const { stats, agents, flows, executorState, agentStats, connected, events } = useAgentProvider({
  mock: process.env.NEXT_PUBLIC_AGENT_MOCK !== 'false',
  url: process.env.NEXT_PUBLIC_SPERAXOS_WS_URL,
  apiKey: process.env.NEXT_PUBLIC_SPERAXOS_API_KEY,
  enabled: demoActive,
});
```
- `stats` — Aggregated agent stats (topTokens = agent hubs, traderEdges = tool connections).
- `agents` — `Map<string, AgentIdentity>` of all known agents.
- `flows` — `Map<string, AgentFlowTrace>` of agent execution flows.
- `executorState` — Current executor health/status.
- `agentStats` — Summary metrics (total agents, active tasks, tool calls/min, etc.).
- `connected` — WebSocket connection status.

**Event handlers (lines 79-118):**
- `handleSelectAgent` — Sets active agent ID.
- `handleSelectTask` — Sets selected task ID for inspector.
- `handleToggleToolCategory` — Toggles tool category visibility.
- `handleTogglePlay` — Toggles timeline playback.
- `handleFitCamera` — No-op (camera fit handled internally by AgentForceGraph).
- `handleToggleFeed` — Shows/hides the live feed panel.
- `handleDownloadAgent` — Captures the agent graph canvas as a PNG and downloads it.

**Event batching (lines 141-160):**
Batches agent events over a 100ms window to prevent UI jank. Extracts `agentEvent` type events from `stats.rawEvents`, limits to 500 entries, and updates `batchedEvents` state after a 100ms debounce.

**Task selection data (lines 163-210):**
- `selectedTask` — Searches all flows for a task matching `selectedTaskId`.
- `selectedTaskAgent` — The agent identity that owns the selected task.
- `selectedTaskToolCalls` — Tool calls associated with the selected task.
- `selectedTaskSubAgents` — Agents spawned during the selected task's execution window.

**Keyboard shortcuts (lines 213-220):**
```ts
useAgentKeyboardShortcuts({
  agents, onSelectAgent, onTogglePlay, onFitCamera, onToggleFeed,
  onCloseInspector: () => setSelectedTaskId(null),
});
```

**Responsive layout (lines 222-234):**
- Layout constants: `BANNER_H = 24`, `TIMELINE_H = 40`, `STATS_H = 60`.
- Breakpoints: mobile (<768px), tablet (768–1024px), desktop (≥1024px).
- Sidebar: 0px (mobile), 48px collapsed (tablet), 200px full (desktop).
- Feed: 0px (mobile), 200px (tablet), 260px (desktop).

**JSX render (lines 238-591):**

1. **AgentLoadingScreen** (line 250) — Shown until first agent data arrives.
2. **AgentSidebar** (lines 254-264) — Left sidebar with agent list, tool category filters. Hidden on mobile, collapsed on tablet.
3. **ExecutorBanner** (lines 267-274) — Top banner showing executor health status.
4. **AgentTimeline** (lines 277-287) — Timeline scrubber for agent events.
5. **AgentForceGraph** (lines 290-313) — 3D agent visualization in the center area.
6. **AgentLiveFeed** (lines 316-324) — Right panel showing real-time agent events.
7. **AgentStatsBar** (lines 327-335) — Bottom bar with agent metrics.
8. **Navigation** (lines 338-369) — Top-center "← World" link and "Agent World" label.
9. **Download button** (lines 372-399) — Top-right camera icon for screenshots.
10. **Theme toggle** (lines 402-427) — Top-right sun/moon button for dark/light mode.
11. **Connection indicator** (lines 430-455) — Shows "live" or "mock" with a colored dot.
12. **Feed toggle** (lines 458-487) — Button to show/hide the live feed panel.
13. **All agents idle overlay** (lines 490-519) — Shown when all agents have no active tasks.
14. **TaskInspectorPanel** (lines 522-530) — Modal showing task details, tool calls, sub-agents.
15. **Dormant state** (lines 533-588) — Full-screen overlay shown when demo is not active, with a "Run Demo" button.

**`AgentsPage` export (lines 594-600):**
Wraps `AgentsPageInner` in `<Suspense>` for `useSearchParams` compatibility.

---

### `app/embed/layout.tsx` — Embed Layout

**Purpose:** Minimal layout for the embed route. Sets metadata for embedded views.

```ts
export const metadata = {
  title: 'Web3 Realtime — Embed',
  description: 'Embeddable real-time 3D visualization of blockchain activity.',
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

---

### `app/embed/page.tsx` — Embed Page

**Purpose:** A stripped-down version of the World page for embedding in iframes. Reads configuration from URL parameters.

- Reads `?providers=`, `?categories=`, `?bg=`, `?pc=`, `?uc=` from the URL.
- Renders only the ForceGraph (no sidebar, no stats bar, no share panel).
- Applies custom colors from URL parameters.
- Minimal UI: just the 3D visualization.

---

## 4. packages/core — Shared Types & Simulation Engine

### `packages/core/src/index.ts` — Core Barrel Export

**Purpose:** Re-exports everything from sub-modules for convenient imports.

```ts
export * from './types';
export * from './types/agent';
export * from './providers';
export * from './categories';
export * from './engine';
```

---

### `packages/core/src/types/index.ts` — Core Type Definitions

**Purpose:** Defines all shared data types used across the application.

**Token type:**
```ts
export interface Token {
  name: string;           // Token display name (e.g., "DOGE")
  symbol: string;         // Token symbol
  mint: string;           // Unique token address/mint
  uri?: string;           // Metadata URI
  initialBuy?: number;    // Initial purchase amount
  marketCapSol?: number;  // Market cap in SOL
  source?: string;        // Which provider created this token
}
```

**Trade type:**
```ts
export interface Trade {
  signature: string;      // Transaction signature/hash
  mint: string;           // Token mint address
  sol_amount: number;     // Amount in SOL
  token_amount: number;   // Amount in tokens
  is_buy: boolean;        // Buy or sell
  user: string;           // Trader's wallet address
  timestamp: number;      // Unix timestamp
  name: string;           // Token name
  symbol: string;         // Token symbol
  source?: string;        // Provider source ID
}
```

**Claim type:**
```ts
export interface Claim {
  signature: string;      // Transaction signature
  claimer: string;        // Claimer's address
  feeAmount: number;      // Amount of fees claimed
  mint: string;           // Token mint
  timestamp: number;      // Unix timestamp
  source?: string;        // Provider ID
}
```

**TopToken type — represents a hub node in the force graph:**
```ts
export interface TopToken {
  mint: string;           // Unique identifier
  name: string;           // Display name
  symbol: string;         // Symbol
  tradeCount: number;     // Number of trades
  volumeSol: number;      // Volume in SOL
  source: string;         // Provider that owns this token
}
```

**TraderEdge type — represents a connection between entities:**
```ts
export interface TraderEdge {
  user: string;           // Trader/agent address
  mint: string;           // Token/hub they're connected to
  source: string;         // Provider source
}
```

**RawEvent type — generic event wrapper:**
```ts
export interface RawEvent {
  id: string;             // Unique event ID
  type: 'token' | 'trade' | 'claim' | 'agentEvent';  // Event type
  data: Token | Trade | Claim | AgentEvent;             // Event payload
  timestamp: number;      // When the event occurred
}
```

**DataProviderEvent type — normalized event for the UI:**
```ts
export interface DataProviderEvent {
  id: string;             // Unique event ID
  category: string;       // Category ID (e.g., 'launches', 'trades')
  timestamp: number;      // Event timestamp
  label: string;          // Display label
  amount?: number;        // Optional numeric value
  address: string;        // Associated address
  mint?: string;          // Token mint address
  source: string;         // Provider source ID
}
```

**DataProviderStats type — aggregated statistics from a provider:**
```ts
export interface DataProviderStats {
  counts: Record<string, number>;          // Counts per category
  totalVolume: Record<string, number>;     // Volume per chain
  totalTransactions: number;               // Total transaction count
  totalAgents: number;                     // Total agent count
  recentEvents: DataProviderEvent[];       // Recent events buffer
  topTokens: TopToken[];                   // Hub nodes for the graph
  traderEdges: TraderEdge[];               // Edge connections
  rawEvents: RawEvent[];                   // Raw event buffer
}
```

**CategoryConfig type — defines a category for the filter sidebar:**
```ts
export interface CategoryConfig {
  id: string;             // Unique category identifier
  label: string;          // Display label
  color: string;          // Hex color for graph nodes
  icon: string;           // Emoji icon
  description: string;    // Tooltip description
}
```

**SourceConfig type — defines a data source for the sidebar:**
```ts
export interface SourceConfig {
  id: string;             // Provider identifier
  label: string;          // Display name
  color: string;          // Brand color
  icon: string;           // Emoji icon
  description: string;    // Short description
}
```

**ConnectionState type — WebSocket connection status:**
```ts
export interface ConnectionState {
  name: string;           // Connection name (e.g., "PumpFun WS")
  connected: boolean;     // Whether connected
}
```

---

### `packages/core/src/types/agent.ts` — Agent Type Definitions

**Purpose:** Defines all types related to the agent execution system.

**AgentIdentity — describes an AI agent:**
```ts
export interface AgentIdentity {
  agentId: string;          // Unique agent identifier
  name: string;             // Display name
  role: string;             // Agent's role/purpose
  parentAgentId?: string;   // ID of the parent agent (if sub-agent)
  createdAt: number;        // Creation timestamp
  status: 'idle' | 'running' | 'completed' | 'failed';  // Current status
}
```

**AgentTask — a unit of work assigned to an agent:**
```ts
export interface AgentTask {
  taskId: string;           // Unique task identifier
  agentId: string;          // Which agent owns this task
  description: string;      // What the task does
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: number;       // When execution started
  endedAt?: number;         // When execution ended
  result?: string;          // Task output/result
}
```

**AgentToolCall — a tool invocation by an agent:**
```ts
export interface AgentToolCall {
  toolCallId: string;       // Unique tool call ID
  agentId: string;          // Which agent called the tool
  taskId: string;           // Which task the call belongs to
  toolName: string;         // Name of the tool (e.g., "readFile")
  toolCategory: string;     // Category (e.g., "filesystem")
  input: string;            // Tool input (serialized)
  output?: string;          // Tool output (if completed)
  status: 'pending' | 'completed' | 'failed';
  startedAt: number;        // When the call started
  endedAt?: number;         // When the call completed
}
```

**AgentFlowTrace — complete execution trace for an agent:**
```ts
export interface AgentFlowTrace {
  agent: AgentIdentity;     // The agent
  tasks: AgentTask[];       // All tasks
  toolCalls: AgentToolCall[]; // All tool calls
  subAgentIds: string[];    // IDs of spawned sub-agents
}
```

**AgentEvent — real-time event from the agent system:**
```ts
export interface AgentEvent {
  eventId: string;
  type: 'agent_spawn' | 'task_start' | 'task_complete' | 'task_fail' |
        'tool_call' | 'tool_result' | 'agent_idle' | 'agent_complete' |
        'reasoning_start' | 'reasoning_end' | 'heartbeat';
  agentId: string;
  timestamp: number;
  data: Record<string, unknown>;  // Event-specific payload
}
```

**ExecutorState — health/status of the agent executor:**
```ts
export interface ExecutorState {
  status: 'running' | 'degraded' | 'stopped';
  activeAgents: number;
  maxAgents: number;
  uptime: number;           // Seconds since start
  lastHeartbeat: number;    // Timestamp of last heartbeat
  version: string;          // Executor version
}
```

---

### `packages/core/src/providers/index.ts` — Provider Interface & Registry

**Purpose:** Defines the `DataProvider` interface and a global provider registry.

**DataProvider interface:**
```ts
export interface DataProvider {
  readonly id: string;                      // Unique provider identifier
  readonly name: string;                    // Display name
  readonly sourceConfig: SourceConfig;      // Source metadata for sidebar
  readonly categories: CategoryConfig[];    // Categories this provider emits

  // Lifecycle
  connect(): void;                          // Start data streaming
  disconnect(): void;                       // Stop data streaming
  pause(): void;                            // Temporarily pause events
  resume(): void;                           // Resume after pause
  enable(): void;                           // Enable this provider
  disable(): void;                          // Disable this provider

  // Stats
  getStats(): DataProviderStats;            // Get current aggregated stats
  getConnections(): ConnectionState[];      // Get connection statuses

  // Event subscriptions
  onEvent(listener: (event: DataProviderEvent) => void): () => void;   // Subscribe to events
  onRawEvent(listener: (event: RawEvent) => void): () => void;         // Subscribe to raw events
}
```

**Provider registry:**
```ts
const providerRegistry = new Map<string, DataProvider>();

export function registerProvider(provider: DataProvider): void {
  providerRegistry.set(provider.id, provider);
}

export function getProvider(id: string): DataProvider | undefined {
  return providerRegistry.get(id);
}

export function getAllProviders(): DataProvider[] {
  return Array.from(providerRegistry.values());
}
```

---

### `packages/core/src/categories/index.ts` — Category Definitions

**Purpose:** Defines the built-in category constants and types.

```ts
export type CategoryId = 'launches' | 'trades' | 'claims' | 'agentLaunches' | 'agentTrades';

export const CATEGORIES: Record<CategoryId, CategoryConfig> = {
  launches: {
    id: 'launches',
    label: 'Token Launches',
    color: '#a78bfa',        // Purple
    icon: '🚀',
    description: 'New token creation events',
  },
  trades: {
    id: 'trades',
    label: 'Trades',
    color: '#f59e0b',        // Amber
    icon: '💱',
    description: 'Token buy/sell transactions',
  },
  claims: {
    id: 'claims',
    label: 'Fee Claims',
    color: '#10b981',        // Emerald
    icon: '💰',
    description: 'Fee claim events from validators',
  },
  agentLaunches: {
    id: 'agentLaunches',
    label: 'Agent Launches',
    color: '#c084fc',        // Light purple
    icon: '⬡',
    description: 'AI agent spawn events',
  },
  agentTrades: {
    id: 'agentTrades',
    label: 'Agent Trades',
    color: '#f472b6',        // Pink
    icon: '🤖',
    description: 'Trades executed by AI agents',
  },
};
```

---

### `packages/core/src/engine/index.ts` — Engine Barrel

```ts
export { ForceGraphSimulation } from './ForceGraphSimulation';
export { SpatialHash } from './SpatialHash';
```

---

### `packages/core/src/engine/ForceGraphSimulation.ts` — Force-Directed Graph Simulation

**Purpose:** Wraps d3-force to provide a reusable force simulation for positioning graph nodes. Used by both World and Agent force graphs.

**Constructor parameters:**
```ts
interface SimulationConfig {
  chargeStrength?: number;    // Repulsion force (default: -30)
  linkDistance?: number;      // Desired link length (default: 50)
  centerStrength?: number;   // Pull toward center (default: 0.1)
  collideRadius?: number;    // Collision avoidance radius (default: 10)
  alphaDecay?: number;       // How fast simulation cools (default: 0.02)
  alphaTarget?: number;      // Target alpha (default: 0 = full stop)
}
```

**Key methods:**
- `setNodes(nodes)` — Updates the node set and restarts simulation.
- `setLinks(links)` — Updates the link set.
- `tick()` — Advances the simulation one step. Returns current node positions.
- `reheat()` — Restarts the simulation with `alpha = 1` (full energy).
- `stop()` — Stops the simulation.
- `getNodePosition(id)` — Returns `{ x, y }` for a given node ID.

**Forces configured:**
1. `forceLink` — Pulls linked nodes toward `linkDistance`.
2. `forceManyBody` — Repels all nodes (negative charge).
3. `forceCenter` — Pulls everything toward origin.
4. `forceCollide` — Prevents node overlap.

---

### `packages/core/src/engine/SpatialHash.ts` — Spatial Hashing for Fast Lookups

**Purpose:** A 2D spatial hash grid for O(1) nearest-neighbor queries on graph nodes. Used for click detection and hover in the 3D canvas.

**How it works:**
- Divides the 2D plane into cells of `cellSize` width.
- Each node is placed in the cell containing its position.
- `queryRadius(x, y, radius)` returns all nodes within `radius` of `(x, y)` by checking only the relevant cells.

**Key methods:**
- `clear()` — Empties all cells.
- `insert(id, x, y)` — Places a node in the grid.
- `queryRadius(x, y, radius)` — Returns IDs of nearby nodes.
- `nearest(x, y)` — Returns the closest node ID.

---

## 5. packages/providers — Data Provider Hooks & Implementations

### `packages/providers/src/index.ts` — Provider Barrel Export

Re-exports everything for convenient `@web3viz/providers` imports:
- `usePumpFun`, `usePumpFunClaims` — Low-level WebSocket hooks
- `PumpFunProvider`, `MockProvider` — `DataProvider` implementations
- `useDataProvider` — Deprecated PumpFun-specific hook
- `useProviders` — Main aggregation hook
- All relevant types

---

### `packages/providers/src/useProviders.ts` — Provider Aggregation Hook

**Purpose:** The primary hook that manages multiple `DataProvider` instances. Used by the World page.

**`UseProvidersOptions`:**
```ts
interface UseProvidersOptions {
  providers: DataProvider[];     // Array of provider instances
  paused?: boolean;              // Whether all providers should be paused
  startEnabled?: boolean;        // Whether providers start enabled (default: true)
}
```

**`UseProvidersReturn`:**
```ts
interface UseProvidersReturn {
  stats: DataProviderStats;                  // Merged stats from all providers
  filteredEvents: DataProviderEvent[];       // Events matching enabled categories
  allEvents: DataProviderEvent[];            // All events from all providers
  enabledCategories: Set<string>;            // Active category filter
  toggleCategory: (id: string) => void;      // Toggle a category on/off
  enabledProviders: Set<string>;             // Active providers
  toggleProvider: (id: string) => void;      // Toggle a provider on/off
  categories: CategoryConfig[];              // Categories from enabled providers
  sources: SourceConfig[];                   // Source configs from all providers
  connections: Record<string, ConnectionState[]>;  // Connection states per provider
  allCategories: CategoryConfig[];           // All categories from all providers
  allSources: SourceConfig[];                // All source configs
}
```

**Implementation flow:**
1. Maintains a `Set` of enabled provider IDs and enabled category IDs.
2. On mount, connects all providers and subscribes to their events.
3. On each event, updates a merged stats object (topTokens, traderEdges, counts, volumes).
4. Polls provider stats every 200ms to refresh the merged state.
5. `toggleProvider` calls `provider.enable()`/`disable()` and updates the set.
6. `toggleCategory` toggles a category ID in the enabled set.
7. `filteredEvents` is derived by filtering `allEvents` against `enabledCategories`.

**Stats merging:**
- `topTokens` — Concatenated from all enabled providers, deduped by mint.
- `traderEdges` — Concatenated from all enabled providers.
- `counts` — Summed across providers.
- `totalVolume` — Summed across providers per chain key.
- `totalTransactions` — Summed across providers.

---

### `packages/providers/src/useDataProvider.ts` — Deprecated PumpFun-Specific Hook

**Purpose:** Legacy hook that was PumpFun-specific. Marked `@deprecated` — use `useProviders()` instead.

Internally uses `usePumpFun()` and `usePumpFunClaims()` to aggregate PumpFun-only data. Provides a `UnifiedEvent` type and `AggregateStats`.

---

### `packages/providers/src/pump-fun/PumpFunProvider.ts` — PumpFun DataProvider

**Purpose:** Implements `DataProvider` for PumpFun (Solana token launchpad). Connects to two WebSocket streams.

**Class structure:**
```ts
class PumpFunProvider implements DataProvider {
  readonly id = 'pumpfun';
  readonly name = 'PumpFun';
  readonly sourceConfig = { id: 'pumpfun', label: 'PumpFun', color: '#a78bfa', icon: '⚡' };
  readonly categories = [LAUNCHES_CATEGORY, TRADES_CATEGORY];
}
```

**Internal state:**
- `pumpFunWs` — WebSocket connection to `wss://pumpportal.fun/api/data` for token launches + trades.
- `claimsWs` — WebSocket connection to Solana RPC for fee claim events.
- `stats` — Current aggregated statistics.
- `listeners` / `rawListeners` — Event subscriber sets.
- `paused` / `enabled` — Flow control flags.

**Event handling:**
- `handleEvent(event)` — Called by WebSocket handlers. Updates stats counters, adds to `recentEvents`, notifies all listeners.
- `handleRawEvent(raw)` — Forwards raw events to raw listeners.
- `updateTopTokens(tokens, edges)` — Called by PumpFunWs when top token rankings change.

**Connection management:**
- `connect()` — Opens both WebSocket connections.
- `disconnect()` — Closes both connections.
- `getConnections()` — Returns connection status of both WebSockets.

---

### `packages/providers/src/pump-fun/usePumpFun.ts` — PumpFun WebSocket Hook

**Purpose:** React hook that manages the PumpFun WebSocket connection lifecycle.

**State managed:**
- `tokens` — `Map<string, Token>` of all seen tokens.
- `trades` — Rolling array of recent trades (max 500).
- `topTokens` — Top tokens by trade volume.
- `traderEdges` — Trader-to-token connections.
- `rawEvents` — Rolling raw event buffer.
- `connected` — WebSocket connection status.
- `stats` — `PumpFunStats` with counts, volumes, totals.

**WebSocket protocol:**
Connects to `wss://pumpportal.fun/api/data`. After connection, subscribes to:
```json
{ "method": "subscribeNewToken" }
```
and
```json
{ "method": "subscribeTokenTrade" }
```

**Message handling:**
- Token launches: Creates a `Token` object, adds to tokens map, increments `launches` count, generates a `DataProviderEvent`.
- Trades: Creates a `Trade` object, updates volume counters, adds to trades array, updates top token rankings, generates a `DataProviderEvent`.

**Top token calculation:**
Every 100 trades, recalculates the top 50 tokens by trade count. Builds `TraderEdge` connections from the recent trades.

---

### `packages/providers/src/pump-fun/usePumpFunClaims.ts` — PumpFun Claims Hook

**Purpose:** React hook for monitoring Solana fee claim events via RPC WebSocket.

Connects to Solana RPC WebSocket (configurable URL, defaults to public endpoint). Subscribes to logs mentioning the PumpFun program address. Parses claim events from transaction logs.

**State:** `claims` array, `connected` status, claim count.

---

### `packages/providers/src/pump-fun/index.ts` — PumpFun Barrel

Re-exports `PumpFunProvider` from `PumpFunProvider.ts`.

---

### `packages/providers/src/mock/MockProvider.ts` — Mock Data Provider

**Purpose:** Generates fake token launches and trades at regular intervals for development and demo purposes.

**Configuration:**
```ts
class MockProvider implements DataProvider {
  readonly id = 'mock';
  readonly name = 'Mock Data';
  readonly sourceConfig = { id: 'mock', label: 'Demo', color: '#6b7280', icon: '🎭' };
}
```

**Mock data generation:**
- Generates a new token every 2 seconds with random names (e.g., "MockToken_A3X").
- Generates trades every 500ms with random amounts.
- Creates fake wallet addresses.
- Updates top token rankings.

**Useful for:** Testing the visualization without real WebSocket connections.

---

### `packages/providers/src/mock/index.ts`

Re-exports `MockProvider`.

---

## 6. packages/executor — Agent Execution Backend

### `packages/executor/src/index.ts` — Executor Barrel

Exports the main server class and all sub-modules:
```ts
export { ExecutorServer } from './ExecutorServer';
export { AgentManager } from './AgentManager';
export { AgentTracker } from './AgentTracker';
export { EventBroadcaster } from './EventBroadcaster';
export { TaskQueue } from './TaskQueue';
export { StateStore } from './StateStore';
export { HealthMonitor } from './HealthMonitor';
export { SperaxOSClient } from './SperaxOSClient';
export * from './types';
```

---

### `packages/executor/src/types.ts` — Executor Types

Defines executor-specific types that extend the core types:

**ExecutorConfig:**
```ts
interface ExecutorConfig {
  port: number;              // WebSocket server port
  maxAgents: number;         // Max concurrent agents
  speraxosUrl: string;       // SperaxOS API URL
  speraxosApiKey: string;    // SperaxOS API key
  statePath: string;         // SQLite database path
  heartbeatInterval: number; // Health check interval (ms)
}
```

**AgentRecord — persistent agent data:**
```ts
interface AgentRecord {
  agentId: string;
  name: string;
  role: string;
  status: string;
  parentAgentId?: string;
  createdAt: number;
  updatedAt: number;
  metadata: string;          // JSON blob
}
```

**TaskRecord — persistent task data:**
```ts
interface TaskRecord {
  taskId: string;
  agentId: string;
  description: string;
  status: string;
  startedAt?: number;
  endedAt?: number;
  result?: string;
  metadata: string;
}
```

---

### `packages/executor/src/ExecutorServer.ts` — Main Executor Server

**Purpose:** The entry point for the agent execution backend. Creates a WebSocket server that broadcasts agent events to connected frontend clients.

**Lifecycle:**
1. `start()` — Initializes StateStore (SQLite), creates WebSocket server on configured port, starts HealthMonitor, connects SperaxOSClient.
2. Accepts WebSocket connections from frontends.
3. Receives agent events from SperaxOSClient or AgentManager.
4. Broadcasts events to all connected clients via EventBroadcaster.
5. `stop()` — Gracefully shuts down all components.

**WebSocket protocol (server → client):**
Messages are JSON with structure:
```json
{
  "type": "agentEvent" | "executorState" | "heartbeat",
  "data": { ... },
  "timestamp": 1234567890
}
```

**Client connection handling:**
- On connect: sends current `ExecutorState` and all known agent identities.
- On message: handles `subscribe`/`unsubscribe` for specific agent IDs.
- On disconnect: cleans up subscriptions.

---

### `packages/executor/src/AgentManager.ts` — Agent Lifecycle Manager

**Purpose:** Manages the lifecycle of AI agents. Spawns agents, assigns tasks, tracks completion.

**Key methods:**
- `spawnAgent(name, role, parentId?)` — Creates a new agent, stores in StateStore, emits `agent_spawn` event.
- `assignTask(agentId, description)` — Creates a task, adds to TaskQueue, emits `task_start` event.
- `completeTask(taskId, result)` — Marks task as completed, emits `task_complete` event.
- `failTask(taskId, error)` — Marks task as failed, emits `task_fail` event.
- `recordToolCall(agentId, taskId, toolName, category, input)` — Records a tool invocation, emits `tool_call` event.
- `recordToolResult(toolCallId, output)` — Records tool output, emits `tool_result` event.

**Agent limits:** Respects `maxAgents` from config. Throws if limit exceeded.

---

### `packages/executor/src/AgentTracker.ts` — Agent State Tracking

**Purpose:** Maintains an in-memory view of all agents, their tasks, tool calls, and flow traces. Provides query methods for the frontend.

**Data structures:**
- `agents: Map<string, AgentIdentity>` — All known agents.
- `flows: Map<string, AgentFlowTrace>` — Execution traces per agent.
- `agentStats` — Computed metrics: total agents, active tasks, tool calls/minute, completed, failed.

**Key methods:**
- `handleEvent(event)` — Processes incoming `AgentEvent` and updates internal state.
- `getAgents()` — Returns all agents.
- `getFlows()` — Returns all flow traces.
- `getAgentStats()` — Computes and returns aggregate metrics.
- `toTopTokens()` — Converts agents to `TopToken[]` format for the graph.
- `toTraderEdges()` — Converts tool calls to `TraderEdge[]` format.

---

### `packages/executor/src/EventBroadcaster.ts` — WebSocket Event Broadcasting

**Purpose:** Manages WebSocket connections and broadcasts events to subscribed clients.

**Methods:**
- `addClient(ws)` — Registers a new WebSocket client.
- `removeClient(ws)` — Removes a client.
- `broadcast(event)` — Sends an event to ALL connected clients.
- `broadcastToSubscribers(agentId, event)` — Sends to clients subscribed to a specific agent.
- `subscribe(ws, agentId)` — Subscribes a client to events for a specific agent.
- `unsubscribe(ws, agentId)` — Unsubscribes.

---

### `packages/executor/src/TaskQueue.ts` — Task Queuing System

**Purpose:** FIFO queue for agent tasks with priority support.

**Methods:**
- `enqueue(task, priority?)` — Adds a task. Higher priority tasks are inserted earlier.
- `dequeue()` — Returns the next task (highest priority, oldest first).
- `peek()` — Returns the next task without removing it.
- `size()` — Returns queue length.
- `getTasksForAgent(agentId)` — Returns all queued tasks for a specific agent.

---

### `packages/executor/src/StateStore.ts` — SQLite Persistence

**Purpose:** Persists agent and task data to SQLite for crash recovery.

**Tables:**
- `agents` — Stores `AgentRecord` rows.
- `tasks` — Stores `TaskRecord` rows.
- `tool_calls` — Stores tool call records.
- `events` — Stores raw events for replay.

**Methods:**
- `initialize()` — Creates tables if they don't exist (using `CREATE TABLE IF NOT EXISTS`).
- `saveAgent(record)` — Upserts an agent record.
- `saveTask(record)` — Upserts a task record.
- `getAgent(agentId)` — Retrieves an agent by ID.
- `getAllAgents()` — Returns all agents.
- `getTasksForAgent(agentId)` — Returns tasks for a specific agent.
- `saveEvent(event)` — Persists a raw event.
- `getRecentEvents(limit)` — Returns the most recent events.

---

### `packages/executor/src/HealthMonitor.ts` — Executor Health Monitoring

**Purpose:** Periodically checks executor health and emits heartbeat events.

**Behavior:**
- Runs on a configurable interval (default: 5000ms).
- Checks: agent count vs. max, task queue depth, memory usage.
- Determines status: `running` (all OK), `degraded` (near limits), `stopped` (fatal).
- Emits `heartbeat` events via EventBroadcaster.
- Builds and returns `ExecutorState` objects.

---

### `packages/executor/src/SperaxOSClient.ts` — SperaxOS Integration

**Purpose:** Connects to the SperaxOS agent orchestration platform for receiving real agent events.

**Methods:**
- `connect()` — Opens WebSocket to `SPERAXOS_URL`. Authenticates with `SPERAXOS_API_KEY`.
- `disconnect()` — Closes the WebSocket.
- `onEvent(callback)` — Registers a callback for incoming agent events.
- `isConnected()` — Returns connection status.

**Protocol:** Receives JSON messages matching the `AgentEvent` type. Forwards them to registered callbacks.

---

## 7. packages/ui — Design System & Components

### `packages/ui/src/index.ts` — UI Barrel Export

```ts
export * from './primitives';
export * from './composed';
export * from './theme';
export * from './tokens';
```

---

### `packages/ui/src/tokens/colors.ts` — Color Palette

**Purpose:** Defines the color system used throughout the application.

```ts
export const colors = {
  // Graph node colors
  purple: { 50: '#faf5ff', 100: '#f3e8ff', ..., 500: '#a78bfa', 900: '#1e1b4b' },
  amber:  { 50: '#fffbeb', ..., 500: '#f59e0b' },
  emerald:{ 50: '#ecfdf5', ..., 500: '#10b981' },
  pink:   { 50: '#fdf2f8', ..., 500: '#f472b6' },

  // UI colors
  gray:   { 50: '#f9fafb', ..., 900: '#111827' },
  white:  '#ffffff',
  black:  '#000000',

  // Status colors
  success: '#22c55e',
  error:   '#ef4444',
  warning: '#f59e0b',
  info:    '#3b82f6',
};
```

---

### `packages/ui/src/tokens/agent-colors.ts` — Agent Theme Tokens

**Purpose:** Defines color tokens specifically for the agent visualization, supporting both dark and light themes.

```ts
export const agentThemeTokens = {
  dark: {
    background: '#0a0a0f',        // Near-black background
    text: '#e5e7eb',              // Light gray text
    muted: '#6b7280',             // Muted gray
    agentHub: '#1a1a2e',          // Agent hub node fill
    agentHubActive: '#c084fc',    // Active/selected agent color (purple)
    agentHubBorder: '#2d2d4a',    // Hub border
    taskNode: '#374151',          // Task node fill
    toolCall: '#818cf8',          // Tool call particle color
    edge: 'rgba(255,255,255,0.06)', // Edge line color
    reasoningHalo: '#a78bfa',     // Reasoning mode glow
    banner: '#111827',            // Executor banner background
    feedBg: '#0f0f1a',           // Live feed background
  },
  light: {
    background: '#f8f9fa',
    text: '#1a1a1a',
    muted: '#6b7280',
    agentHub: '#ffffff',
    agentHubActive: '#7c3aed',
    agentHubBorder: '#e5e7eb',
    taskNode: '#f3f4f6',
    toolCall: '#6366f1',
    edge: 'rgba(0,0,0,0.08)',
    reasoningHalo: '#8b5cf6',
    banner: '#f3f4f6',
    feedBg: '#ffffff',
  },
};
```

---

### `packages/ui/src/tokens/spacing.ts` — Spacing Scale

```ts
export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
};
```

---

### `packages/ui/src/tokens/typography.ts` — Typography Styles

```ts
export const typography = {
  fontFamily: {
    mono: "'IBM Plex Mono', monospace",
  },
  fontSize: {
    xs: '10px',
    sm: '11px',
    base: '12px',
    lg: '14px',
    xl: '16px',
    '2xl': '20px',
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.04em',
    wider: '0.08em',
    widest: '0.12em',
  },
};
```

---

### `packages/ui/src/tokens/index.ts` — Tokens Barrel

```ts
export * from './colors';
export * from './agent-colors';
export * from './spacing';
export * from './typography';
```

---

### `packages/ui/src/primitives/Button.tsx` — Button Component

A styled button component with variants: `primary`, `secondary`, `ghost`. Accepts `size` (`sm`, `md`, `lg`), `disabled`, and standard button props. Uses IBM Plex Mono font, border-radius 6px.

---

### `packages/ui/src/primitives/Input.tsx` — Input Component

A styled text input with optional `prefix` (like a search icon) and `suffix`. Monospace font, light border, focus ring.

---

### `packages/ui/src/primitives/Dialog.tsx` — Dialog Component

A modal dialog with backdrop overlay. Uses `framer-motion` for enter/exit animations. Accepts `isOpen`, `onClose`, `title`, `children`.

---

### `packages/ui/src/primitives/Badge.tsx` — Badge Component

A small colored label. Accepts `variant` (`default`, `success`, `error`, `warning`, `info`) and `children`. Renders as an inline-flex span with appropriate background color.

---

### `packages/ui/src/primitives/Pill.tsx` — Pill Component

A rounded pill shape (border-radius 9999px) used for tags and status indicators. Accepts `color`, `label`, `onClick`.

---

### `packages/ui/src/primitives/ColorControl.tsx` — Color Picker Control

A labeled color input (`<input type="color">`) with hex value display. Used in the share panel for customizing export colors.

---

### `packages/ui/src/primitives/index.ts` — Primitives Barrel

```ts
export { Button } from './Button';
export { Input } from './Input';
export { Dialog } from './Dialog';
export { Badge } from './Badge';
export { Pill } from './Pill';
export { ColorControl } from './ColorControl';
```

---

### `packages/ui/src/composed/` — Composed Components

These are higher-level components built from primitives. They are the **package versions** of the components in `features/World/` — designed to be reusable across apps.

- **`FilterSidebar.tsx`** — A sidebar with toggleable filter items. Each item has a color dot, label, and checkbox.
- **`InfoPopover.tsx`** — A popover that anchors to a button ref. Shows informational content.
- **`Journey.tsx`** — Journey overlay component showing step title, description, and skip button.
- **`LiveFeed.tsx`** — Scrolling list of recent events with auto-scroll and category coloring.
- **`ShareOverlay.tsx`** — Semi-transparent overlay showing user address and stats for screenshots.
- **`SharePanel.tsx`** — Right-side panel with color pickers, download buttons, and social share buttons.
- **`StatsBar.tsx`** — Bottom bar showing aggregate statistics with an address search input.
- **`WorldHeader.tsx`** — Top header with title and navigation links.

### `packages/ui/src/composed/index.ts`
```ts
export { FilterSidebar } from './FilterSidebar';
export { InfoPopover } from './InfoPopover';
export { Journey } from './Journey';
export { LiveFeed } from './LiveFeed';
export { ShareOverlay } from './ShareOverlay';
export { SharePanel } from './SharePanel';
export { StatsBar } from './StatsBar';
export { WorldHeader } from './WorldHeader';
```

---

### `packages/ui/src/theme/themes.ts` — Theme Definitions

```ts
export const themes = {
  light: {
    background: '#ffffff',
    foreground: '#1a1a1a',
    muted: '#666666',
    border: '#e8e8e8',
    card: '#ffffff',
    cardBorder: '#e8e8e8',
    shadow: 'rgba(0,0,0,0.08)',
  },
  dark: {
    background: '#0a0a14',
    foreground: '#e5e7eb',
    muted: '#6b7280',
    border: 'rgba(255,255,255,0.1)',
    card: '#111827',
    cardBorder: 'rgba(255,255,255,0.1)',
    shadow: 'rgba(0,0,0,0.3)',
  },
};
```

### `packages/ui/src/theme/ThemeProvider.tsx` — Theme Context Provider

A React context provider that wraps the app with theme tokens. Accepts `theme: 'light' | 'dark'`, provides the token values via `useTheme()` hook.

### `packages/ui/src/theme/index.ts`
```ts
export { ThemeProvider, useTheme } from './ThemeProvider';
export { themes } from './themes';
```

---

## 8. packages/react-graph — React Three.js Graph Wrapper

### `packages/react-graph/src/index.ts`

```ts
export { ForceGraph } from './ForceGraph';
```

### `packages/react-graph/src/ForceGraph.tsx` — Reusable Force Graph Component

**Purpose:** A reusable React component that wraps `@react-three/fiber` Canvas with force-directed graph rendering. This is the **package-level** version — the actual rendering logic lives in `features/World/ForceGraph.tsx` and `features/Agents/AgentForceGraph.tsx` which are more specialized.

**Props:**
```ts
interface ForceGraphProps {
  nodes: ForceNode[];         // Nodes to render
  edges: ForceEdge[];         // Edges to render
  width?: string;             // Canvas width
  height?: string;            // Canvas height
  backgroundColor?: string;   // Canvas clear color
  onNodeClick?: (id: string) => void;
  onNodeHover?: (id: string | null) => void;
}
```

Provides basic Three.js Canvas setup with MapControls for pan/zoom.

---

## 9. packages/utils — Shared Utilities

### `packages/utils/src/index.ts`

```ts
export * from './format';
export * from './screenshot';
export * from './shareUrl';
```

### `packages/utils/src/format.ts` — Number Formatting

```ts
export function formatCompact(value: number, prefix = ''): string {
  if (value >= 1_000_000_000) return `${prefix}${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${prefix}${(value / 1000).toFixed(1)}K`;
  return `${prefix}${value.toFixed(value < 10 ? 2 : 0)}`;
}

export function formatAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}
```

### `packages/utils/src/screenshot.ts` — Screenshot Capture

```ts
export async function captureCanvas(
  canvas: HTMLCanvasElement,
  overlayEl?: HTMLElement,
): Promise<Blob> {
  // If no overlay, just convert canvas to blob directly
  if (!overlayEl) {
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'));
  }

  // With overlay: use html2canvas to capture overlay, then composite both
  const { default: html2canvas } = await import('html2canvas');
  const overlayCanvas = await html2canvas(overlayEl, {
    backgroundColor: null,   // Transparent background
    scale: 2,                // 2x resolution for retina
  });

  // Create composite canvas
  const composite = document.createElement('canvas');
  composite.width = canvas.width;
  composite.height = canvas.height;
  const ctx = composite.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0);
  ctx.drawImage(overlayCanvas, 0, 0, composite.width, composite.height);

  return new Promise((resolve) => composite.toBlob((blob) => resolve(blob!), 'image/png'));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function timestampedFilename(prefix: string): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${ts}.png`;
}
```

### `packages/utils/src/shareUrl.ts` — Share URL Utilities

```ts
export function buildShareUrl(colors: ShareColors, address?: string): string {
  const url = new URL(window.location.origin + '/world');
  if (colors.background !== '#ffffff') url.searchParams.set('bg', colors.background);
  if (colors.protocol !== '#1a1a1a') url.searchParams.set('pc', colors.protocol);
  if (colors.user !== '#1a1a1a') url.searchParams.set('uc', colors.user);
  if (address) url.searchParams.set('address', address);
  return url.toString();
}

export function buildShareText(
  stats: { tokens: number; volume: number; transactions: number },
  url: string,
): string {
  return [
    `🌐 Exploring the blockchain in real-time`,
    `📊 ${stats.tokens} tokens | $${stats.volume} volume | ${stats.transactions} txns`,
    ``,
    url,
  ].join('\n');
}

export function parseShareParams(search: string): { colors: Partial<ShareColors> } {
  const params = new URLSearchParams(search);
  return {
    colors: {
      background: params.get('bg') || undefined,
      protocol: params.get('pc') || undefined,
      user: params.get('uc') || undefined,
    },
  };
}

export function shareOnX(text: string, url: string): void {
  window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
}

export function shareOnLinkedIn(url: string): void {
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
}
```

---

## 10. packages/tailwind-config & packages/tsconfig

### `packages/tailwind-config/tailwind.config.ts`

Shared Tailwind config for monorepo packages that use Tailwind:
```ts
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { mono: ['"IBM Plex Mono"', 'monospace'] },
    },
  },
  plugins: [],
};
```

### `packages/tsconfig/base.json` — Base TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### `packages/tsconfig/nextjs.json` — Next.js TypeScript Config

Extends `base.json`, adds:
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }]
  }
}
```

### `packages/tsconfig/react-library.json` — React Library Config

Extends `base.json`, adds:
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "react-jsx",
    "outDir": "./dist"
  }
}
```

---

## 11. features/World — World Visualization Feature

### `features/World/constants.ts` — World Constants

**Purpose:** Defines color palettes and protocol colors for the 3D graph.

```ts
// Default color palette for graph nodes (cycled for hubs without a specific color)
export const COLOR_PALETTE = [
  '#a78bfa', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#f472b6', '#06b6d4', '#84cc16', '#f97316', '#8b5cf6',
];

// Protocol-specific colors (keyed by mint/token address)
export const PROTOCOL_COLORS: Record<string, string> = {
  // Well-known PumpFun tokens get stable colors
};

// Graph layout constants
export const GRAPH_CONFIG = {
  MAX_HUBS: 50,              // Maximum hub nodes displayed
  MAX_AGENT_NODES: 5000,     // Maximum agent (leaf) nodes
  HUB_BASE_RADIUS: 0.8,     // Minimum hub sphere radius
  HUB_MAX_RADIUS: 3.0,      // Maximum hub sphere radius
  AGENT_RADIUS: 0.06,        // Agent node sphere radius
  LABEL_SCALE: 0.15,        // Protocol label text scale
  EDGE_OPACITY: 0.15,       // Default edge line opacity
  CAMERA_Z: 30,             // Default camera Z distance
};
```

---

### `features/World/ForceGraph.tsx` — 3D Force-Directed Graph (~680 lines)

**Purpose:** The core 3D visualization component. Renders token hubs as large spheres, trader nodes as small orbiting particles, and edges as lines between them.

**Architecture:**
The component uses `@react-three/fiber` to render a Three.js scene. It wraps a `<Canvas>` with a `<Scene>` inner component that handles the simulation loop.

**Key types:**
- `ForceNode` — Extends d3's `SimulationNodeDatum` with `type` ('hub' | 'agent'), `label`, `radius`, `color`, `hubMint`, `source`.
- `ForceEdge` — Link between two `ForceNode` IDs.
- `ForceGraphHandle` — Imperative handle exposed via `forwardRef`:
  - `focusHub(index, duration)` — Animates camera to a specific hub.
  - `focusAgent(address, duration)` — Animates camera to an agent node.
  - `findAgentHub(address)` — Returns the hub containing an agent address.
  - `getCanvasElement()` — Returns the underlying `<canvas>` for screenshots.

**Constants:**
- `MAX_AGENT_NODES = 5000` — Caps the number of small nodes.
- `HUB_BASE_RADIUS = 0.8` / `HUB_MAX_RADIUS = 3.0` — Hub size range.
- `AGENT_RADIUS = 0.06` — Small node size.
- `IDLE_NODE_COUNT = 40` — Ambient floating nodes when idle.
- `IDLE_SPEED = 0.08` — Speed of idle node drift.

**`Scene` inner component:**

**Hub node construction (memo):**
Converts `topTokens` into `ForceNode` objects. Each hub gets:
- ID = token mint address.
- Radius scaled by trade count relative to the top token.
- Color from `PROTOCOL_COLORS` map, falling back to `COLOR_PALETTE` cycling.

**Agent node construction (memo):**
Converts `traderEdges` into agent `ForceNode` objects, capped at `MAX_AGENT_NODES`. Each agent gets:
- ID = `user-mint` composite key.
- Positioned near its hub with random offset.
- Color inherited from parent hub.

**Edge construction (memo):**
Creates `ForceEdge` objects linking each agent node to its hub node.

**d3-force simulation:**
```ts
const simulation = forceSimulation<ForceNode>(allNodes)
  .force('link', forceLink<ForceNode, ForceEdge>(edges).id(d => d.id).distance(5))
  .force('charge', forceManyBody().strength(-15))
  .force('center', forceCenter(0, 0))
  .force('collide', forceCollide<ForceNode>().radius(d => d.radius + 0.2));
```
- `forceLink` pulls connected nodes together (distance 5).
- `forceManyBody` repels all nodes (strength -15).
- `forceCenter` pulls toward origin.
- `forceCollide` prevents overlap (radius + 0.2 padding).

**Rendering loop (`useFrame`):**
Each frame:
1. Tick the d3-force simulation.
2. Update `THREE.InstancedMesh` positions for all nodes (hub spheres + agent spheres).
3. Update edge line positions.
4. Update protocol label positions.
5. Handle camera animations (smooth transitions to focused nodes).
6. Apply share colors if share panel is open (overrides default colors).

**Idle mode:**
When `idle` is true (no active providers), renders 40 gently floating circles that drift in random directions. Creates a pleasant ambient visualization.

**Hub sphere rendering:**
Uses `THREE.InstancedMesh` for performance. Each hub is a sphere with:
- Size proportional to trade volume.
- Color from the protocol palette.
- Outline ring (slightly larger wireframe sphere) for depth.

**Agent sphere rendering:**
Uses a separate `THREE.InstancedMesh`. Each agent is a tiny sphere:
- Positioned near its hub.
- Slight random drift for organic movement.
- Fades opacity when far from camera.

**Edge rendering:**
Uses `THREE.LineSegments` with `THREE.BufferGeometry`. Each edge is a line from agent → hub.

**Protocol labels:**
Each hub has a floating text label showing the token name/symbol. Uses the `ProtocolLabel` component.

**Highlight system:**
When `highlightedAddress` or `highlightedHubIndex` is set:
- The target hub pulses (scale animation).
- Non-highlighted hubs dim.
- Camera smoothly animates to the highlighted hub.

**Active protocol:**
When `activeProtocol` (a mint address) is set:
- That hub's agents are highlighted.
- Other hubs dim.
- Click on the background dismisses the selection.

**Camera controls:**
Uses `MapControls` from `@react-three/drei`:
- Left-click drag to pan.
- Scroll to zoom.
- Right-click drag to rotate.

---

### `features/World/ProtocolLabel.tsx` — Floating Protocol Labels

**Purpose:** Renders HTML labels that float above hub nodes in the 3D scene.

Uses `@react-three/drei`'s `Html` component to place 2D HTML elements in 3D space. Each label shows:
- Token symbol (bold, 11px).
- Token name (muted, 9px).
- Trade count badge.

Labels are billboard-styled (always face the camera) and fade when distant.

---

### `features/World/ProtocolFilterSidebar.tsx` — Left Sidebar

**Purpose:** Sidebar for toggling data providers and categories on/off.

**Structure:**
- **Provider section:** Each provider has a toggle switch. Clicking enables/disables the provider's data stream.
- **Category section:** Each category (launches, trades, claims, etc.) has a toggle. When disabled, events of that category are hidden from the graph and feed.

**Layout:**
- Fixed position, left side, full height.
- 200px wide on desktop, 48px collapsed on tablet (icons only), hidden on mobile.
- Each item shows: colored dot, label, checkbox/toggle.
- Providers are grouped at the top ("SOURCES"), categories below ("CATEGORIES").

---

### `features/World/StatsBar.tsx` — Bottom Statistics Bar

**Purpose:** Bottom-edge bar showing aggregate statistics and an address search input.

**Displayed stats:**
- Total tokens (launches + agent launches).
- Total volume in SOL.
- Total trades/transactions.
- Currently highlighted address (if any), with a dismiss button.

**Address search:**
- Text input that triggers `onAddressSearch(address)` on Enter.
- Shows a brief error animation if the address is not found.
- Pill-shaped input with search icon.

---

### `features/World/TimelineBar.tsx` — Top Timeline Scrubber

**Purpose:** A horizontal bar at the top of the viewport with play/pause, timeline scrubber, and info button.

**Elements:**
- **Play/Pause button** — Toggles `isPlaying`. Shows ▶ or ⏸.
- **LIVE indicator** — Green dot + "LIVE" text when `isLive` is true.
- **Timeline scrubber** — A `<input type="range">` slider. Value is the current `timeFilter`. Range is `[min timestamp, max timestamp]`. Dragging pauses playback and sets the time filter.
- **Histogram** — Behind the scrubber, a mini bar chart of event density over time. Built from `eventTimestamps`.
- **Info button** — Triggers `onInfoClick`.

---

### `features/World/YouAreHereMarker.tsx` — Position Marker

**Purpose:** A Three.js mesh that marks the user's searched address in the 3D scene.

Renders a pulsing ring + "You" text label at the position of the highlighted node. Uses `useFrame` for the pulse animation.

---

### `features/World/SharePanel.tsx` — Share & Export Panel

**Purpose:** Right-side panel for customizing and sharing/exporting the visualization.

**`ShareColors` type:**
```ts
export interface ShareColors {
  background: string;    // Canvas background color
  protocol: string;      // Protocol hub label color
  user: string;          // User node color
}
```

**Features:**
- Three color pickers (background, protocol, user) using `<ColorControl>`.
- "Download World" button — captures raw 3D canvas.
- "Download Snapshot" button — captures canvas + overlay.
- "Share on X" button — opens Twitter intent.
- "Share on LinkedIn" button — opens LinkedIn share.
- Close button.

The panel slides in from the right with the `slideInRight` animation.

---

### `features/World/ShareOverlay.tsx` — Share Screenshot Overlay

**Purpose:** A semi-transparent overlay positioned over the 3D canvas. Included in "snapshot" downloads.

Shows:
- User address or "pump.fun" (top-left).
- "Active since Jan 2025" (top-left, below address).
- Transaction count (bottom-left).
- Volume in SOL (bottom-right).
- "PumpFun World" branding (bottom-center).

---

### `features/World/StartJourney.tsx` — Journey Start Button

**Purpose:** A button in the bottom-right that starts the guided journey/tour.

Shows:
- "Start Journey" text (first time).
- "Restart Journey" text (after completion).
- Spinning animation while journey is running.
- Disabled state while journey is active.

---

### `features/World/JourneyOverlay.tsx` — Journey Step Overlay

**Purpose:** Displays the current journey step information as a floating card.

Shows:
- Step label (e.g., "Step 1 of 5").
- Step title (e.g., "Token Launches").
- Step description.
- "Skip" button.

Uses framer-motion for slide/fade animations between steps.

---

### `features/World/useJourney.ts` — Journey Hook

**Purpose:** Manages the guided tour state machine.

**Journey steps:**
1. Overview — Camera zooms out to show the whole graph.
2. Token Launches — Camera focuses on the largest launch hub.
3. Trade Activity — Camera shows a high-volume trading hub.
4. Fee Claims — Camera highlights claim events.
5. Your Address — If the user has entered an address, zooms to it.

**State machine:**
- `idle` → `running` (on `startJourney()`)
- `running` → cycles through steps (5s each)
- Last step → `complete`
- Any step → `idle` (on `skipJourney()`)

**Returns:** `{ isComplete, isRunning, overlay: { visible, label, title, description }, skipJourney, startJourney }`

---

### `features/World/InfoPopover.tsx` — Information Popover

**Purpose:** A popover anchored to the info button showing explanation text about the visualization.

**Content sections:**
- "What is this?" — Explains the real-time 3D visualization concept.
- "How to navigate" — Pan, zoom, rotate instructions.
- "Data sources" — Lists active providers.
- "About" — Project description.

Uses `anchorRef` to position relative to the trigger button. Closes on outside click.

---

### `features/World/LiveFeed.tsx` — Live Event Feed

**Purpose:** A scrolling list of the most recent events, displayed in the bottom-right corner.

**Behavior:**
- Shows the last 50 events.
- Auto-scrolls to newest events (unless the user has scrolled up).
- Each event shows: category color dot, label, amount (if any), timestamp.
- Click on an event highlights its token in the graph.

**Layout:** Fixed position, bottom-right, 260px wide, max 40% viewport height.

---

### `features/World/LoadingScreen.tsx` — Loading Screen

**Purpose:** Full-screen loading overlay shown while the 3D canvas initializes.

**Appearance:**
- White background.
- "Web3 Realtime" title in center.
- Spinning circle animation below.
- "Connecting to data feeds..." subtitle.
- Fades out when `ready` becomes true (uses the `fadeOut` keyframe animation).

---

### `features/World/EmbedConfigurator.tsx` — Embed Code Generator

**Purpose:** A modal dialog that generates an `<iframe>` embed code for the visualization.

**Options:**
- Width/height inputs.
- Provider toggles (which data sources to include).
- Category toggles.
- Custom colors.
- "Copy Code" button that copies the `<iframe>` HTML to clipboard.

Generates a URL like: `/embed?providers=pumpfun&categories=launches,trades&bg=ffffff`.

---

### `features/World/utils/screenshot.ts` — Screenshot Utilities

Re-exports from `@web3viz/utils`:
```ts
export { captureCanvas, downloadBlob, timestampedFilename } from '@web3viz/utils';
```

### `features/World/utils/shareUrl.ts` — Share URL Utilities

Re-exports from `@web3viz/utils`:
```ts
export { buildShareUrl, buildShareText, parseShareParams, shareOnX, shareOnLinkedIn } from '@web3viz/utils';
```

---

## 12. features/Agents — Agent Visualization Feature

### `features/Agents/constants.ts` — Agent Constants

**Purpose:** Defines colors, layout, and configuration for the agent 3D graph.

```ts
// Agent color palette (assigned to agents in order)
export const AGENT_COLOR_PALETTE = [
  '#c084fc', '#f472b6', '#818cf8', '#34d399', '#fbbf24',
  '#f87171', '#38bdf8', '#a3e635', '#fb923c', '#e879f9',
];

// Named agent colors
export const AGENT_COLORS = {
  hub: '#c084fc',           // Default agent hub color
  hubActive: '#e9d5ff',     // Active/selected hub
  task: '#374151',          // Task node
  toolCall: '#818cf8',      // Tool call edge
  reasoning: '#a78bfa',     // Reasoning halo
  idle: '#6b7280',          // Idle agent
  success: '#34d399',       // Completed task
  error: '#f87171',         // Failed task
  subAgent: '#f472b6',      // Sub-agent connection
};

// Tool cluster positions (static positions for tool categories in the graph)
export const TOOL_CLUSTER_POSITIONS: Record<string, [number, number, number]> = {
  filesystem: [-15, 8, 0],
  search: [15, 8, 0],
  terminal: [-15, -8, 0],
  network: [15, -8, 0],
  code: [0, 15, 0],
  reasoning: [0, -15, 0],
};

// Tool cluster icons
export const TOOL_CLUSTER_ICONS: Record<string, string> = {
  filesystem: '📁',
  search: '🔍',
  terminal: '💻',
  network: '🌐',
  code: '⌨️',
  reasoning: '🧠',
};

// Task status colors
export const TASK_STATUS_COLORS: Record<string, string> = {
  pending: '#6b7280',
  running: '#fbbf24',
  completed: '#34d399',
  failed: '#f87171',
};

// Graph layout configuration
export const AGENT_GRAPH_CONFIG = {
  HUB_RADIUS: 1.2,           // Agent hub sphere radius
  TASK_RADIUS: 0.3,          // Task node radius
  TASK_ORBIT_RADIUS: 4,      // Distance tasks orbit from hub
  TOOL_PARTICLE_SIZE: 0.08,  // Tool call particle size
  EDGE_WIDTH: 1.5,           // Edge line width
  REASONING_HALO_RADIUS: 2,  // Reasoning mode glow radius
  HEARTBEAT_PULSE_DURATION: 1000, // Heartbeat animation duration (ms)
};
```

---

### `features/Agents/AgentForceGraph.tsx` — 3D Agent Force Graph (~800 lines)

**Purpose:** The core 3D visualization for agent activity. Renders agent hubs, task nodes, tool call particles, sub-agent edges, and reasoning halos.

**Architecture:** Similar to `ForceGraph.tsx` but specialized for agent data.

**`AgentForceGraphHandle`:**
```ts
interface AgentForceGraphHandle {
  getCanvasElement(): HTMLCanvasElement | null;
  focusAgent(agentId: string, duration?: number): void;
  fitAll(): void;
}
```

**Internal state types:**

**`AgentHubState`:**
```ts
interface AgentHubState {
  id: string;                // Agent ID
  name: string;              // Agent name
  role: string;              // Agent role
  position: THREE.Vector3;   // 3D position
  radius: number;            // Sphere radius (scales with activity)
  color: string;             // Assigned color
  activeTasks: number;       // Current running tasks
  totalToolCalls: number;    // Lifetime tool calls
  isReasoning: boolean;      // Currently in reasoning mode
  reasoningStartTime?: number;
  pulseEvents: Array<{ timestamp: number; status: 'completed' | 'failed' }>;
}
```

**`TaskNodeState`:**
```ts
interface TaskNodeState {
  taskId: string;
  agentId: string;
  position: THREE.Vector3;   // Orbits around parent hub
  orbitAngle: number;        // Current orbit angle
  orbitSpeed: number;        // Angular velocity
  status: string;
  color: string;
}
```

**`ToolParticle`:**
```ts
interface ToolParticle {
  id: string;
  fromPosition: THREE.Vector3;   // Start (agent hub)
  toPosition: THREE.Vector3;     // End (tool cluster)
  progress: number;              // 0→1 animation progress
  color: string;
  category: string;
}
```

**Rendering:**

1. **Agent hubs** — Large glowing spheres. Size scales with total tool calls. Color cycles through `AGENT_COLOR_PALETTE`. Active hub gets a brighter color.

2. **Task nodes** — Small spheres orbiting their parent agent hub. Color indicates status (pending=gray, running=yellow, completed=green, failed=red). Orbit radius is `TASK_ORBIT_RADIUS`.

3. **Tool call particles** — Tiny spheres that fly from an agent hub to a tool cluster position. Animated along a straight line with `progress` 0→1 over 500ms. Fade out at destination.

4. **Sub-agent edges** — Lines connecting parent agents to their spawned sub-agents. Colored with `AGENT_COLORS.subAgent`.

5. **Reasoning halos** — When an agent is in reasoning mode, a semi-transparent pulsing ring appears around its hub. Uses `AGENT_COLORS.reasoning`.

6. **Heartbeat pulse** — When the executor sends a heartbeat, all hubs briefly pulse (scale up and back). Duration: 1000ms.

7. **Tool cluster labels** — Static labels at fixed positions showing tool category icons and names.

**Event processing:**
The component processes `recentEvents` to create visual effects:
- `tool_call` → spawns a particle from agent hub to tool cluster.
- `task_complete` / `task_fail` → hub pulse effect.
- `reasoning_start` / `reasoning_end` → toggles reasoning halo.
- `heartbeat` → triggers global pulse.

---

### `features/Agents/AgentLabel.tsx` — Agent Hub Labels

**Purpose:** Floating HTML labels for agent hubs in the 3D scene.

Shows:
- Agent name (bold).
- Agent role (muted).
- Active task count badge.
- Status indicator dot (green=running, gray=idle).

Uses `@react-three/drei`'s `Html` for 3D-to-2D positioning.

---

### `features/Agents/AgentSidebar.tsx` — Left Agent Sidebar

**Purpose:** Lists all agents with their status, allows selection, and provides tool category filters.

**Sections:**

1. **Agent list:** Each agent shows:
   - Color dot.
   - Name and role.
   - Status indicator (idle/running/completed/failed).
   - Active task count.
   - Click to select and focus in graph.

2. **Tool categories:** Toggleable filter for tool types (filesystem, search, terminal, network, code, reasoning). When disabled, tool calls of that category are hidden from the graph.

**Props:**
```ts
interface AgentSidebarProps {
  agents: Map<string, AgentIdentity>;
  executorState: ExecutorState | null;
  activeAgentId: string | null;
  enabledToolCategories: Set<string>;
  onSelectAgent: (id: string | null) => void;
  onToolCategoryToggle: (category: string) => void;
  collapsed: boolean;        // Tablet mode (icons only)
  colorScheme: 'dark' | 'light';
}
```

---

### `features/Agents/AgentStatsBar.tsx` — Bottom Agent Stats Bar

**Purpose:** Bottom bar showing aggregate agent metrics.

**Displayed stats:**
- Total agents.
- Active tasks.
- Tool calls per minute.
- Total completed tasks.
- Total errors.

Uses the agent theme tokens for styling.

---

### `features/Agents/AgentStatusIndicator.tsx` — Status Dot Component

**Purpose:** A small colored dot that indicates agent or task status.

```ts
const STATUS_COLORS = {
  idle: '#6b7280',
  running: '#fbbf24',
  completed: '#34d399',
  failed: '#f87171',
};
```

Optionally pulses when status is `running`.

---

### `features/Agents/AgentTimeline.tsx` — Agent Event Timeline

**Purpose:** A horizontal timeline scrubber showing agent event density over time.

Similar to the World's `TimelineBar` but styled for the agent theme. Shows:
- Play/pause button.
- Time range indicator.
- Event density histogram.
- Scrub slider.

---

### `features/Agents/AgentLiveFeed.tsx` — Agent Live Event Feed

**Purpose:** Right-side scrolling feed of real-time agent events.

Each event shows:
- Event type icon (spawn, task_start, tool_call, etc.).
- Agent name (colored).
- Event description.
- Timestamp.

Auto-scrolls to newest. Click on an event selects that agent.

---

### `features/Agents/TaskInspector.tsx` — Task Inspector Panel

**Purpose:** A detailed panel showing the full execution trace of a selected task.

**`TaskInspectorPanel` props:**
```ts
interface TaskInspectorPanelProps {
  task: AgentTask;
  agent: AgentIdentity;
  toolCalls: AgentToolCall[];
  subAgents: AgentIdentity[];
  recentEvents: AgentEvent[];
  onClose: () => void;
}
```

**Sections:**
1. **Task header:** Task description, status badge, duration.
2. **Agent info:** Agent name, role, creation time.
3. **Tool calls timeline:** Chronological list of tool invocations with:
   - Tool name and category.
   - Input (truncated, expandable).
   - Output (if completed).
   - Duration.
   - Status color.
4. **Sub-agents:** List of agents spawned during this task.
5. **Result:** Task output/result (if completed).

Slides in from the right with backdrop overlay.

---

### `features/Agents/ExecutorBanner.tsx` — Executor Health Banner

**Purpose:** A thin banner at the top of the agent page showing executor status.

**States:**
- `running` — Green, "Executor Running".
- `degraded` — Yellow, "Executor Degraded".
- `stopped` — Red, "Executor Stopped".
- `null` (no connection) — Gray, "No Executor Connected".

Also shows: uptime, active agents / max agents, last heartbeat time.

---

### `features/Agents/AgentLoadingScreen.tsx` — Agent Loading Screen

**Purpose:** Loading overlay for the agent page, styled with the agent theme.

Shows:
- "Agent World" title in purple.
- Spinning hexagon animation.
- "Connecting to agent executor..." subtitle.
- Dark background (#0a0a0f).

Fades out when `ready` becomes true.

---

## 13. hooks/ — Legacy Provider Hooks

These hooks in the `hooks/` directory are a **legacy layer** from before the monorepo refactor. They wrap the `@web3viz/providers` package or provide per-chain integrations.

### `hooks/providers/index.ts` — Provider Hook Barrel

Re-exports all provider hooks and assembles convenience arrays:

```ts
export const ALL_SOURCES: SourceConfig[] = [
  PUMPFUN_SOURCE, ETHEREUM_SOURCE, BASE_SOURCE,
  AGENTS_SOURCE, ERC8004_SOURCE, CEX_SOURCE,
];

export const SOURCE_CONFIG_MAP: Record<string, SourceConfig> = { ... };
```

---

### `hooks/providers/pumpfun.ts` — PumpFun Provider Hook

Wraps `usePumpFun()` and `usePumpFunClaims()` from `@web3viz/providers`. Exports:
- `usePumpFunProvider()` — Returns unified stats, events, connection state.
- `PUMPFUN_SOURCE` — Source config (`{ id: 'pumpfun', label: 'PumpFun', color: '#a78bfa', icon: '⚡' }`).
- `PUMPFUN_CATEGORIES` — Categories array.

---

### `hooks/providers/ethereum.ts` — Ethereum Provider Hook (Stub)

Scaffolded provider for Ethereum mainnet data. Currently returns empty stats and stub connection states. Exports:
- `useEthereumProvider()` — Stub returning empty data.
- `ETHEREUM_SOURCE` — `{ id: 'ethereum', label: 'Ethereum', color: '#627eea', icon: '⟠' }`.
- `ETHEREUM_CATEGORIES` — `[{ id: 'eth-transfers', label: 'ETH Transfers', ... }]`.

---

### `hooks/providers/base.ts` — Base L2 Provider Hook (Stub)

Scaffolded provider for Base (Coinbase L2). Stub implementation. Exports:
- `useBaseProvider()` — Stub.
- `BASE_SOURCE` — `{ id: 'base', label: 'Base', color: '#0052ff', icon: '🔵' }`.
- `BASE_CATEGORIES`.

---

### `hooks/providers/agents.ts` — Agents Provider Hook

Wraps agent event handling. Exports:
- `useAgentsProvider()` — Returns agent stats, events, connection state.
- `AGENTS_SOURCE` — `{ id: 'agents', label: 'AI Agents', color: '#c084fc', icon: '⬡' }`.
- `AGENTS_CATEGORIES` — Agent-specific categories.

---

### `hooks/providers/erc8004.ts` — ERC-8004 Provider Hook (Stub)

Scaffolded provider for ERC-8004 token standard events. Stub implementation.
- `ERC8004_SOURCE` — `{ id: 'erc8004', label: 'ERC-8004', color: '#ff6b6b', icon: '📜' }`.

---

### `hooks/providers/cex.ts` — CEX Volume Provider Hook (Stub)

Scaffolded provider for centralized exchange volume data. Stub implementation.
- `CEX_SOURCE` — `{ id: 'cex', label: 'CEX Volume', color: '#fbbf24', icon: '📊' }`.

---

### `hooks/useDataProvider.ts` — Legacy Data Provider Hook

Re-exports `useDataProvider` from `@web3viz/providers`. Deprecated.

---

### `hooks/usePumpFun.ts` — Legacy PumpFun Hook

Re-exports `usePumpFun` from `@web3viz/providers`.

---

### `hooks/usePumpFunClaims.ts` — Legacy Claims Hook

Re-exports `usePumpFunClaims` from `@web3viz/providers`.

---

### `hooks/useAgentEvents.ts` — Agent Event Processing Hook

**Purpose:** Processes raw agent events into structured state.

Takes a WebSocket connection and produces:
- `agents: Map<string, AgentIdentity>` — Updated on `agent_spawn`, `agent_complete`, etc.
- `flows: Map<string, AgentFlowTrace>` — Updated on `task_start`, `tool_call`, etc.
- `executorState: ExecutorState` — Updated on `heartbeat`.
- `agentStats` — Computed from agents and flows.
- `events` — Raw event buffer.

---

### `hooks/useAgentEventsMock.ts` — Mock Agent Events

**Purpose:** Generates fake agent events for demo/development.

Creates a sequence of events simulating:
1. Agent spawn (with name and role).
2. Task starts.
3. Tool calls (various categories).
4. Tool results.
5. Task completion or failure.
6. Agent idle.

Events are generated on intervals, cycling through multiple agents. Produces realistic-looking traces.

**Mock agents:**
```ts
const MOCK_AGENTS = [
  { name: 'CodeReviewer', role: 'Analyzes code changes and provides feedback' },
  { name: 'TestRunner', role: 'Executes test suites and reports results' },
  { name: 'DocWriter', role: 'Generates documentation from source code' },
  { name: 'Deployer', role: 'Manages deployment pipelines' },
  { name: 'SecurityAuditor', role: 'Scans for security vulnerabilities' },
];
```

---

### `hooks/useAgentProvider.ts` — Agent Provider Hook

**Purpose:** Bridges agent events (real or mock) into the same format as `useProviders()` output.

```ts
interface UseAgentProviderOptions {
  mock?: boolean;      // Use mock data
  url?: string;        // SperaxOS WebSocket URL
  apiKey?: string;     // SperaxOS API key
  enabled?: boolean;   // Whether to stream data
}
```

Returns the same shape as `useProviders()` but for agent data:
- `stats` — With `topTokens` = agent hubs, `traderEdges` = tool connections.
- `agents` — Agent identity map.
- `flows` — Agent flow traces.
- `executorState` — Executor health.
- `agentStats` — Aggregate metrics.
- `connected` — Connection status.

---

### `hooks/useAgentKeyboardShortcuts.ts` — Keyboard Shortcuts

**Purpose:** Registers keyboard shortcuts for the agent page.

| Key | Action |
|---|---|
| `Space` | Toggle play/pause |
| `Escape` | Deselect agent / close inspector |
| `f` | Fit camera to all agents |
| `l` | Toggle live feed |
| `1-9` | Select agent by index |

Uses `useEffect` to add/remove `keydown` event listener.

---

## 14. providers/ — Legacy Data Provider Implementations

These are in the root `providers/` directory — an older implementation before the monorepo packages were created.

### `providers/index.ts`

Barrel export:
```ts
export * from './solana-pumpfun';
export * from './ethereum';
```

### `providers/solana-pumpfun/index.ts` — Legacy PumpFun Provider

A class-based `DataProvider` implementation for PumpFun. Very similar to `packages/providers/src/pump-fun/PumpFunProvider.ts` but designed to register itself with the global registry:
```ts
registerProvider(new PumpFunProvider());
```

### `providers/solana-pumpfun/pumpfun-ws.ts` — PumpFun WebSocket Client

**Purpose:** Low-level WebSocket client for `wss://pumpportal.fun/api/data`.

**Connection lifecycle:**
1. `connect()` — Opens WebSocket. On open, subscribes to new tokens and trades.
2. `onmessage` — Parses JSON, routes to `handleToken()` or `handleTrade()`.
3. `disconnect()` — Closes WebSocket.
4. Auto-reconnect on close (5-second delay).

**Token tracking:**
- Maintains a `Map<string, TokenStats>` tracking per-token trade counts and volumes.
- Periodically (every 100 trades) recalculates the top 50 tokens.
- Emits `onTopTokensChanged(topTokens, traderEdges)` callback.

**Trade buffering:**
- Maintains a rolling buffer of the last 500 trades.
- Extracts `TraderEdge` connections from recent trades.

### `providers/solana-pumpfun/claims-ws.ts` — Solana Claims WebSocket

Connects to Solana RPC WebSocket, subscribes to logs for the PumpFun program address, parses fee claim events.

### `providers/solana-pumpfun/categories.ts` — PumpFun Categories

```ts
export const PUMPFUN_CATEGORIES: CategoryConfig[] = [
  { id: 'launches', label: 'Token Launches', color: '#a78bfa', icon: '🚀', description: 'New token creation events' },
  { id: 'trades', label: 'Trades', color: '#f59e0b', icon: '💱', description: 'Token buy/sell transactions' },
  { id: 'claims', label: 'Fee Claims', color: '#10b981', icon: '💰', description: 'Fee claim events' },
];
```

### `providers/ethereum/index.ts` — Legacy Ethereum Provider (Stub)

Stub provider for Ethereum. Registered but not connected.

### `providers/ethereum/ethereum-ws.ts` — Ethereum WebSocket Client (Stub)

Scaffolded WebSocket client for Ethereum. No implementation.

### `providers/ethereum/constants.ts` — Ethereum Constants

```ts
export const ETHEREUM_CONFIG = {
  WS_URL: 'wss://mainnet.infura.io/ws/v3/',
  CHAIN_ID: 1,
  BLOCK_TIME: 12,  // seconds
};
```

### `providers/ethereum/categories.ts` — Ethereum Categories

```ts
export const ETHEREUM_CATEGORIES: CategoryConfig[] = [
  { id: 'eth-transfers', label: 'ETH Transfers', color: '#627eea', icon: '⟠', description: 'Native ETH transfers' },
  { id: 'erc20-transfers', label: 'ERC-20 Transfers', color: '#f59e0b', icon: '🪙', description: 'ERC-20 token transfers' },
  { id: 'nft-transfers', label: 'NFT Transfers', color: '#f472b6', icon: '🖼', description: 'ERC-721/1155 transfers' },
];
```

---

## 15. apps/playground — Development Playground

### `apps/playground/app/layout.tsx`

```ts
export const metadata = { title: 'Web3Viz Playground', description: 'Development playground' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### `apps/playground/app/page.tsx`

A simple page that imports and renders components from `@web3viz/ui` and `@web3viz/react-graph` for isolated development and testing.

### `apps/playground/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### `apps/playground/next.config.js`

```js
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@web3viz/core', '@web3viz/ui', '@web3viz/react-graph', '@web3viz/utils'],
};
module.exports = nextConfig;
```

### `apps/playground/tailwind.config.ts`

```ts
const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  presets: [require('@web3viz/tailwind-config')],  // Uses shared Tailwind config
};
```

---

## 16. Static Assets & Data

### `public/diagrams/`

SVG architecture diagrams:
- `architecture.svg` — High-level system architecture.
- `data-flow.svg` — Data flow from WebSockets to rendering.
- `executor-architecture.svg` — Executor backend architecture.
- `agent-label.svg` — Agent label component layout.
- `agent-timeline.svg` — Agent timeline component layout.

### `public/og-image.png`

Static fallback OpenGraph image (1200×630).

### `data/executor.db`

SQLite database used by the executor backend for persisting agent state. Contains tables: `agents`, `tasks`, `tool_calls`, `events`.

### `data/executor.db-shm` / `data/executor.db-wal`

SQLite shared memory and write-ahead log files. Created automatically by SQLite in WAL mode.

---

## Appendix: File Index

| # | File | Lines | Purpose |
|---|---|---|---|
| 1 | `package.json` | 43 | Root package manifest |
| 2 | `tsconfig.json` | 32 | TypeScript configuration |
| 3 | `turbo.json` | 22 | Turborepo pipeline |
| 4 | `next.config.js` | 12 | Next.js configuration |
| 5 | `postcss.config.js` | 6 | PostCSS plugins |
| 6 | `tailwind.config.ts` | 15 | Tailwind CSS config |
| 7 | `.env.example` | 17 | Environment template |
| 8 | `next-env.d.ts` | 6 | Next.js type references |
| 9 | `app/layout.tsx` | 41 | Root HTML layout |
| 10 | `app/page.tsx` | 2 | Home redirect |
| 11 | `app/globals.css` | 90 | Global styles |
| 12 | `app/opengraph-image.tsx` | 61 | OG image generation |
| 13 | `app/world/page.tsx` | 810 | World visualization page |
| 14 | `app/world/providers.ts` | 18 | Provider instances |
| 15 | `app/agents/layout.tsx` | 12 | Agents layout |
| 16 | `app/agents/page.tsx` | 600 | Agents visualization page |
| 17 | `app/embed/layout.tsx` | ~12 | Embed layout |
| 18 | `app/embed/page.tsx` | ~100 | Embed page |
| 19 | `packages/core/src/index.ts` | ~5 | Core barrel |
| 20 | `packages/core/src/types/index.ts` | ~120 | Core types |
| 21 | `packages/core/src/types/agent.ts` | ~80 | Agent types |
| 22 | `packages/core/src/providers/index.ts` | ~60 | Provider interface |
| 23 | `packages/core/src/categories/index.ts` | ~50 | Categories |
| 24 | `packages/core/src/engine/ForceGraphSimulation.ts` | ~100 | Force simulation |
| 25 | `packages/core/src/engine/SpatialHash.ts` | ~80 | Spatial hashing |
| 26 | `packages/providers/src/index.ts` | ~20 | Providers barrel |
| 27 | `packages/providers/src/useProviders.ts` | ~200 | Provider aggregation |
| 28 | `packages/providers/src/useDataProvider.ts` | ~150 | Deprecated hook |
| 29 | `packages/providers/src/pump-fun/PumpFunProvider.ts` | ~200 | PumpFun provider |
| 30 | `packages/providers/src/pump-fun/usePumpFun.ts` | ~250 | PumpFun WS hook |
| 31 | `packages/providers/src/pump-fun/usePumpFunClaims.ts` | ~120 | Claims WS hook |
| 32 | `packages/providers/src/mock/MockProvider.ts` | ~150 | Mock provider |
| 33 | `packages/executor/src/ExecutorServer.ts` | ~200 | Executor server |
| 34 | `packages/executor/src/AgentManager.ts` | ~150 | Agent management |
| 35 | `packages/executor/src/AgentTracker.ts` | ~180 | Agent tracking |
| 36 | `packages/executor/src/EventBroadcaster.ts` | ~80 | Event broadcasting |
| 37 | `packages/executor/src/TaskQueue.ts` | ~60 | Task queue |
| 38 | `packages/executor/src/StateStore.ts` | ~120 | SQLite persistence |
| 39 | `packages/executor/src/HealthMonitor.ts` | ~80 | Health monitoring |
| 40 | `packages/executor/src/SperaxOSClient.ts` | ~100 | SperaxOS client |
| 41 | `packages/ui/src/tokens/colors.ts` | ~40 | Color palette |
| 42 | `packages/ui/src/tokens/agent-colors.ts` | ~50 | Agent theme tokens |
| 43 | `packages/ui/src/tokens/spacing.ts` | ~15 | Spacing scale |
| 44 | `packages/ui/src/tokens/typography.ts` | ~30 | Typography |
| 45 | `packages/ui/src/primitives/*.tsx` | ~300 | UI primitives |
| 46 | `packages/ui/src/composed/*.tsx` | ~500 | Composed components |
| 47 | `packages/ui/src/theme/*.ts(x)` | ~80 | Theme system |
| 48 | `packages/react-graph/src/ForceGraph.tsx` | ~100 | Graph wrapper |
| 49 | `packages/utils/src/format.ts` | ~20 | Formatting |
| 50 | `packages/utils/src/screenshot.ts` | ~40 | Screenshot capture |
| 51 | `packages/utils/src/shareUrl.ts` | ~40 | Share URL utils |
| 52 | `features/World/ForceGraph.tsx` | ~680 | 3D world graph |
| 53 | `features/World/ProtocolLabel.tsx` | ~50 | Protocol labels |
| 54 | `features/World/ProtocolFilterSidebar.tsx` | ~200 | Filter sidebar |
| 55 | `features/World/StatsBar.tsx` | ~150 | Stats bar |
| 56 | `features/World/TimelineBar.tsx` | ~200 | Timeline scrubber |
| 57 | `features/World/YouAreHereMarker.tsx` | ~60 | Position marker |
| 58 | `features/World/SharePanel.tsx` | ~200 | Share panel |
| 59 | `features/World/ShareOverlay.tsx` | ~80 | Share overlay |
| 60 | `features/World/StartJourney.tsx` | ~60 | Journey button |
| 61 | `features/World/JourneyOverlay.tsx` | ~80 | Journey overlay |
| 62 | `features/World/InfoPopover.tsx` | ~100 | Info popover |
| 63 | `features/World/LiveFeed.tsx` | ~120 | Live feed |
| 64 | `features/World/LoadingScreen.tsx` | ~80 | Loading screen |
| 65 | `features/World/EmbedConfigurator.tsx` | ~150 | Embed configurator |
| 66 | `features/World/constants.ts` | ~30 | Constants |
| 67 | `features/World/useJourney.ts` | ~120 | Journey hook |
| 68 | `features/Agents/AgentForceGraph.tsx` | ~800 | 3D agent graph |
| 69 | `features/Agents/AgentLabel.tsx` | ~50 | Agent labels |
| 70 | `features/Agents/AgentSidebar.tsx` | ~200 | Agent sidebar |
| 71 | `features/Agents/AgentStatsBar.tsx` | ~100 | Agent stats |
| 72 | `features/Agents/AgentStatusIndicator.tsx` | ~30 | Status dot |
| 73 | `features/Agents/AgentTimeline.tsx` | ~150 | Agent timeline |
| 74 | `features/Agents/AgentLiveFeed.tsx` | ~120 | Agent feed |
| 75 | `features/Agents/TaskInspector.tsx` | ~200 | Task inspector |
| 76 | `features/Agents/ExecutorBanner.tsx` | ~80 | Executor banner |
| 77 | `features/Agents/AgentLoadingScreen.tsx` | ~60 | Agent loading |
| 78 | `features/Agents/constants.ts` | ~80 | Agent constants |
| 79 | `hooks/providers/*.ts` | ~500 | Provider hooks |
| 80 | `hooks/useAgentEvents.ts` | ~150 | Agent events |
| 81 | `hooks/useAgentEventsMock.ts` | ~200 | Mock events |
| 82 | `hooks/useAgentProvider.ts` | ~100 | Agent provider |
| 83 | `hooks/useAgentKeyboardShortcuts.ts` | ~50 | Keyboard shortcuts |
| 84 | `providers/solana-pumpfun/*.ts` | ~400 | Legacy PumpFun |
| 85 | `providers/ethereum/*.ts` | ~100 | Legacy Ethereum |
| 86 | `apps/playground/app/*.tsx` | ~50 | Playground app |

---

*This document was generated from a complete reading of every source file in the repository.*
