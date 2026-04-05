# Task 26: WASM Physics Engine

## Goal
Port the force simulation to a Rust/WASM module for 3-5x physics performance improvement over JavaScript, enabling smooth 20,000+ node visualizations even without WebGPU.

## Context
d3-force-3d is pure JavaScript. For large node counts, the physics simulation is the bottleneck (not rendering). A WASM physics engine runs the simulation off the main thread in a Web Worker, keeping the UI buttery smooth.

## Requirements

### 1. Rust WASM Module
```rust
// swarming-physics/src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Simulation {
    nodes: Vec<Node>,
    edges: Vec<Edge>,
    config: SimConfig,
}

#[wasm_bindgen]
impl Simulation {
    #[wasm_bindgen(constructor)]
    pub fn new(config: JsValue) -> Simulation { ... }
    
    pub fn add_node(&mut self, id: &str, x: f64, y: f64, z: f64) { ... }
    pub fn add_edge(&mut self, source: &str, target: &str) { ... }
    pub fn remove_node(&mut self, id: &str) { ... }
    
    pub fn tick(&mut self) -> Vec<f64> { ... }  // Returns flat [x,y,z,x,y,z,...] 
    
    pub fn set_charge(&mut self, strength: f64) { ... }
    pub fn set_link_distance(&mut self, distance: f64) { ... }
    pub fn set_center_pull(&mut self, pull: f64) { ... }
}
```

### 2. Forces to Implement
- **Charge (repulsion)**: Barnes-Hut approximation (O(n log n) instead of O(n²))
- **Link (spring)**: Hooke's law between connected nodes
- **Center**: Gravity toward origin
- **Collision**: Prevent node overlap
- **Mouse repulsion**: External force from cursor position

### 3. Web Worker Integration
```ts
// packages/swarming/src/physics/worker.ts
const worker = new Worker(new URL('./physics-worker.ts', import.meta.url))

// Main thread sends commands
worker.postMessage({ type: 'addNode', id: '1', x: 0, y: 0, z: 0 })
worker.postMessage({ type: 'tick' })

// Worker responds with positions
worker.onmessage = (e) => {
  const positions = e.data // Float64Array [x,y,z,x,y,z,...]
  updateNodePositions(positions)
}
```

### 4. Progressive Enhancement
```
<Swarming physics="auto" />   // WASM if available, JS fallback
<Swarming physics="wasm" />   // Force WASM
<Swarming physics="js" />     // Force JavaScript (d3-force-3d)
```

### 5. Build Pipeline
- Compile Rust to WASM with `wasm-pack`
- Inline WASM binary as base64 (no separate file to load) OR
- Load WASM from CDN with streaming compilation
- The npm package should work without Rust toolchain installed

### 6. Performance Targets
| Nodes | JS (current) | WASM (target) |
|-------|-------------|---------------|
| 1,000 | 1ms/tick | 0.3ms/tick |
| 5,000 | 8ms/tick | 2ms/tick |
| 10,000 | 30ms/tick | 6ms/tick |
| 20,000 | 120ms/tick | 15ms/tick |

## Files to Create
```
packages/swarming-physics/
├── Cargo.toml
├── src/
│   ├── lib.rs           # WASM entry point
│   ├── simulation.rs    # Force simulation
│   ├── forces/
│   │   ├── charge.rs    # Barnes-Hut repulsion
│   │   ├── link.rs      # Spring forces
│   │   ├── center.rs    # Center gravity
│   │   └── collision.rs
│   └── spatial.rs       # Octree for Barnes-Hut
├── pkg/                 # wasm-pack output
└── README.md

packages/swarming/src/physics/
├── worker.ts            # Web Worker bridge
├── wasm-loader.ts       # WASM initialization
└── auto-detect.ts       # Feature detection
```
