# Task 03: Publishable npm SDK Package

## Goal
Extract the visualization engine into a standalone, publishable npm package with a clean public API that anyone can install and use in 3 lines of code.

## Context
The engine currently lives inside a Next.js app with tight coupling to the app's state management, providers, and UI. We need to extract the core into a dependency-free (React + Three.js) package that works in any React project.

## Requirements

### 1. Package Structure
```
packages/swarming/
├── src/
│   ├── index.ts              # Public API exports
│   ├── Swarming.tsx           # Main <Swarming /> component
│   ├── SwarmingCanvas.tsx     # R3F Canvas wrapper
│   ├── core/
│   │   ├── ForceGraph.tsx     # Force-directed graph (extracted)
│   │   ├── physics.ts         # d3-force-3d simulation
│   │   ├── SpatialHash.ts     # O(1) neighbor lookups
│   │   └── InstancedNodes.tsx # Instanced mesh rendering
│   ├── providers/
│   │   ├── types.ts           # DataProvider interface
│   │   ├── WebSocketProvider.ts
│   │   └── StaticProvider.ts
│   ├── hooks/
│   │   ├── useForceGraph.ts
│   │   ├── useMouseRepulsion.ts
│   │   └── useProximityLines.ts
│   ├── themes/
│   │   ├── dark.ts
│   │   ├── light.ts
│   │   └── types.ts
│   └── types.ts               # All public types
├── package.json
├── tsconfig.json
├── tsup.config.ts             # Bundle with tsup (ESM + CJS)
└── README.md
```

### 2. Public API (minimal, beautiful)
```tsx
// Simplest usage
import { Swarming } from 'swarming'
<Swarming source="wss://my-data-stream" />

// With options
<Swarming
  source="wss://my-data-stream"
  nodes={5000}
  theme="dark"
  interactive={true}
  onNodeClick={(node) => console.log(node)}
/>

// With custom data provider
import { Swarming, createProvider } from 'swarming'

const provider = createProvider({
  connect: (emit) => {
    const ws = new WebSocket('wss://...')
    ws.onmessage = (e) => emit(JSON.parse(e.data))
    return () => ws.close()
  }
})

<Swarming provider={provider} />

// Static data
import { Swarming } from 'swarming'
<Swarming data={[{ id: '1', label: 'Node A', connections: ['2', '3'] }, ...]} />
```

### 3. Configuration Object
```ts
interface SwarmingConfig {
  // Data
  source?: string                    // WebSocket URL
  provider?: DataProvider            // Custom provider
  data?: SwarmingNode[]              // Static data

  // Rendering
  nodes?: number                     // Max nodes (default: 2000)
  theme?: 'dark' | 'light' | ThemeConfig
  bloom?: boolean                    // Post-processing bloom (default: true)
  interactive?: boolean              // Mouse repulsion (default: true)

  // Physics
  chargeStrength?: number            // Node repulsion (default: -30)
  linkDistance?: number              // Edge length (default: 50)
  centerPull?: number               // Gravity toward center (default: 0.1)

  // Events
  onNodeClick?: (node: SwarmingNode) => void
  onNodeHover?: (node: SwarmingNode | null) => void
  onReady?: () => void

  // Layout
  width?: number | string
  height?: number | string
  className?: string
  style?: React.CSSProperties
}
```

### 4. Build & Publish
- Bundle with `tsup` (ESM + CJS + types)
- Tree-shakeable exports
- Peer dependencies: `react`, `three`, `@react-three/fiber`
- Total bundle size target: <50KB gzipped (excluding peers)
- Publish to npm as `swarming` (or `@swarming/core`)
- Include `exports` field in package.json for proper module resolution

### 5. Type Safety
- Full TypeScript types exported
- Generic `DataProvider<T>` interface for custom data shapes
- JSDoc comments on all public APIs (shows in IDE tooltips)

## Testing
- Unit tests for physics simulation
- Integration test: mount `<Swarming data={staticData} />` and verify canvas renders
- Visual regression test: screenshot comparison at 1000 nodes

## Files to Create
- `packages/swarming/` — entire new package
- Extract from: `features/World/ForceGraph.tsx`, `packages/graph/`, `packages/core/`

## Files to Modify
- `turbo.json` — add swarming package to pipeline
- `package.json` (root) — add workspace
