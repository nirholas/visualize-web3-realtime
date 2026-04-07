# Deployment

How to build, configure, and deploy web3viz.

---

## Quick Deploy to Vercel

The fastest way to get a production deployment:

```bash
npx vercel
```

Or connect your GitHub repo at [vercel.com](https://vercel.com) for automatic deploys on push.

**Vercel settings:**

| Setting | Value |
|---|---|
| Framework | Next.js |
| Build command | `npm run build` |
| Output directory | `.next` |
| Install command | `npm install` |
| Node.js version | 18.x or 20.x |

No environment variables are required for the base deployment — PumpFun data streams are unauthenticated.

---

## Build from Source

### Production build

```bash
npm install
npm run build
npm start
```

The app serves on port 3100 by default (override with `PORT` env var).

### Build all packages independently

```bash
npx turbo build
```

Turborepo builds packages in dependency order: `core` → `ui`, `react-graph`, `providers`, `utils` → `app`.

### Type-check everything

```bash
npm run typecheck
```

---

## Environment Variables

Copy `.env.example` to `.env.local` (development) or set in your hosting platform (production):

```bash
cp .env.example .env.local
```

### Application Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3100` | Server port (production) |
| `GROQ_API_KEY` | No | — | Groq API key for `/world` AI chat and `/api/world-chat` endpoint |
| `API_SECRET` | No | — | API key for protected routes (/api/executor, /api/world-chat). Clients send via `x-api-key` header. |
| `NEXT_PUBLIC_SOLANA_WS_URL` | No | — | Solana RPC WebSocket (e.g. Helius, Alchemy) |
| `NEXT_PUBLIC_ETH_WS_URL` | No | `wss://ethereum-rpc.publicnode.com` | Ethereum RPC WebSocket |
| `NEXT_PUBLIC_BASE_WS_URL` | No | `wss://base-rpc.publicnode.com` | Base chain RPC WebSocket |
| `NEXT_PUBLIC_SPERAXOS_WS_URL` | No | `wss://api.speraxos.io/agents/v1/stream` | Agent event WebSocket endpoint |
| `NEXT_PUBLIC_SPERAXOS_API_KEY` | No | — | SperaxOS API key for real agent data |
| `NEXT_PUBLIC_AGENT_MOCK` | No | `true` | Use mock agent data when no API key |

### Executor Backend Variables

Only needed if running the agent executor server (`npm run dev:executor`):

| Variable | Required | Default | Description |
|---|---|---|---|
| `EXECUTOR_URL` | No | `http://localhost:8765` | Executor backend URL (used by `/api/executor` proxy) |
| `EXECUTOR_PORT` | No | `8765` | Executor WebSocket server port |
| `EXECUTOR_MAX_AGENTS` | No | `5` | Max concurrent agents |
| `SPERAXOS_URL` | No | `https://api.speraxos.io` | SperaxOS API base URL |
| `SPERAXOS_API_KEY` | No | — | SperaxOS API key |
| `STATE_PATH` | No | `./data/executor.db` | SQLite database path |

### What Works Without Any Env Vars

The `/world` route works fully out of the box — it connects to:
- **PumpPortal WebSocket** (unauthenticated) for token launches and trades
- **Solana Mainnet RPC** (public endpoint) for claim events
- **Binance public WebSocket** (unauthenticated) for CEX volume data

No API keys needed for the core visualization experience. The AI chat requires `GROQ_API_KEY`.

---

## Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

> **Note:** For standalone output, add `output: 'standalone'` to `next.config.js`.

---

## Platform-Specific Notes

### Vercel

- Works out of the box with zero configuration
- Serverless functions handle API routes (`/api/world-chat`, `/api/executor`)
- Edge runtime not supported (Three.js requires Node.js APIs)

### Netlify

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Self-Hosted (PM2)

```bash
npm run build
pm2 start npm --name "web3viz" -- start
```

### Self-Hosted (systemd)

```ini
# /etc/systemd/system/web3viz.service
[Unit]
Description=web3viz
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/web3viz
ExecStart=/usr/bin/node .next/standalone/server.js
Environment=PORT=3000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

---

## Agent Executor Deployment

The executor is a standalone Node.js server (not part of the Next.js app):

```bash
# Development
npm run dev:executor

# Production
cd packages/executor
node dist/index.js
```

It uses SQLite for persistence (configure `STATE_PATH`) and broadcasts events over WebSocket on `EXECUTOR_PORT`.

For production, run it as a separate process alongside the Next.js app:

```bash
# Terminal 1: Next.js app
npm start

# Terminal 2: Executor
EXECUTOR_PORT=8765 STATE_PATH=/var/data/executor.db node packages/executor/dist/index.js
```

---

## Performance Tuning

### Client-side

The 3D visualization is GPU-bound. For lower-end devices:

```tsx
<ForceGraph
  simulationConfig={{
    maxAgentNodes: 2000,  // Reduce from 5000
  }}
  postProcessing={{
    enabled: false,       // Disable bloom + AO
  }}
/>
```

### Server-side

The Next.js app itself is lightweight — API routes are the only server-side code. No database, no heavy computation. A basic VPS (1 CPU, 1GB RAM) handles it fine.

The executor backend needs more resources if running many concurrent agents — size based on `EXECUTOR_MAX_AGENTS`.
