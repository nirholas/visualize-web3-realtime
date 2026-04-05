# swarming

3D force-directed graph visualization for React. Render thousands of interactive nodes in 3 lines of code.

Built on [React Three Fiber](https://github.com/pmndrs/react-three-fiber) and [d3-force-3d](https://github.com/vasturiano/d3-force-3d).

## Install

```bash
npm install swarming react three @react-three/fiber @react-three/drei
```

## Quick Start

```tsx
import { Swarming } from 'swarming'

// Connect to a WebSocket stream
<Swarming source="wss://my-data-stream" />

// Or use static data
<Swarming data={[
  { id: '1', label: 'Node A', group: 'cluster-1', connections: ['2', '3'] },
  { id: '2', label: 'Node B', group: 'cluster-1' },
  { id: '3', label: 'Node C', group: 'cluster-2' },
]} />
```

## API

### `<Swarming />` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `source` | `string` | — | WebSocket URL for live data |
| `provider` | `DataProvider` | — | Custom data provider |
| `data` | `SwarmingNode[]` | — | Static node array |
| `nodes` | `number` | `2000` | Maximum nodes to render |
| `theme` | `'dark' \| 'light' \| ThemeConfig` | `'dark'` | Visual theme |
| `bloom` | `boolean` | `true` | Post-processing bloom |
| `interactive` | `boolean` | `true` | Mouse repulsion effect |
| `chargeStrength` | `number` | `-200` | Node repulsion force |
| `linkDistance` | `number` | `25` | Target edge length |
| `centerPull` | `number` | `0.03` | Center gravity |
| `onNodeClick` | `(node) => void` | — | Node click handler |
| `onNodeHover` | `(node \| null) => void` | — | Node hover handler |
| `onReady` | `() => void` | — | Canvas ready callback |
| `width` | `number \| string` | `'100%'` | Container width |
| `height` | `number \| string` | `'100%'` | Container height |
| `className` | `string` | — | Container CSS class |
| `style` | `CSSProperties` | — | Container inline styles |

### Custom Data Provider

```tsx
import { Swarming, createProvider } from 'swarming'

const provider = createProvider({
  connect: (emit) => {
    const ws = new WebSocket('wss://...')
    ws.onmessage = (e) => emit(JSON.parse(e.data))
    return () => ws.close()
  }
})

<Swarming provider={provider} />
```

### Imperative API (via ref)

```tsx
import { useRef } from 'react'
import { Swarming, type SwarmingHandle } from 'swarming'

function App() {
  const ref = useRef<SwarmingHandle>(null)

  return (
    <>
      <button onClick={() => ref.current?.takeSnapshot()}>Screenshot</button>
      <Swarming ref={ref} data={nodes} />
    </>
  )
}
```

### `SwarmingHandle` Methods

| Method | Description |
|--------|-------------|
| `animateCameraTo(pos, lookAt?, duration?)` | Animate camera to position |
| `focusGroup(index, duration?)` | Focus camera on a group |
| `getCanvasElement()` | Get the underlying `<canvas>` |
| `takeSnapshot()` | Capture as PNG data URL |
| `reheat(alpha?)` | Restart physics simulation |

### Node Shape

```ts
interface SwarmingNode {
  id: string              // Required: unique identifier
  label?: string          // Display label
  connections?: string[]  // IDs of connected nodes
  group?: string          // Cluster group name
  size?: number           // Visual size override
  color?: string          // Hex color override
  meta?: Record<string, unknown>  // Custom metadata
}
```

### Themes

```tsx
import { Swarming, dark, light } from 'swarming'

// Built-in themes
<Swarming theme="dark" data={nodes} />
<Swarming theme="light" data={nodes} />

// Custom theme
<Swarming theme={{
  background: '#1a1a2e',
  hubColors: ['#818cf8', '#00d395', '#ff6b35'],
  leafColor: '#555577',
  hubEdgeColor: '#333355',
  leafEdgeColor: '#222244',
  labelColor: '#e0e0ff',
  labelBackground: 'rgba(10, 10, 26, 0.85)',
  hubEmissive: 2.0,
  leafEmissive: 1.5,
  bloomIntensity: 1.2,
  bloomThreshold: 0.85,
}} data={nodes} />
```

## Advanced: Direct Simulation Access

```ts
import { SwarmingSimulation, SpatialHash } from 'swarming'

const sim = new SwarmingSimulation({ maxNodes: 5000, hubCharge: -300 })
// Use sim.update(), sim.tick(), sim.getHubNodes() etc.
```

## Peer Dependencies

| Package | Version |
|---------|---------|
| `react` | >=18 |
| `three` | >=0.150 |
| `@react-three/fiber` | >=8 |
| `@react-three/drei` | >=9 |
| `@react-three/postprocessing` | >=2 (optional) |
| `postprocessing` | >=6 (optional) |

## License

MIT
