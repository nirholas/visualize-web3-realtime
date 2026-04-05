# Task 05: Single-Component API — `<Swarming />`

## Goal
Create a single React component that encapsulates the entire visualization. A developer should go from `npm install` to a working 3D force graph in exactly 3 lines of JSX.

## Context
The current codebase requires wiring up ForceGraph, providers, Canvas, post-processing, and state management manually. The `<Swarming />` component is the "batteries-included" wrapper that handles all of this.

## Requirements

### 1. Zero-Config Usage
```tsx
// This must work with zero additional setup
import { Swarming } from 'swarming'

export default function App() {
  return <Swarming source="wss://pumpportal.fun/api/data" />
}
```

The component must:
- Create its own R3F Canvas
- Initialize the force simulation
- Connect to the WebSocket
- Parse incoming messages (with sensible defaults for JSON)
- Render nodes with instanced meshes
- Apply bloom post-processing
- Handle mouse interaction
- Fill its container (width/height 100%)
- Clean up on unmount

### 2. Progressive Disclosure API
```tsx
// Level 1: Just show me something
<Swarming source="wss://..." />

// Level 2: Basic customization
<Swarming
  source="wss://..."
  theme="light"
  maxNodes={3000}
  bloom={false}
/>

// Level 3: Custom data mapping
<Swarming
  source="wss://..."
  mapEvent={(raw) => ({
    id: raw.txHash,
    label: raw.token,
    group: raw.type,
    value: raw.amount,
  })}
/>

// Level 4: Full control
<Swarming
  provider={myCustomProvider}
  physics={{ charge: -50, linkDistance: 80, damping: 0.95 }}
  theme={myCustomTheme}
  renderNode={(node) => <CustomNodeMesh node={node} />}
  renderEdge={(edge) => <CustomEdgeLine edge={edge} />}
  camera={{ position: [0, 0, 200], fov: 75 }}
  onNodeClick={handleClick}
  onNodeHover={handleHover}
  onFrame={handleFrame}
/>
```

### 3. Static Data Mode
```tsx
// For non-streaming use cases
<Swarming
  data={{
    nodes: [
      { id: '1', label: 'API Server', group: 'backend' },
      { id: '2', label: 'Database', group: 'data' },
      { id: '3', label: 'Cache', group: 'data' },
    ],
    edges: [
      { source: '1', target: '2' },
      { source: '1', target: '3' },
    ]
  }}
/>
```

### 4. Headless Mode (for advanced users)
```tsx
import { useSwarmingEngine } from 'swarming'

function CustomVisualization() {
  const { nodes, edges, simulation, addNode, removeNode } = useSwarmingEngine({
    source: 'wss://...',
  })

  // Render however you want — you own the Canvas
  return (
    <Canvas>
      {nodes.map(node => <MyNode key={node.id} {...node} />)}
    </Canvas>
  )
}
```

### 5. SSR Safety
- Component must render nothing on server (dynamic import with `ssr: false` or `useEffect` guard)
- No `window` or `document` access at module level
- Works with Next.js App Router and Pages Router
- Works with Remix, Gatsby, Astro

### 6. Default Styling
- The component creates its own container div with `position: relative; width: 100%; height: 100%`
- If the parent has no explicit height, default to `100vh`
- Include a minimal loading state (subtle pulse animation) while WebSocket connects
- Include a connection error state with retry button

## Implementation Notes
- Wrap the existing `ForceGraph` + Canvas + bloom pipeline into a single component
- Use React context internally for state management (no external stores required)
- Lazy-load Three.js and R3F to minimize initial bundle impact
- All physics constants should have sensible defaults that produce a beautiful visualization out of the box

## Files to Create/Modify
- `packages/swarming/src/Swarming.tsx` — main component
- `packages/swarming/src/hooks/useSwarmingEngine.ts` — headless hook
- `packages/swarming/src/SwarmingCanvas.tsx` — R3F canvas wrapper
- `packages/swarming/src/defaults.ts` — default physics, theme, mapping configs
