# PumpFun World — Real-Time 3D Solana Visualizer

A real-time, interactive 3D particle network that visualizes every token launch, trade, and claim happening on [PumpFun](https://pump.fun) (Solana). Built with Next.js 14, React Three Fiber, and dual WebSocket streams from on-chain data.

2,000 particles orbit 8 protocol hub nodes with spring physics, mouse repulsion, and proximity-based connection lines — all powered by live PumpFun trades and Solana claim events.

---

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:3100** — you'll be redirected to the `/world` visualizer automatically.

No environment variables are required. The app connects directly to public WebSocket endpoints.

## Features

### 3D Force Network

The core visualization is a hub-and-spoke particle system rendered in Three.js via React Three Fiber:

- **Hub layout** — 8 hubs positioned via golden-angle spiral for even spacing, connected to a central origin by animated spoke lines
- **Particles** — 250 particles per hub (2,000 total). Each orbits its hub on a tilted plane with spring physics (Hooke's Law) and framerate-independent damping (`damping^(dt*60)`)
- **Mouse repulsion** — Raycasted cursor pushes nearby particles outward within a configurable repulsion radius
- **Proximity web** — A `SpatialHash` grid provides O(1) neighbor lookups for drawing connection lines between nearby particles (up to 800 proximity lines, sampling every 4th particle)
- **Hub tethers** — 40 tether lines per hub connect particles back to their hub center
- **Additive blending** — Particles and lines use additive blending for a luminous, glowing effect
- **Camera** — Continuous orbit (0.06 rad/s) with programmatic focus animations and ease-out cubic interpolation

### Live Data Streams

Two concurrent WebSocket connections power the visualization:

| Source | Endpoint | Events |
|---|---|---|
| PumpPortal | `wss://pumpportal.fun/api/data` | Token launches, buy/sell trades |
| Solana Mainnet | `wss://api.mainnet-beta.solana.com` | Wallet claims, GitHub claims, first claims |

AI agent launches are auto-detected by scanning token names for keywords like `agent`, `ai`, `gpt`, `bot`, etc.

### Six Event Categories

Each category has a distinct color, icon, and hub in the network:

| Category | Icon | Color | Hex | Description |
|---|---|---|---|---|
| Launches | ⚡ | Purple | `#a78bfa` | New token mints |
| Agent Launches | ⬡ | Pink | `#f472b6` | AI/bot-related token mints (regex keyword detection) |
| Trades | ▲ | Blue | `#60a5fa` | Buy and sell transactions |
| Wallet Claims | ◆ | Amber | `#fbbf24` | PumpFun wallet claim events |
| GitHub Claims | ⬢ | Emerald | `#34d399` | Social/GitHub verification claims |
| First Claims | ★ | Red | `#f87171` | First-ever claim per address |

**Agent detection** uses a regex heuristic scanning token name/symbol for keywords: `agent`, `ai`, `gpt`, `bot`, `auto`, `llm`, `claude`, `openai`, `chatgpt`, `neural`, `sentient`, `autonomous`.

**Claim detection** parses Solana program logs, matching 8-byte hex discriminators against three PumpFun program IDs (`PUMP_PROGRAM`, `PUMP_AMM`, `PUMP_FEE`).

### UI Components

- **Protocol Filter Sidebar** — Toggle event categories on/off with colored circular buttons (left side)
- **Live Feed** — Scrolling, animated event log showing token symbol, trade type, SOL amount, and timestamp (bottom-right)
- **Stats Bar** — Animated counters for total tokens, SOL volume, and transaction count with address search (bottom-center)
- **Address Search** — Enter a Solana address to highlight it in the network and fly the camera to its hub
- **"You Are Here" Marker** — 3D floating label that tracks a searched address node in the scene

### Guided Tour ("Start Journey")

A 6-7 step narrated camera tour through the network:

1. Welcome overview — zooms out to show the full network
2. Cluster stats — highlights launch, trader, and transaction counts
3. Busiest hub — camera flies to the most active category
4. Second-busiest hub
5. Trade connections — explains the visual link system
6. "You Are Here" — locates your address (if provided)
7. Free exploration — releases orbit controls

Skippable and restartable at any time.

### Share & Export

- **Color Customization** — Change background, protocol node, and user node colors via hex input, swatch palette, or a "Remix" button for random combos
- **Screenshot Export** — Download the current visualization as an image (via html2canvas) with metadata overlays showing address, stats, and "Active since" date
- **Info Popover** — Accessible dialog explaining what PumpFun World is, with focus trapping and keyboard support

## Architecture

### Data Flow

```
┌─────────────────────────┐     ┌──────────────────────────────┐
│  PumpFun WebSocket       │     │  Solana RPC WebSocket         │
│  wss://pumpportal.fun    │     │  wss://api.mainnet-beta.      │
│  /api/data               │     │  solana.com                   │
└───────────┬─────────────┘     └───────────┬──────────────────┘
            │                               │
       usePumpFun()                  usePumpFunClaims()
       token creates +               program log parsing
       all trades                    (logsSubscribe)
            │                               │
            └───────────┬───────────────────┘
                        │
                useDataProvider()
                merge → categorize → filter
                (max 300 unified events)
                        │
                 ┌──────┴───────┐
                 │   WorldPage   │  app/world/page.tsx
                 └──────┬───────┘
       ┌────────────────┼─────────────────────┐
       │                │                     │
  X402Network       StatsBar              LiveFeed
  (3D canvas)    (stats + search)    (event log)
```

### Routes

| Route | Description |
|---|---|
| `/` | Redirects to `/world` |
| `/world` | Main visualization page (client-rendered) |
| `/world?address=<addr>` | Auto-searches for a Solana address on load |

`X402Network` is lazy-loaded via `next/dynamic` with `ssr: false` since Three.js requires the browser DOM.

### Project Structure

```
app/
  page.tsx                    → Redirect to /world
  world/page.tsx              → Main page — orchestrates all state and components
  layout.tsx                  → Root layout, loads IBM Plex Mono font
  globals.css                 → Light theme, keyframes, responsive breakpoints

features/
  X402Flow/
    X402Network.tsx           → 3D visualization engine (~1,800 lines)
    types.ts                  → TypeScript types for flow traces and stages
  World/
    LiveFeed.tsx              → Animated event log (bottom-right)
    ProtocolFilterSidebar.tsx → Category toggle buttons (left sidebar)
    StatsBar.tsx              → Animated counters + address search (bottom-center)
    SharePanel.tsx            → Color customization + swatch palette (right panel)
    ShareOverlay.tsx          → Metadata bars for screenshot capture
    InfoPopover.tsx           → Accessible info dialog (focus trap, keyboard nav)
    JourneyOverlay.tsx        → Tour step overlay with Framer Motion transitions
    StartJourney.tsx          → Tour trigger button (bottom-right)
    YouAreHereMarker.tsx      → 3D floating label (Three.js Html component)
    useJourney.ts             → Tour state machine + camera animation sequencer

hooks/
  useDataProvider.ts          → Unified data layer (merges + categorizes both WS)
  usePumpFun.ts               → PumpPortal WebSocket (launches + trades)
  usePumpFunClaims.ts         → Solana mainnet WebSocket (claim log parsing)
```

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.2 |
| UI | React | 18.3 |
| 3D Engine | Three.js | 0.169 |
| 3D React | @react-three/fiber + @react-three/drei | 8.18 / 9.122 |
| Animation | Framer Motion | 11 |
| Styling | Tailwind CSS + IBM Plex Mono | 3.4 |
| Data | WebSocket (PumpPortal API + Solana RPC) | — |
| Export | html2canvas | 1.4 |
| Language | TypeScript (strict mode) | 5.5 |

---

## Configuration Reference

### Network Visualization

| Parameter | Value | Location |
|---|---|---|
| Hub count | 8 | `NETWORK_CONFIG` |
| Particles per hub | 250 (2,000 total) | `NETWORK_CONFIG` |
| Proximity threshold | 1.8 | `NETWORK_CONFIG` |
| Max proximity lines | 800 | `NETWORK_CONFIG` |
| Tether lines per hub | 40 | `NETWORK_CONFIG` |
| Repulsion radius | 6 | `NETWORK_CONFIG` |
| Spring constant (K) | 2.5 | `NETWORK_CONFIG` |
| Damping | 0.92 | `NETWORK_CONFIG` |
| Camera orbit speed | 0.06 rad/s | `NETWORK_CONFIG` |
| Hub spread radius | 18 | `NETWORK_CONFIG` |
| Cluster radius | 4 | `NETWORK_CONFIG` |

### Data Buffers

| Parameter | Value | Location |
|---|---|---|
| Max recent events (PumpFun) | 200 | `usePumpFun.ts` |
| Max recent events (claims) | 200 | `usePumpFunClaims.ts` |
| Max unified events | 300 | `useDataProvider.ts` |
| Top tokens tracked | 8 | `usePumpFun.ts` |
| Max trader edges | 5,000 | `usePumpFun.ts` |
| Category flow rebuild interval | ~20 transactions | `world/page.tsx` |
| PumpFun auto-reconnect | 3 seconds | `usePumpFun.ts` |
| Solana auto-reconnect | 5 seconds | `usePumpFunClaims.ts` |

---

## Code Conventions

- **Memoization** — All components use `React.memo()`; callbacks wrapped with `useCallback`; computed values with `useMemo`
- **Refs over state** for per-frame data (positions, velocities, mouse coordinates) to avoid re-renders in the animation loop
- **`forwardRef` + `useImperativeHandle`** on `X402Network` to expose a camera control API:
  - `focusHub(index)` — animate camera to a specific hub
  - `animateCameraTo(position, lookAt)` — custom camera animation
  - `setOrbitEnabled(bool)` — enable/disable continuous orbit
  - `getHubPosition(index)` — get current position of a hub
  - `getHubCount()` — number of active hubs
- **`'use client'`** on all interactive components (Next.js App Router convention)
- **URL state sync** — Address search syncs bidirectionally via `useSearchParams` / `router.replace`
- **Inline styles** — Most components use React `style` props rather than Tailwind classes for precise control over glass-morphism (`backdrop-filter: blur`) and dynamic values
- **Framerate-independent physics** — Damping normalized to 60fps via `damping^(dt*60)`

---

## Responsive Design

The UI adapts at three breakpoints defined in `globals.css`:

| Breakpoint | Behavior |
|---|---|
| > 1200px | Full UI — sidebar with labels, all stats, live feed |
| ≤ 1200px | Sidebar labels hidden, stats bar wraps |
| ≤ 768px | Sidebar hidden, excess stats hidden, timeline ticks hidden, live feed hidden |
| All sizes | 3D canvas fills the full viewport |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 3100 |
| `npm run build` | Production build |
| `npm start` | Production server on port 3100 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type-checking (`tsc --noEmit`) |

---

## License

Private.
