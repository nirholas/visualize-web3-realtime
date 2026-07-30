# visualize-web3-realtime examples

GPU-accelerated real-time 3D network visualization for any streaming data source. React + Three.js + D3-force. 5,000+ nodes at 60fps.

## Example 1

```bash
git clone https://github.com/nirholas/visualize-web3-realtime.git
cd visualize-web3-realtime
npm install && npm run dev
```

## Example 2

```bash
git clone https://github.com/nirholas/visualize-web3-realtime.git
cd visualize-web3-realtime
npm install          # links every packages/* workspace
```

## Example 3

```bash
node packages/create-swarming-app/dist/index.js my-viz       # React + swarming, ready to go
node packages/create-swarming-plugin/dist/index.js my-plugin  # Plugin scaffold with hot reload
```

## Example 4

```text
localhost:3100/
├── /world           Force-directed 3D graph — live Solana/ETH/Base streams, desktop shell, AI chat
├── /agents          Agent orchestration graph — task DAGs, tool calls, reasoning traces
├── /embed           Embeddable widget — iframe or <script> tag, URL-parameterized
├── /demos/*         6 simulation scenarios (GitHub activity, K8s pods, API traffic, agents, social, IoT)
├── /playground      Live editor — modify graph parameters, observe results in real time
├── /docs            Full reference documentation
└── /plugins         Extensible plugin registry — data sources, renderers, themes
```

## Example 5

```text
┌────────────────────────────────────────────────────────────────────┐
│                        Browser / Client                            │
│                                                                    │
│  Event Sources (WebSocket/REST)                                    │
│  ├── PumpFun (Solana)    ├── Ethereum (RPC)   ├── Binance (CEX)   │
│  ├── Base (RPC)          ├── cookie.fun (REST) ├── Custom streams  │
│  └── Agent (meta)        └── Mock (synthetic)                      │
│         │                                                          │
│         ▼                                                          │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  useProviders() — event buffering, merge, filtering      │      │
│  │  BoundedMap/BoundedSet — LRU-evicting caches             │      │
│  └──────────────┬───────────────────────────────────────────┘      │
│                 │                                                   │
│    ┌────────────┼────────────┬──────────────┐                      │
│    ▼            ▼            ▼              ▼                      │
│  ForceGraph  StatsBar    LiveFeed     DesktopShell                 │
│  (R3F +      (derived    (event log)  (windowed UI)                │
│   InstancedMesh) metrics)                                          │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  GPU Pipeline: InstancedMesh → SpatialHash →            │       │
│  │  BufferGeometry → PostProcessing (SMAA/N8AO/Bloom)      │       │
│  └─────────────────────────────────────────────────────────┘       │
└────────────────────────────────────────────────────────────────────┘
```

## Example 6

```text
app/                          # Next.js App Router
  api/                        # API routes (world-chat, executor, agents/cookie, thumbnail)
  world/                      # Main 3D visualization page
  agents/                     # AI agent dashboard
  demos/                      # 6 demo scenarios (github, k8s, api, agents, social, iot)
  tools/                      # 7 tool showcases (ai-office, blockchain-viz, cosmograph...)
  blog/                       # 5 blog posts
  docs/                       # Documentation hub (catch-all route)
  playground/                 # Code editor + live preview
  showcase/                   # Community gallery
  plugins/                    # Plugin directory
  benchmarks/                 # Performance comparisons
  embed/                      # Embeddable widget
  landing/                    # Alternative landing page
features/
  World/                      # 3D blockchain visualization
    desktop/                  # Desktop shell (taskbar, windows, start menu)
    ai/                       # WorldChat + component registry
    verification/             # Giza LuminAIR ZK proof UI
    onboarding/               # 7-step walkthrough
    utils/                    # Formatting, accessibility, screenshots
  Agents/                     # Agent visualization (force graph, sidebar, inspector)
  Scrollytelling/             # Scroll-driven home page animations
  Landing/                    # Editorial engine, 3D Giza scene, GLSL shaders
  Demos/                      # Demo datasets and simulation hook
  Tools/                      # Tool demo components (7 visualizations)
packages/
  core/                       # Types, engine, categories, plugins, themes
  providers/                  # Data providers, WebSocketManager, BoundedMap
  react-graph/                # ForceGraph R3F component, PostProcessing
  ui/                         # Design system, tokens, components
  utils/                      # Snapshots, sharing, formatting
  mcp/                        # MCP server (DeFi Llama, cookie.fun, proofs)
  executor/                   # Agent execution server (broken: missing ws dep)
  engine/                     # Framework-agnostic simulation
  react/                      # React wrapper
  vue/                        # Vue 3 wrapper
  svelte/                     # Svelte wrapper
  react-native/               # React Native + Expo
  swarming/                   # CDN/UMD bundle
  swarming-physics/           # Rust/WASM Barnes-Hut
  swarming-collab-server/     # Multiplayer WebSocket relay
  agent-bridge/               # External agent CLI connector
  create-swarming-app/        # Project scaffolder
  create-swarming-plugin/     # Plugin scaffolder
apps/
  playground/                 # Standalone demo app (broken: broken import)
  mobile-demo/                # Expo React Native demo
hooks/                        # useAgentEvents, useAgentProvider, useAgentKeyboardShortcuts
public/
  .well-known/                # Web3 metadata (x402, nostr, DID, wallets, security.txt)
  diagrams/                   # 18 SVG architecture diagrams
scripts/                      # capture-assets.ts, record-demo.sh, pre-commit hook
benchmarks/                   # Performance benchmarking suite (Playwright + Chrome)
docs/                         # Markdown documentation
prompts/                      # 19 AI development prompts
tasks/                        # 41 project task files
```


Every snippet above is taken from the [repository documentation](https://github.com/nirholas/visualize-web3-realtime#readme).
