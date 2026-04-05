# Task 01: Refactor 3D Visualization to Match Giza World Style

## Context
We're building a real-time Web3 visualization dashboard inspired by [Giza World](https://world.gizatech.xyz). The current implementation (`features/X402Flow/X402Network.tsx` — 1781 lines) uses a 3D Three.js particle swarm with heavy camera orbit and spring physics. Giza World also uses Three.js (r180) but has a very different visual style: a force-directed network graph with clean node clusters, thin connection lines, and a mostly top-down camera. We need to refactor our visualization to match this aesthetic.

## Reference Behavior (Giza World)
- Three.js 3D rendering with a mostly top-down / slight-angle camera
- Nodes are 3D spheres — size proportional to volume/activity
- Large "protocol hub" nodes (e.g., Compound, Morpho, Moonwell) are very prominent spheres
- Smaller agent/wallet nodes are tiny dots (1-4px) clustered around their protocol hub
- Thin gray lines connect agents to their protocol hubs (spoke pattern)
- Thicker lines connect protocol hubs to each other
- Force-directed layout: protocol clusters are spatially separated, agents cluster around their hub
- Smooth pan and zoom (mouse wheel zoom, click-drag pan)
- Nodes drift organically, new nodes appear smoothly as data streams in
- White/light background (not dark)
- The overall effect looks like a galaxy/constellation map of the network

## What to Build

### 1. Refactor X402Network into a ForceGraph-style Visualization
- Create `features/World/ForceGraph.tsx` (or heavily refactor X402Network)
- Keep Three.js + @react-three/fiber + @react-three/drei
- Switch camera to a mostly top-down perspective (OrthographicCamera or PerspectiveCamera with high Y position looking down)
- Remove the orbital camera rotation — user controls pan/zoom instead

### 2. Force-Directed Layout
- Use `d3-force` for node positioning (runs on CPU, feeds positions to Three.js):
  - `forceLink` — edges pull connected nodes together
  - `forceManyBody` — nodes repel each other (charge: -30 for small, -200 for hubs)
  - `forceCenter` — keeps graph centered
  - `forceCollide` — prevents node overlap
- Simulation runs continuously with low alpha so it settles into stable clusters
- New nodes/edges added incrementally without full restart

### 3. Node Types (3D Spheres)
- **Protocol Hub Nodes**: Large spheres (radius scaled by total volume)
  - Solid black/dark fill (matches Giza's dark spheres on white background)
  - These represent top PumpFun tokens by volume
- **Agent/Wallet Nodes**: Tiny spheres (radius 0.02-0.1)
  - Each trade creates or updates an agent node
  - Cluster around their most-traded protocol hub
  - Use InstancedMesh for performance (thousands of tiny spheres)
- **User Node**: Medium sphere, colored (blue by default), with "YOU ARE HERE" label

### 4. Edge/Line Rendering
- Thin lines (BufferGeometry + LineBasicMaterial) connecting agent nodes to their hub
- Color: light gray with low opacity
- Thicker lines between protocol hubs (inter-hub connections)
- Use LineSegments for batch rendering

### 5. Camera & Controls
- Top-down-ish camera (position: [0, 50, 10], looking at origin)
- MapControls or custom: mouse wheel zoom, click-drag pan, NO rotation
- Smooth zoom transitions
- Touch support (pinch zoom, drag pan)
- Optional: slight perspective tilt for depth feel

### 6. Data Integration
- Continue using `usePumpFun` hook for real-time data
- Map top tokens → protocol hub nodes
- Map individual trades → agent nodes + edges to their token's hub
- Accumulate nodes over time (don't reset)
- Cap visible nodes at ~15,000 for performance

### 7. Update the World Page
- Replace X402Network import with ForceGraph in `app/world/page.tsx`
- Keep overlay UI elements (stats, live feed) positioned over the canvas
- Set Canvas background to white (#ffffff)

## Files to Modify
- `features/X402Flow/X402Network.tsx` — Delete or keep as reference
- `features/World/ForceGraph.tsx` — **NEW** main visualization component
- `app/world/page.tsx` — Update to use ForceGraph
- `hooks/usePumpFun.ts` — Expose individual trade events (not just aggregated top 8)
- `package.json` — Add `d3-force` and `@types/d3-force`

## Performance Requirements
- 60fps with up to 5,000 visible nodes
- Use InstancedMesh for agent nodes (single draw call for thousands of spheres)
- Spatial indexing for hover hit-testing
- Graceful degradation at 10,000+ nodes (reduce line rendering)

## Acceptance Criteria
- [ ] 3D force-directed graph renders on `/world` using Three.js
- [ ] Protocol hub nodes are visibly larger spheres than agent nodes
- [ ] Thin lines connect agents to their protocol hubs in a spoke pattern
- [ ] Protocol clusters are spatially separated (not one blob)
- [ ] Pan and zoom works (no camera rotation)
- [ ] Real-time PumpFun data creates new nodes/edges incrementally
- [ ] White/light background
- [ ] Camera is mostly top-down with slight perspective
- [ ] Smooth node entrance animation when new data arrives
