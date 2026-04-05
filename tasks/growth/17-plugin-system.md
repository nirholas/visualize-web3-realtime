# Task 17: Plugin System — Data Source Adapters

## Goal
Build a formal plugin system that makes it trivial to add new data sources, custom renderers, and themes. This turns users into contributors and creates a community flywheel.

## Context
The project already has a `DataProvider` interface, but it's internal. Making this a first-class plugin API — with a registry, discovery, and sharing mechanism — turns swarming from a library into a platform. Platforms win.

## Requirements

### 1. Plugin Types

#### Data Source Plugins
```ts
import { definePlugin } from 'swarming'

export default definePlugin({
  name: 'swarming-plugin-github',
  type: 'source',
  
  // Plugin metadata (for registry)
  meta: {
    description: 'Visualize GitHub repository activity',
    author: 'swarming-community',
    icon: '🐙',
    tags: ['github', 'git', 'social'],
  },

  // Configuration schema (generates UI automatically)
  config: {
    org: { type: 'string', label: 'GitHub Organization', required: true },
    token: { type: 'string', label: 'Personal Access Token', secret: true },
    repos: { type: 'string[]', label: 'Repositories (empty = all)' },
  },

  // Provider factory
  createProvider(config) {
    return {
      connect(emit) {
        // Poll GitHub Events API
        const interval = setInterval(async () => {
          const events = await fetchGitHubEvents(config.org, config.token)
          events.forEach(e => emit(mapToSwarmingEvent(e)))
        }, 5000)
        return () => clearInterval(interval)
      },
      getHubs() {
        return [] // auto-discovered from events
      }
    }
  }
})
```

#### Theme Plugins
```ts
export default definePlugin({
  name: 'swarming-theme-cyberpunk',
  type: 'theme',
  theme: {
    background: '#0a0a0f',
    nodeColors: ['#ff00ff', '#00ffff', '#ffff00', '#ff6600'],
    edgeColor: '#ff00ff33',
    bloomStrength: 1.5,
    bloomRadius: 0.8,
    fontFamily: 'monospace',
  }
})
```

#### Renderer Plugins (advanced)
```ts
export default definePlugin({
  name: 'swarming-renderer-voxel',
  type: 'renderer',
  renderNode(node, ctx) {
    return <VoxelMesh position={node.position} color={node.color} />
  },
  renderEdge(edge, ctx) {
    return <VoxelLine start={edge.source} end={edge.target} />
  }
})
```

### 2. Plugin Registry API
```ts
import { Swarming, usePlugin } from 'swarming'
import githubPlugin from 'swarming-plugin-github'
import cyberpunkTheme from 'swarming-theme-cyberpunk'

function App() {
  return (
    <Swarming
      plugins={[
        githubPlugin({ org: 'facebook', token: process.env.GH_TOKEN }),
        cyberpunkTheme(),
      ]}
    />
  )
}
```

### 3. Built-in Plugins (ship with core)
- `swarming-plugin-websocket` — generic WebSocket consumer
- `swarming-plugin-solana` — Solana/PumpFun data (extract from existing code)
- `swarming-plugin-ethereum` — Ethereum/Base data
- `swarming-plugin-mock` — synthetic data for testing
- `swarming-theme-dark` — default dark theme
- `swarming-theme-light` — default light theme

### 4. Community Plugin Directory
A page on the docs site listing community plugins:
```
/plugins
├── Featured Plugins
│   ├── GitHub Activity
│   ├── Kubernetes
│   └── Farcaster Social
├── Data Sources
│   ├── MQTT / IoT
│   ├── Kafka Consumer
│   ├── GraphQL Subscription
│   └── Custom REST Polling
├── Themes
│   ├── Cyberpunk
│   ├── Terminal Green
│   └── Pastel
└── Renderers
    ├── Voxel Nodes
    └── Flat 2D Mode
```

### 5. Plugin Development Kit
```bash
npx create-swarming-plugin my-plugin
```

Scaffolds:
```
my-plugin/
├── src/
│   └── index.ts          # Plugin definition
├── package.json          # Correct peer deps and keywords
├── tsconfig.json
├── README.md             # Template with usage instructions
└── dev/
    └── playground.tsx    # Local dev harness
```

### 6. Plugin Discovery
- npm keyword convention: `swarming-plugin` for data sources, `swarming-theme` for themes
- The docs site scrapes npm for packages with these keywords and lists them
- `swarming plugins list` CLI command searches npm

## Files to Create
```
packages/swarming/src/
├── plugin.ts              # definePlugin(), plugin types, plugin loader
├── plugins/
│   ├── websocket.ts
│   ├── solana.ts
│   ├── ethereum.ts
│   └── mock.ts
└── themes/
    ├── dark.ts
    └── light.ts

packages/create-swarming-plugin/
├── src/index.ts
├── template/
└── package.json

app/plugins/page.tsx       # Plugin directory
```
