# @nirholas/swarming

3D force-directed graph visualization for the browser. Thousands of nodes, bloom, and a physics
simulation, driven by a WebSocket stream or static data. Use it from a `<script>` tag with no
build step, or as an ES module.

Built on [React Three Fiber](https://github.com/pmndrs/react-three-fiber) and
[d3-force-3d](https://github.com/vasturiano/d3-force-3d).

## Install

### Script tag (no build step)

The UMD bundle includes React, Three.js and React Three Fiber and exposes `window.Swarming`.

```html
<div id="viz" style="width: 100%; height: 600px"></div>
<script src="https://unpkg.com/@nirholas/swarming/dist/swarming.umd.js"></script>
<script>
  const viz = Swarming.create('#viz', { source: 'wss://my-data-stream' });
  viz.on('data', ({ nodeCount, edgeCount }) => console.log(nodeCount, edgeCount));
</script>
```

### ES module

```bash
npm install @nirholas/swarming react react-dom three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing
```

The script-tag bundle needs none of these; they are peers of the ES module build only.

## Quick start

```ts
import { Swarming } from '@nirholas/swarming';

const viz = Swarming.create('#viz', {
  data: {
    nodes: [
      { id: 'a', label: 'Node A', group: 'cluster-1' },
      { id: 'b', label: 'Node B', group: 'cluster-1' },
      { id: 'c', label: 'Node C', group: 'cluster-2' },
    ],
    edges: [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
    ],
  },
  theme: 'dark',
});

viz.on('ready', () => console.log('rendered'));
```

`Swarming.create(selector, options)` mounts into the first element matching the CSS `selector`
and throws if none exists.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `source` | `string` | | WebSocket URL for live data. Reconnects with exponential backoff (1s up to 30s). |
| `data` | `{ nodes: SwarmingNode[]; edges?: SwarmingEdge[] }` | | Static data, an alternative to `source`. |
| `theme` | `'dark' \| 'light'` | `'dark'` | Color theme. |
| `maxNodes` | `number` | `2000` | Hub node cap; past it the smallest hub is evicted. |
| `simulationConfig` | `ForceGraphConfig` | | Force simulation overrides, including `hubColors`. |
| `fov` | `number` | `45` | Camera field of view. |
| `cameraPosition` | `[number, number, number]` | `[0, 160, 40]` | Initial camera position. |
| `showLabels` | `boolean` | `true` | Show hub labels. |
| `postProcessing` | `boolean` | `true` | Bloom and ambient occlusion. |

### Live stream message format

Each WebSocket message is a JSON object. Two shapes are understood:

```jsonc
// Adds a hub node (or grows an existing one)
{ "type": "tokenCreate", "data": { "tokenAddress": "hub-1", "symbol": "HUB", "volume": 10 } }

// Adds an edge from a satellite node to a hub
{ "type": "trade", "data": { "trader": "wallet-1", "tokenAddress": "hub-1", "volume": 2 } }
```

`txType: "create"` and `txType: "buy" | "sell"` are accepted as aliases, and `mint` is accepted
in place of `tokenAddress`. Malformed messages are ignored.

## Instance API

`Swarming.create()` returns a `SwarmingInstance`:

| Method | Description |
|---|---|
| `pause()` / `resume()` | Stop and restart applying incoming stream data. |
| `setTheme(theme)` | Switch between `'dark'` and `'light'`. |
| `setMaxNodes(max)` | Change the hub node cap. |
| `addNode(node)` / `removeNode(id)` | Edit the graph imperatively. |
| `on(event, cb)` / `off(event, cb)` | Subscribe to `'ready'`, `'data'` (`{ nodeCount, edgeCount }`) or `'error'`. |
| `destroy()` | Close the stream, unmount, and clear the container. |

## Node and edge shape

```ts
interface SwarmingNode {
  id: string;
  label: string;
  group?: string;
  radius?: number;
  color?: string;
}

interface SwarmingEdge {
  source: string;
  target: string;
  label?: string;
}
```

## React

Inside an existing React Three Fiber app, render the scene component directly:

```tsx
import { SwarmingRenderer } from '@nirholas/swarming';

<SwarmingRenderer
  topTokens={hubs}
  traderEdges={edges}
  background="#0a0a1a"
  groundColor="#0d0d1f"
  showLabels
/>;
```

## License

Proprietary. See [LICENSE](LICENSE).
