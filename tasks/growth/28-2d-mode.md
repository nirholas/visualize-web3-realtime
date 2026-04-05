# Task 28: 2D Rendering Mode

## Goal
Add a 2D rendering mode that uses Canvas 2D or SVG instead of WebGL. This dramatically widens the addressable market to users who don't need 3D or whose environments don't support WebGL.

## Context
Many use cases (network diagrams, dependency graphs, org charts) don't need 3D. A 2D mode also works in environments where WebGL is blocked (some corporate networks, CI screenshots, server-side rendering). This also makes swarming a direct competitor to Sigma.js and Cytoscape.

## Requirements

### 1. Usage
```tsx
<Swarming mode="2d" data={graphData} />
<Swarming mode="3d" data={graphData} />  // default
<Swarming mode="auto" data={graphData} /> // 3D if WebGL available, else 2D
```

### 2. 2D Renderer
- Canvas 2D for performance (not SVG — SVG dies at 1,000+ nodes)
- Same force simulation, projected to 2D plane
- Same interactivity: click, hover, drag, zoom, pan
- Same theming system
- Same data provider interface
- Node labels rendered as text

### 3. Feature Parity (where applicable)
| Feature | 3D | 2D |
|---------|----|----|
| Force simulation | ✅ | ✅ (2D forces) |
| Mouse repulsion | ✅ | ✅ |
| Node click/hover | ✅ | ✅ |
| Zoom/pan | ✅ | ✅ |
| Node labels | ✅ | ✅ |
| Edge rendering | ✅ | ✅ |
| Bloom | ✅ | ❌ (glow via shadow) |
| Camera orbit | ✅ | ❌ (not applicable) |
| Themes | ✅ | ✅ |

### 4. Static Export
2D mode enables:
- Export as PNG (canvas.toDataURL)
- Export as SVG (for print/vector)
- Server-side rendering (Node.js canvas for OG images)

### 5. Performance
- 2D Canvas should handle 10,000+ nodes at 60fps
- Lighter bundle (no Three.js dependency in 2D-only mode)
- Tree-shakeable: if user only imports 2D, Three.js is not bundled

### 6. Bundle Splitting
```ts
// Only loads 2D renderer (no Three.js)
import { Swarming2D } from 'swarming/2d'

// Only loads 3D renderer
import { Swarming3D } from 'swarming/3d'

// Auto-detect (loads both, picks at runtime)
import { Swarming } from 'swarming'
```

## Files to Create
```
packages/swarming/src/renderers/
├── canvas2d/
│   ├── Canvas2DRenderer.tsx
│   ├── draw.ts              # Canvas 2D drawing functions
│   ├── interaction.ts       # Mouse/touch handlers
│   └── export.ts            # PNG/SVG export
├── webgl/
│   └── (existing WebGL renderer)
└── index.ts                 # Renderer factory
```
