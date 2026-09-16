# swarming-physics

Barnes-Hut 3D force simulation compiled to WebAssembly, built for
[swarming](https://www.npmjs.com/package/swarming) graph visualization. Charge (repulsion) is
approximated with an octree in O(n log n), so large graphs stay interactive.

## Install

```bash
npm install swarming-physics
```

The package is an ES module built with `wasm-pack --target web`.

## Usage

### Browser (bundler or native ESM)

```ts
import init, { Simulation } from 'swarming-physics';

await init(); // fetches swarming_physics_bg.wasm next to the module

const sim = new Simulation({ chargeStrength: -300, linkDistance: 40 });
sim.add_node('hub', 0, 0, 0, 0, 4);   // id, x, y, z, node_type (0 hub, 1 agent), radius
sim.add_node('leaf-1', 5, 0, 0, 1, 1);
sim.add_edge('hub', 'leaf-1');

function frame() {
  const positions = sim.tick(); // Float64Array [x0, y0, z0, x1, y1, z1, ...]
  // update your meshes in sim.get_node_ids() order
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

### Node.js

Pass the WebAssembly bytes to `init` directly:

```js
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import init, { Simulation } from 'swarming-physics';

const require = createRequire(import.meta.url);
await init({
  module_or_path: await readFile(require.resolve('swarming-physics/swarming_physics_bg.wasm')),
});

const sim = new Simulation({});
sim.add_node('hub', 0, 0, 0, 0, 4);
sim.add_node('leaf-1', 5, 0, 0, 1, 1);
sim.add_node('leaf-2', -5, 0, 0, 1, 1);
sim.add_edge('hub', 'leaf-1');
sim.add_edge('hub', 'leaf-2');

console.log(sim.tick_n(100)); // settled positions after 100 ticks
sim.free();
```

## Configuration

Every field is optional and camelCase:

| Field | Default | Meaning |
|---|---|---|
| `chargeStrength` | `-200` | Repulsion between hub nodes. |
| `agentChargeStrength` | `-8` | Repulsion for agent nodes. |
| `linkDistance` | `25` | Rest length of hub-hub edges. |
| `agentLinkDistance` | `5` | Rest length of agent-hub edges. |
| `linkStrength` | `0.1` | Spring stiffness of hub-hub edges. |
| `agentLinkStrength` | `0.3` | Spring stiffness of agent-hub edges. |
| `centerPull` | `0.03` | Gravity toward the origin. |
| `collisionRadius` | `0.3` | Collision padding. |
| `collisionStrength` | `0.7` | Collision response strength. |
| `alphaDecay` | `0.01` | How fast the simulation cools. |
| `velocityDecay` | `0.4` | Velocity damping per tick. |
| `theta` | `0.9` | Barnes-Hut accuracy (higher is faster, less accurate). |

## API

| Method | Description |
|---|---|
| `add_node(id, x, y, z, nodeType, radius)` / `remove_node(id)` | Manage nodes. `nodeType` is `0` for hubs, `1` for agents. |
| `add_edge(source, target)` / `remove_edge(source, target)` | Manage edges. |
| `tick()` | Advance one step and return positions. |
| `tick_n(n)` | Advance `n` steps and return the final positions. |
| `get_positions()` | Current positions without advancing. |
| `get_node_ids()` | Comma-separated node ids in position order. |
| `node_count()` / `edge_count()` | Graph size. |
| `get_alpha()` / `set_alpha(alpha)` | Simulation energy; raise it to reheat. |
| `set_charge`, `set_agent_charge`, `set_link_distance`, `set_agent_link_distance`, `set_center_pull`, `set_collision_radius`, `set_theta` | Adjust forces live. |
| `set_mouse_repulsion(x, y, z, strength, radius)` | Push nodes away from a point; `strength` 0 disables it. |
| `clear()` / `free()` | Remove everything / release WASM memory. |

## Forces

| Force | Algorithm |
|---|---|
| Charge | Barnes-Hut octree |
| Link | Hooke's law spring |
| Center | Gravity to origin |
| Collision | Spatial hash |

## Build from source

Requires the [Rust toolchain](https://rustup.rs/) with the `wasm32-unknown-unknown` target and
[wasm-pack](https://rustwasm.github.io/wasm-pack/):

```bash
npm run build            # --target web (the published build)
npm run build:bundler    # --target bundler
npm run build:nodejs     # --target nodejs
```

## License

Proprietary. See [LICENSE](LICENSE).
