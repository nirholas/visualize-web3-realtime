# Blockchain EVM Live Visualization

Real-time force-directed graph visualization of Ethereum (or any EVM-compatible chain) transactions using `@swarming-vis/react-graph`.

Addresses become nodes and transactions become edges, forming a living network graph that updates as new transactions are broadcast.

## Prerequisites

- Node.js 18+
- An EVM WebSocket RPC endpoint (e.g. from [Infura](https://infura.io), [Alchemy](https://alchemy.com), or [QuickNode](https://quicknode.com))

## Configuration

Open `src/config.ts` and replace the default WebSocket URL with your own provider endpoint:

```ts
export const EVM_WS_URL = "wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID";
```

You can also change the chain name and graph limits:

```ts
export const CHAIN_NAME = "Ethereum";
export const MAX_NODES = 200;
export const MAX_EDGES = 500;
```

To visualize a different EVM chain (Polygon, Arbitrum, Base, etc.), just swap in the appropriate WebSocket URL and update `CHAIN_NAME`.

## Running

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build for production
npm run build

# Preview the production build
npm run preview
```

## Demo Mode

If the WebSocket connection fails (e.g. no API key configured), the app automatically falls back to demo mode, generating fake transactions every second so you can see the visualization working immediately.

## How It Works

1. **WebSocket connection** -- connects to an EVM JSON-RPC WebSocket and calls `eth_subscribe` for `newPendingTransactions` and `newHeads`.
2. **Transaction fetch** -- for each pending tx hash, calls `eth_getTransactionByHash` to get sender, receiver, and value.
3. **Graph mapping** -- sender and receiver addresses become nodes; each transaction becomes an edge between them.
4. **Visualization** -- the `<ForceGraph>` component from `@swarming-vis/react-graph` renders the graph as a 3D force-directed layout with Three.js.
