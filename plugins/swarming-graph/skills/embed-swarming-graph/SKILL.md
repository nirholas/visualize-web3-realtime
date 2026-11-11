---
name: embed-swarming-graph
description: Embed the @nirholas/swarming 3D force-directed graph in a web page from a CDN script tag or as an ES module, with static nodes and edges or a live WebSocket stream. Use when a user wants a real-time network or transaction graph visualization in the browser.
---

# Embed the Swarming graph

`@nirholas/swarming` renders thousands of nodes with bloom and a physics simulation using React Three Fiber and d3-force-3d. It is published on npm (0.1.0). The root repo is a Next.js app that uses it; you only need the package.

## Script tag (no build step)

The UMD bundle includes React, Three.js and React Three Fiber and exposes `window.Swarming`:

```html
<div id="viz" style="width: 100%; height: 600px"></div>
<script src="https://unpkg.com/@nirholas/swarming/dist/swarming.umd.js"></script>
<script>
  const viz = Swarming.create('#viz', { source: 'wss://my-data-stream' });
  viz.on('data', ({ nodeCount, edgeCount }) => console.log(nodeCount, edgeCount));
</script>
```

Pin a version in the URL for production (`@nirholas/swarming@0.1.0`). The container needs an explicit height.

## ES module

```
npm install @nirholas/swarming react react-dom three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing
```

```ts
import { Swarming } from '@nirholas/swarming';

const viz = Swarming.create('#viz', {
  data: {
    nodes: [
      { id: 'a', label: 'Node A', group: 'cluster-1' },
      { id: 'b', label: 'Node B', group: 'cluster-1' },
    ],
    edges: [{ source: 'a', target: 'b' }],
  },
  theme: 'dark',
});
```

`Swarming.create(selector, options)` mounts into the first element matching the selector and throws if none exists.

## Options

`source` (WebSocket URL, reconnects with backoff), `data` (`{ nodes, edges? }`, an alternative to `source`), `theme` (`'dark' | 'light'`, default dark), `maxNodes` (default 2000; the smallest hub is evicted past it), `simulationConfig`, `fov` (45), `cameraPosition` (`[0, 160, 40]`), `showLabels` (true), `postProcessing` (true; turn off on weak GPUs).

Node: `{ id, label, group?, radius?, color? }`. Edge: `{ source, target, label? }`.

## Live stream messages

Each WebSocket message is JSON. A hub is added or grown by `{ "type": "tokenCreate", "data": { "tokenAddress": "hub-1", "symbol": "HUB", "volume": 10 } }`. An edge from a satellite to a hub is `{ "type": "trade", "data": { "trader": "wallet-1", "tokenAddress": "hub-1", "volume": 2 } }`. `txType: "create"` and `txType: "buy" | "sell"` are accepted aliases and `mint` replaces `tokenAddress`. Malformed messages are ignored.

## Instance API

`pause()`, `resume()` (stop or restart applying stream data), `setTheme(theme)`, `setMaxNodes(max)`, `addNode(node)`, `removeNode(id)`, `on(event, cb)` and `off(event, cb)` for `'ready'`, `'data'` and `'error'`, and `destroy()` to close the stream and unmount. Call `destroy()` when removing the container.

Inside an existing React Three Fiber scene, use the `SwarmingRenderer` component instead (props such as `topTokens`, `traderEdges`, `background`, `groundColor`, `showLabels`).
