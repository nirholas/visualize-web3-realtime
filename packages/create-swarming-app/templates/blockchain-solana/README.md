# Solana Live Swap Visualization

Real-time 3D force-directed graph of token swaps on Solana, powered by
[`@swarming-vis/react-graph`](https://github.com/swarming-vis/swarming-vis).

The app connects to the Solana mainnet WebSocket RPC and subscribes to
transaction logs from known DEX programs (Raydium, Jupiter). Each swap event
becomes a node (token) and an edge (swap) in the live graph.

If the WebSocket connection fails (e.g. rate-limited by the public endpoint),
the app automatically falls back to **demo mode** with synthetic data.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the visualization.

## Using a private RPC

The public Solana RPC endpoint is rate-limited. For reliable real-time data,
set your own WebSocket URL in `src/config.ts`:

```ts
export const SOLANA_WS_URL = "wss://your-rpc-provider.com";
```

Recommended providers: [Helius](https://helius.dev), [QuickNode](https://quicknode.com),
[Triton](https://triton.one).

## Customization

| File               | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `src/config.ts`    | RPC URL, DEX program IDs, graph limits       |
| `src/SolanaProvider.ts` | WebSocket subscription and log parsing  |
| `src/App.tsx`      | Layout, stats bar, graph props               |

### Adding more DEX programs

Add entries to `DEX_PROGRAMS` in `src/config.ts` with the program's base58 ID.
The provider will automatically subscribe to logs mentioning that program.

### Adjusting graph size

Change `MAX_NODES` and `MAX_EDGES` in `src/config.ts`. Larger values show more
history but require more memory and GPU resources.

## Build for production

```bash
npm run build
npm run preview
```

## Tech stack

- [Vite](https://vitejs.dev) + React 18 + TypeScript
- [@swarming-vis/react-graph](https://github.com/swarming-vis/swarming-vis) (React Three Fiber force graph)
- Solana JSON-RPC WebSocket API (`logsSubscribe`)
