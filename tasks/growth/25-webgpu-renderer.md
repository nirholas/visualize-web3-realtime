# Task 25: WebGPU Renderer — Next-Gen Performance

## Goal
Add an optional WebGPU rendering backend that doubles performance at high node counts, positioning swarming as the most future-proof visualization library.

## Context
WebGPU is shipping in Chrome, Edge, and Safari. It offers 2-10x better performance than WebGL for compute-heavy workloads like particle simulations. Being the first graph visualization library with WebGPU support is a massive differentiator and generates press coverage.

## Requirements

### 1. Architecture
```
<Swarming renderer="auto" />   // Auto-detect: WebGPU > WebGL
<Swarming renderer="webgpu" /> // Force WebGPU (error if unavailable)
<Swarming renderer="webgl" />  // Force WebGL (current behavior)
```

### 2. WebGPU Benefits for Swarming
- **Compute shaders for physics**: Run force simulation on GPU instead of CPU
  - Currently: d3-force-3d runs on main thread (CPU-bound)
  - With WebGPU: compute shader calculates forces for all nodes in parallel
  - Expected: 10x physics performance → support 50,000+ nodes
- **Better instanced rendering**: More efficient draw calls
- **Reduced CPU-GPU data transfer**: Physics results stay on GPU

### 3. Implementation Strategy

#### Phase 1: Compute Shader for Physics
- Port force simulation to WGSL compute shader
- Node positions calculated on GPU
- Read back positions for hit testing / UI interaction
- Fall back to CPU simulation if WebGPU unavailable

#### Phase 2: GPU-Side Rendering
- Render instanced nodes directly from GPU buffer (no CPU readback for rendering)
- Edge rendering via GPU line primitives
- Bloom post-processing in WebGPU compute

#### Phase 3: Advanced Effects
- GPU-accelerated spatial hash
- Per-node glow/aura effects
- Motion blur
- Depth of field

### 4. Compatibility
- Feature-detect WebGPU at runtime
- Graceful fallback to WebGL (current Three.js renderer)
- No breaking changes to the public API
- Works alongside React Three Fiber (R3F has experimental WebGPU support via Three.js WebGPURenderer)

### 5. Benchmark Targets
| Metric | WebGL (current) | WebGPU (target) |
|--------|-----------------|-----------------|
| 5,000 nodes | 60 fps | 60 fps |
| 10,000 nodes | 45 fps | 60 fps |
| 50,000 nodes | crash | 45 fps |
| 100,000 nodes | crash | 30 fps |
| Physics tick | 4ms (CPU) | 0.5ms (GPU) |

### 6. Marketing Angle
- Blog post: "100,000 Nodes at 30fps: Swarming + WebGPU"
- Demo: side-by-side WebGL vs WebGPU at 50,000 nodes
- This will generate HN/Reddit coverage on its own

## Files to Create
```
packages/swarming/src/renderers/
├── webgl.ts          # Current renderer (extracted)
├── webgpu.ts         # New WebGPU renderer
├── auto-detect.ts    # Feature detection and fallback
└── shaders/
    ├── force.wgsl    # Force simulation compute shader
    ├── render.wgsl   # Node rendering shader
    └── bloom.wgsl    # Post-processing bloom
```
