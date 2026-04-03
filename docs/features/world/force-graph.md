# ForceGraph

## File Path
`features/World/ForceGraph.tsx`

## Purpose
The core 3D visualization component of the application. Renders an interactive force-directed graph using Three.js (via `@react-three/fiber`) and d3-force simulation. Displays "hub" nodes (top tokens) and "agent" nodes (traders) connected by edges, all laid out by a physics-based force simulation. Supports camera animation, address search highlighting, idle ambient mode, color customization for sharing, and WebGL fallback.

---

## Module Dependencies

| Import | Source | Description |
|--------|--------|-------------|
| `React` | `react` | Default React import for JSX transformation. |
| `forwardRef` | `react` | Enables parent components to receive a ref handle to the ForceGraph. |
| `memo` | `react` | Memoizes components to prevent unnecessary re-renders. |
| `useEffect` | `react` | Side effect hook for simulation updates, cleanup, and WebGL detection. |
| `useImperativeHandle` | `react` | Exposes a custom API handle to parent components via ref. |
| `useMemo` | `react` | Memoizes computed values (hub IDs, geometries, materials, etc.). |
| `useRef` | `react` | Mutable refs for simulation instance, camera API, DOM container, 3D objects. |
| `useState` | `react` | Local state for hovered hub, WebGL support detection. |
| `Canvas` | `@react-three/fiber` | Root Three.js scene container for React. |
| `useFrame` | `@react-three/fiber` | Per-frame render loop hook for animation and simulation ticking. |
| `useThree` | `@react-three/fiber` | Access to Three.js internals (camera, scene). |
| `MapControls` | `@react-three/drei` | Orbit-style controls restricted to panning and zooming (no rotation). |
| `MapControlsImpl` | `three-stdlib` | TypeScript type for the MapControls implementation. |
| `THREE` | `three` | Three.js library for 3D rendering primitives. |
| `forceSimulation` | `d3-force` | Creates the physics-based force simulation. |
| `forceLink` | `d3-force` | Link force that maintains distance between connected nodes. |
| `forceManyBody` | `d3-force` | Charge force that repels/attracts nodes. |
| `forceCenter` | `d3-force` | Centering force that pulls the graph toward origin. |
| `forceCollide` | `d3-force` | Collision force that prevents node overlap. |
| `SimulationNodeDatum` | `d3-force` | TypeScript type for d3-force node data. |
| `SimulationLinkDatum` | `d3-force` | TypeScript type for d3-force link data. |
| `TopToken` | `@web3viz/core` | Type representing a top-performing token (hub data). |
| `TraderEdge` | `@web3viz/core` | Type representing a trader-to-token relationship (edge data). |
| `ShareColors` | `./SharePanel` | Type for share panel color customization. |
| `ProtocolLabel` | `./ProtocolLabel` | Floating label pill component shown on hub hover. |
| `COLOR_PALETTE` | `./constants` | Array of 8 protocol colors. |
| `PROTOCOL_COLORS` | `./constants` | Default, highlight, and agent default color constants. |
| `YouAreHereMarker` | `./YouAreHereMarker` | Floating marker shown above a searched agent node. |

---

## Exported Members

| Export | Type | Description |
|--------|------|-------------|
| `ForceGraphProps` | `interface` | Props interface for the ForceGraph component. |
| `ForceGraphHandle` | `interface` | Imperative handle API exposed via `forwardRef`. |
| `default` | `React.FC` | Default export. The memoized ForceGraph component. |

---

## Types and Interfaces

### `ForceNode` (internal)
```typescript
interface ForceNode extends SimulationNodeDatum {
  id: string;          // Unique identifier (mint for hubs, 'agent:{trader}:{mint}' for agents)
  type: 'hub' | 'agent'; // Node classification
  label: string;       // Display label (symbol/name for hubs, truncated address for agents)
  radius: number;      // Visual radius of the node sphere
  color: string;       // Base color string
  hubMint?: string;    // For agent nodes: the mint of the parent hub
  source?: string;     // Source provider identifier
}
```

### `ForceEdge` (internal)
```typescript
interface ForceEdge extends SimulationLinkDatum<ForceNode> {
  sourceId: string;    // Original source node ID
  targetId: string;    // Original target node ID
}
```

### `ForceGraphProps` (exported)
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `topTokens` | `TopToken[]` | required | Array of top tokens to render as hub nodes. |
| `traderEdges` | `TraderEdge[]` | required | Array of trader-token relationships to render as agent nodes and edges. |
| `activeProtocol` | `string \| null` | `null` | Mint of the currently selected/filtered protocol hub. |
| `highlightedHubIndex` | `number \| null` | `null` | Index of a hub to highlight (used by journey). |
| `highlightedAddress` | `string \| null` | `null` | Wallet address of a searched agent for highlighting. |
| `onSelectProtocol` | `(mint: string \| null) => void` | `undefined` | Callback when a hub is clicked. |
| `onDismissHighlight` | `() => void` | `undefined` | Callback when the highlight marker is dismissed. |
| `height` | `string \| number` | `'100%'` | CSS height of the container. |
| `shareColors` | `ShareColors` | `undefined` | Custom colors for the share/screenshot mode. |
| `idle` | `boolean` | `false` | When true, shows ambient drifting nodes instead of real data. |

### `ForceGraphHandle` (exported)
| Method | Signature | Description |
|--------|-----------|-------------|
| `animateCameraTo` | `(request: { position: [n,n,n]; lookAt?: [n,n,n]; durationMs?: number }) => Promise<void>` | Smoothly animates the camera to a target position and look-at point. |
| `focusHub` | `(index: number, durationMs?: number) => Promise<void>` | Zooms camera to focus on a specific hub node by index. |
| `focusAgent` | `(address: string, durationMs?: number) => Promise<void>` | Zooms camera to focus on a specific agent node by wallet address. |
| `getCanvasElement` | `() => HTMLCanvasElement \| null` | Returns the underlying WebGL canvas element (for screenshots). |
| `getHubCount` | `() => number` | Returns the current number of hub nodes. |
| `getHubPosition` | `(index: number) => [n,n,n] \| null` | Returns the 3D position of a hub by index. |
| `findAgentHub` | `(address: string) => { hubIndex: number; hubMint: string } \| null` | Finds which hub an agent belongs to by address. |
| `setOrbitEnabled` | `(enabled: boolean) => void` | Enables/disables orbit controls (used during journey). |

---

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_AGENT_NODES` | `5000` | Maximum number of agent (trader) instances rendered. |
| `HUB_BASE_RADIUS` | `0.8` | Minimum hub sphere radius. |
| `HUB_MAX_RADIUS` | `3.0` | Maximum hub sphere radius (scaled by volume). |
| `AGENT_RADIUS` | `0.06` | Default radius for agent node spheres. |
| `IDLE_NODE_COUNT` | `40` | Number of ambient nodes in idle mode. |
| `IDLE_SPEED` | `0.08` | Base velocity for idle node drift. |
| `IDLE_RADIUS_MIN` | `0.15` | Minimum radius of idle nodes. |
| `IDLE_RADIUS_MAX` | `0.5` | Maximum radius of idle nodes. |
| `IDLE_SPREAD` | `30` | Spatial spread boundary for idle nodes. |

---

## Class: `ForceGraphSimulation`

A non-React class that manages the d3-force simulation outside the React render cycle for performance.

### Properties
| Property | Type | Description |
|----------|------|-------------|
| `nodes` | `ForceNode[]` | All simulation nodes (hubs + agents). |
| `edges` | `ForceEdge[]` | All simulation edges. |
| `nodeMap` | `Map<string, ForceNode>` | Fast lookup of nodes by ID. |

### Constructor
Initializes a `forceSimulation` with:
- **charge force:** Hubs repel at -200 strength, agents at -8.
- **center force:** Pulls toward (0,0) at 0.03 strength.
- **collide force:** Prevents overlap with radius + 0.3 padding, 0.7 strength.
- **link force:** Hub-to-hub distance 25, agent-to-hub distance 5-8 (random). Hub-to-hub link strength 0.1, agent-to-hub 0.3.
- **alphaDecay:** 0.01 (slow cooling).
- **velocityDecay:** 0.4 (moderate damping).

### Methods

#### `update(topTokens, traderEdges)`
- Creates or updates hub nodes from `topTokens`, scaling radius proportionally to volume.
- Creates agent nodes from `traderEdges`, positioned near their parent hub with random angular offset.
- Builds edges: fully-connected hub-to-hub mesh, plus agent-to-hub edges.
- Restarts simulation with alpha 0.3 when graph topology changes.

#### `tick()`
- Advances the simulation by one step. Called every frame from `useFrame`.

#### `dispose()`
- Stops the d3-force simulation to prevent background computation.

---

## Sub-Components

### `HubNodeMesh`
- **Line 220-365**
- Renders a single hub sphere with interactive hover detection, color transitions, and optional ring for agent-sourced hubs.
- Uses `useFrame` to smoothly lerp color and opacity toward target values.
- Highlighted hubs pulse at 2x size. Agent hubs display a decorative torus ring.
- Shows a `ProtocolLabel` tooltip on hover.
- **Refs:** `groupRef`, `meshRef`, `materialRef`, `ringRef`, `ringMaterialRef`, `targetColor`, `targetOpacity`, `targetRingOpacity`, `radiusRef`.

### `AgentNodes`
- **Line 368-462**
- Renders all agent nodes as a single `THREE.InstancedMesh` for performance (up to 5000 instances).
- Per-frame updates: positions, scales, and per-instance colors based on active protocol filtering, search highlighting, and dimming logic.
- Searched agents render at 3x size with a gentle pulse and bright blue color (#3d63ff).

### `Edges`
- **Line 464-565**
- Renders all graph edges as `THREE.LineSegments` with dynamic buffer geometry.
- Pre-allocates buffers for up to 20,000 edges.
- Per-frame updates position and color attributes:
  - Highlighted edges (by hub or address): blue (#3d63ff).
  - Active protocol related edges: darker gray.
  - Default: light gray.
- Uses `DynamicDrawUsage` for efficient GPU updates.

### `SceneBackground`
- **Line 568-575**
- Sets the Three.js scene background color. Used when share colors are applied.

### `Ground`
- **Line 578-584**
- A 200x200 plane mesh at y=-0.5, rotated to be horizontal. Light gray color (#eeeef0).

### `IdleAmbientScene`
- **Line 616-672**
- Displays gently drifting spheres when no data is loaded (`idle=true`).
- 40 instanced spheres with random positions, velocities, radii, and grayscale colors.
- Per-frame physics: drift, soft boundary pull, velocity damping.
- Includes ambient and directional lighting.

### `NetworkScene`
- **Line 678-787**
- Assembles all data-driven 3D elements: lighting, edges, hub meshes, agent instances, ground, and the YouAreHereMarker.
- Ticks the simulation every frame.
- Tracks hub and highlighted agent positions for markers.

### `CameraSetup`
- **Line 809-882**
- Manages camera positioning and animated transitions.
- Initial position: (0, 55, 12) looking at origin.
- Uses `MapControls` with rotation disabled, damping enabled, distance range 10-150.
- Camera animation uses ease-in-out cubic easing.
- Exposes `animateTo` and `setOrbitEnabled` via a ref-based API.

### `CameraAnimation` (interface)
```typescript
interface CameraAnimation {
  durationMs: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromLookAt: THREE.Vector3;
  toLookAt: THREE.Vector3;
  startedAt: number;
  onDone?: () => void;
}
```

---

## Main Component: `ForceGraphInner`

### State
| State | Type | Initial | Description |
|-------|------|---------|-------------|
| `webglSupported` | `boolean` | `true` | Whether WebGL is available in the browser. |

### Refs
| Ref | Type | Description |
|-----|------|-------------|
| `simRef` | `ForceGraphSimulation \| null` | The force simulation instance, created lazily on first render. |
| `containerRef` | `HTMLDivElement \| null` | The outer container div. |
| `cameraApiRef` | `CameraApi \| null` | Camera animation API provided by CameraSetup. |

### Side Effects
1. **Simulation update** (Line 996-999): Calls `sim.update()` when `topTokens` or `traderEdges` change (tracked via derived key strings).
2. **Cleanup** (Line 1001-1005): Disposes the simulation on unmount.
3. **WebGL detection** (Line 1008-1016): Tests for `webgl2` or `webgl` context availability on mount.

### Imperative Handle
Exposes the `ForceGraphHandle` API via `useImperativeHandle`, providing methods for camera control, hub/agent lookup, and canvas element access.

### JSX Structure
- If WebGL is not supported: renders a fallback message.
- Otherwise: renders a Three.js `Canvas` with:
  - `CameraSetup` for controls and camera animation.
  - Either `IdleAmbientScene` (when `idle=true`) or `NetworkScene` (when data is active).
  - Canvas configured with antialiasing, preserved drawing buffer (for screenshots), and device pixel ratio capped at 1.5.

---

## Usage Example

```tsx
import ForceGraph, { ForceGraphHandle } from '@/features/World/ForceGraph';

function WorldView() {
  const graphRef = useRef<ForceGraphHandle>(null);

  return (
    <ForceGraph
      ref={graphRef}
      topTokens={tokens}
      traderEdges={edges}
      activeProtocol={selectedMint}
      onSelectProtocol={setSelectedMint}
      height="100vh"
    />
  );
}
```
