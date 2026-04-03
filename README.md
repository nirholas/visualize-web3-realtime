# PumpFun World — Real-Time 3D Solana Visualizer

A real-time, interactive 3D particle network that visualizes every token launch, trade, and claim happening on [PumpFun](https://pump.fun) (Solana). Built with Next.js, React Three Fiber, and live WebSocket streams from on-chain data.

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:3100** — you'll be redirected to the `/world` visualizer automatically.

## Features

### 3D Force Network

The core visualization is a hub-and-spoke particle system rendered in Three.js via React Three Fiber. A central origin node sits at the center, surrounded by radial protocol hubs — each representing a category of on-chain activity. Thousands of particles orbit each hub in 3D space, with proximity-based connection lines drawn between nearby nodes using a spatial hash for performance.

Mouse interaction drives physics: nodes repel from the cursor and spring back via Hooke's Law. The camera orbits continuously and can be controlled programmatically for focus animations and guided tours.

### Live Data Streams

Two concurrent WebSocket connections power the visualization:

| Source | Endpoint | Events |
|---|---|---|
| PumpPortal | `wss://pumpportal.fun/api/data` | Token launches, buy/sell trades |
| Solana Mainnet | `wss://api.mainnet-beta.solana.com` | Wallet claims, GitHub claims, first claims |

AI agent launches are auto-detected by scanning token names for keywords like `agent`, `ai`, `gpt`, `bot`, etc.

### Six Event Categories

Each category has a distinct color and hub in the network:

| Category | Color | Description |
|---|---|---|
| Launches | Purple | New token mints |
| Agent Launches | Pink | AI/bot-related token mints |
| Trades | Blue | Buy and sell transactions |
| Wallet Claims | Amber | PumpFun wallet claim events |
| GitHub Claims | Emerald | Social/GitHub verification claims |
| First Claims | Red | First-ever claim per address |

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

```
app/
  page.tsx              → Redirect to /world
  world/page.tsx        → Main page — composes all features
  layout.tsx            → Root layout, loads IBM Plex Mono
  globals.css           → Light theme, animations, responsive breakpoints

features/
  X402Flow/
    X402Network.tsx     → 3D visualization engine (React Three Fiber)
    types.ts            → TypeScript types for flow traces and stages
  World/
    LiveFeed.tsx        → Animated event log
    ProtocolFilterSidebar.tsx → Category toggle buttons
    StatsBar.tsx        → Counters + address search
    SharePanel.tsx      → Color customization + export
    ShareOverlay.tsx    → Metadata bars for screenshots
    InfoPopover.tsx     → Info dialog
    JourneyOverlay.tsx  → Tour step overlay
    StartJourney.tsx    → Tour trigger button
    YouAreHereMarker.tsx → 3D address marker
    useJourney.ts       → Tour state machine

hooks/
  useDataProvider.ts    → Unified data layer (aggregates both WS sources)
  usePumpFun.ts         → PumpPortal WebSocket (launches + trades)
  usePumpFunClaims.ts   → Solana mainnet WebSocket (claims)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| 3D Rendering | Three.js, @react-three/fiber, @react-three/drei |
| Animation | Framer Motion |
| Styling | Tailwind CSS, IBM Plex Mono |
| Data | WebSocket (PumpPortal API + Solana RPC) |
| Export | html2canvas |

## Scripts

```bash
npm run dev        # Start dev server on port 3100
npm run build      # Production build
npm run start      # Production server on port 3100
npm run lint       # ESLint
npm run typecheck  # TypeScript type checking
```

## License

Private.
