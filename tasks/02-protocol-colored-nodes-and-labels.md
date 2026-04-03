# Task 02: Protocol-Colored Nodes with Hover Labels

## Context
After Task 01, we have a 3D force-directed graph with protocol hub nodes and agent nodes. Now we need to add Giza-style visual identity: each protocol gets a unique color, nodes show labels on hover, and the hub nodes display protocol logos/names.

## Reference Behavior (Giza World)
- Hovering over a protocol hub shows a floating label with the protocol's logo + name (e.g., "COMPOUND", "MOONWELL", "MORPHO MOONWELL FLAGSHIP USDC")
- The label is a dark rounded pill with white text, positioned above the node
- The label has a small arrow/caret pointing down to the node
- When a protocol filter is active, the selected protocol's hub turns its brand color (blue for Morpho, green for Compound, etc.)
- Unselected protocols remain black/dark
- Agent nodes near a colored protocol also pick up a tint of that color

## What to Build

### 1. Protocol Color Map
Define a color map for PumpFun token categories/top tokens. Since we're visualizing PumpFun rather than DeFi protocols, adapt the concept:
```typescript
const PROTOCOL_COLORS: Record<string, string> = {
  // Map top token symbols or categories to colors
  // These will be dynamically assigned as tokens come in
  default: '#161616',    // Black (unselected state)
  highlight: '#3d63ff',  // Blue (generic highlight)
  // Dynamic assignment: first token gets color[0], second gets color[1], etc.
}

const COLOR_PALETTE = [
  '#3d63ff', // Blue (like Morpho)
  '#b6509e', // Purple (like Aave)
  '#00d395', // Green (like Compound)
  '#00b88d', // Teal (like Euler)
  '#00b3ff', // Cyan (like Fluid)
  '#2f6bff', // Royal blue (like Moonwell)
  '#ff6b35', // Orange
  '#e84393', // Pink
]
```

### 2. Hover Labels (HTML Overlay)
- Use `@react-three/drei`'s `<Html>` component to render labels positioned at node locations
- On hover over a protocol hub node:
  - Show a dark pill label (`background: #1a1a1a`, `color: white`, `border-radius: 20px`)
  - Display token symbol/name in uppercase monospace font (IBM Plex Mono)
  - Add a small downward-pointing arrow/caret below the pill
  - Position label above the node center
- On mouse leave: hide the label with a quick fade
- Only show labels for protocol hub nodes (not tiny agent nodes)

### 3. Raycasting for Hover Detection
- Use `@react-three/fiber`'s `onPointerOver` / `onPointerOut` on hub node meshes
- For InstancedMesh agent nodes, use raycasting with `instanceId` if needed
- Keep hover detection efficient — only raycast against hub nodes (not thousands of agents)

### 4. Protocol Hub Visual States
- **Default**: Solid dark/black sphere
- **Hovered**: Sphere stays dark, label appears above
- **Filtered/Active**: Sphere changes to protocol brand color (from COLOR_PALETTE)
- **Transition**: Smooth color lerp when state changes (300ms)

### 5. Agent Node Coloring
- Default: dark gray/black tiny spheres
- When a protocol filter is active: agents connected to that protocol get a subtle tint of the protocol color
- Use InstancedMesh color attribute for per-instance coloring

## Files to Create/Modify
- `features/World/ForceGraph.tsx` — Add hover labels, raycasting, color system
- `features/World/ProtocolLabel.tsx` — **NEW** reusable hover label component
- `features/World/constants.ts` — **NEW** color palette and protocol config

## Acceptance Criteria
- [ ] Hovering over a protocol hub node shows a dark pill label with the token name
- [ ] Label has a downward caret/arrow pointing to the node
- [ ] Label uses uppercase monospace font
- [ ] Each protocol hub can display its assigned color when filtered
- [ ] Smooth color transitions between states
- [ ] Agent nodes near an active protocol pick up its color tint
- [ ] Labels disappear on mouse leave
- [ ] No performance degradation from hover detection
