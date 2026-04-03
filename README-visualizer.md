# visualize-web3-realtime

Real-time multi-chain transaction visualizer. Watch token buys, sells, and creates across Solana, Ethereum, BNB Chain, Base, and Arbitrum rendered as physics-based particle nodes on a dark canvas.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What it does

Each transaction is a **node** on a full-screen canvas:

- **Size** — logarithmic scale of USD amount (bigger trade = bigger node)
- **Color** — transaction type: 🟢 buy · 🔴 sell · 🟡 create · ⚫ transfer
- **Ring** — chain color: 🟣 Solana · 🔵 Ethereum · 🟡 BNB · 🔵 Base · 🔷 Arbitrum
- **Connections** — lines drawn between nodes of the same token
- **Particles** — burst effect on new transactions

Nodes have physics: center gravity, mutual repulsion, damping, and boundary bounce. They fade out after 8 seconds.

## Supported chains & sources

| Chain | Sources | Color |
|-------|---------|-------|
| Solana | Pump.fun, Raydium | `#9945FF` |
| Ethereum | Uniswap | `#627EEA` |
| BNB Chain | PancakeSwap | `#F0B90B` |
| Base | Uniswap | `#0052FF` |
| Arbitrum | Uniswap | `#28A0F0` |

## Controls

The filter panel (top-left) lets you configure:

- **Chains** — multi-select which chains to display (Solana, Ethereum, BNB, Base, Arbitrum)
- **Source** — pick a DEX source (Pump.fun, Raydium, Uniswap, PancakeSwap, or All)
- **Transaction types** — toggle buys, sells, creates, transfers independently
- **Speed** — slider from 1 to 20 transactions per second
- **Pause/Resume** — freeze the stream

## Architecture

```
app/world/page.tsx              ← Page: wires state + components
components/world/
  tx-visualizer.tsx             ← Canvas renderer (requestAnimationFrame loop)
  chain-filters.tsx             ← Filter panel with dropdowns
  live-feed.tsx                 ← Animated transaction feed (Framer Motion)
  stats-overlay.tsx             ← Stats pills (tx count, volume, breakdowns)
hooks/useTxStream.ts            ← Transaction stream hook (demo data generator)
types/visualizer.ts             ← Shared types, chain configs, color maps
```

### Canvas renderer (`tx-visualizer.tsx`)

- Uses raw Canvas 2D API for performance (no DOM nodes per transaction)
- Physics simulation: center gravity, inter-node repulsion, velocity damping
- Particle system for burst effects on new nodes
- Automatic DPR-aware resizing
- Subtle grid background

### Data hook (`useTxStream.ts`)

Currently generates **demo data** with realistic patterns:
- Power-law amount distribution (many small trades, few large)
- Variable interval with jitter for natural feel
- Token names from real memecoins per chain

To connect real data, replace the `generateTx` function with WebSocket/API calls from:
- **Pump.fun** — Solana token launches & trades
- **Helius/Birdeye** — Solana DEX aggregation
- **The Graph** — EVM DEX subgraphs
- **BSCScan API** — BNB Chain transactions

## Quick start

```bash
# This is a Next.js page — drop these files into any Next.js 14+ project with Tailwind

# Required dependencies (most Next.js projects already have these):
npm install framer-motion clsx tailwind-merge

# Then visit /world
```

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `app/world/page.tsx` | 65 | Main page with state management |
| `components/world/tx-visualizer.tsx` | 260 | Canvas-based physics simulation |
| `components/world/chain-filters.tsx` | 155 | Filter controls UI |
| `components/world/live-feed.tsx` | 115 | Animated transaction cards |
| `components/world/stats-overlay.tsx` | 95 | Stats overlay pills |
| `hooks/useTxStream.ts` | 130 | Demo data stream generator |
| `types/visualizer.ts` | 80 | TypeScript types & config |

## Connecting real data

The `useTxStream` hook is the integration point. To connect live blockchain data:

```typescript
// Example: replace demo generator with WebSocket
useEffect(() => {
  const ws = new WebSocket('wss://your-indexer.com/stream');
  ws.onmessage = (event) => {
    const raw = JSON.parse(event.data);
    const tx: VisualizerTx = {
      id: raw.signature,
      chain: 'solana',
      source: 'pumpfun',
      type: raw.side === 'buy' ? 'buy' : 'sell',
      token: raw.tokenSymbol,
      amount: raw.usdValue,
      wallet: truncateAddress(raw.wallet),
      timestamp: Date.now(),
      signature: raw.signature,
    };
    addTx(tx);
  };
  return () => ws.close();
}, []);
```

## Reference files

The repo also includes reference components from a related project:
- `components/world/LiveFeed.tsx` — SperaxOS live payment feed (uses antd-style, tRPC)
- `components/world/index.tsx` — SperaxOS world page (uses lobehub/ui, X402 protocol)
- `components/world/style.ts` — SperaxOS CSS-in-JS styles (antd-style createStyles)
- `app/api/og/world/route.tsx` — OG image generation (drizzle-orm, next/og)
- `lib/worldbank.ts` — World Bank API client for tech readiness rankings

These are kept as reference/inspiration and have unresolved dependencies.

## License

MIT
