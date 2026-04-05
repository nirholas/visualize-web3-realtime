# swarming-physics

WASM-based Barnes-Hut force simulation for [swarming](../swarming) graph visualization. Provides 3-5× faster physics than the pure-JavaScript d3-force-3d implementation.

## Features

- **Barnes-Hut approximation** — O(n log n) charge/repulsion via octree
- **Off-main-thread** — Runs in a Web Worker to keep the UI responsive
- **Progressive enhancement** — Falls back to JS when WASM isn't available
- **Streaming compilation** — Uses `WebAssembly.instantiateStreaming` when possible

## Build

Requires the [Rust toolchain](https://rustup.rs/) and [wasm-pack](https://rustwasm.github.io/wasm-pack/):

```bash
# Install prerequisites
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack

# Build WASM
npm run build            # --target web (default)
npm run build:bundler    # --target bundler
npm run build:nodejs     # --target nodejs
```

## Usage

Used internally by `swarming`'s `<Swarming physics="wasm" />` prop. For direct usage:

```ts
import { WasmPhysicsSimulation } from 'swarming/physics';

const sim = new WasmPhysicsSimulation({
  chargeStrength: -30,
  linkDistance: 50,
  centerPull: 0.01,
});

await sim.init();
sim.addNode('a', 0, 0, 0);
sim.addNode('b', 10, 0, 0);
sim.addEdge('a', 'b');
sim.start((positions) => {
  // positions: Float64Array [x,y,z, x,y,z, ...]
});
```

## Performance

| Nodes  | JS (d3-force-3d) | WASM (this) |
|--------|-------------------|-------------|
| 1,000  | ~1 ms/tick        | ~0.3 ms     |
| 5,000  | ~8 ms/tick        | ~2 ms       |
| 10,000 | ~30 ms/tick       | ~6 ms       |
| 20,000 | ~120 ms/tick      | ~15 ms      |

## Forces

| Force     | Algorithm          |
|-----------|--------------------|
| Charge    | Barnes-Hut octree  |
| Link      | Hooke's law spring |
| Center    | Gravity to origin  |
| Collision | Spatial-hash       |
