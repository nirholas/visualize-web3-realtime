# Prompt 02: HDRI Environment Lighting (Image-Based Lighting)

## Objective
Replace the current flat ambient + single directional light setup with HDRI Image-Based Lighting (IBL) using `@react-three/drei`'s `<Environment>` component. This provides soft, realistic global illumination with accurate reflections, eliminating the harsh, "floating in a void" look.

## Problem
The current lighting in `packages/react-graph/src/ForceGraph.tsx` (line ~269) is:
```tsx
<ambientLight intensity={0.7} />
<directionalLight position={[20, 40, 20]} intensity={0.6} />
```
This creates flat, even illumination with a single harsh shadow direction. Unlit sides of objects are uniformly dark. There is no environmental context — objects look like they exist in a vacuum rather than a cohesive world.

The feature-level `features/World/ForceGraph.tsx` has a similar setup with its own lighting.

## Current Dependencies
`@react-three/drei` (^9.122.0) is already installed — the `<Environment>` component is available with no new dependencies.

## Implementation

### Step 1: Add Environment to NetworkScene in `packages/react-graph/src/ForceGraph.tsx`

Replace the lighting block in the `NetworkScene` component:

```tsx
import { Environment } from '@react-three/drei';

// Inside NetworkScene's return:
<>
  {/* Soft studio IBL — provides ambient fill and reflections */}
  <Environment preset="studio" environmentIntensity={0.4} />
  {/* Keep a subtle directional for slight shadow directionality */}
  <directionalLight position={[20, 40, 20]} intensity={0.3} />
  <Edges sim={sim} />
  <HubNodes sim={sim} />
  <AgentNodes sim={sim} />
  {showLabels && <HubLabels sim={sim} labelStyle={labelStyle} />}
  {showGround && <Ground color={groundColor} />}
</>
```

### Step 2: Update `features/World/ForceGraph.tsx`
Apply the same `<Environment>` pattern in this file's scene, replacing or supplementing its ambient light.

### Step 3: Tune the Environment

Available presets in drei: `"apartment"`, `"city"`, `"dawn"`, `"forest"`, `"lobby"`, `"night"`, `"park"`, `"studio"`, `"sunset"`, `"warehouse"`.

- **`"studio"`** — best for clean, product-visualization look. Soft, even, neutral.
- **`"city"`** — adds slight blue tint, more contrast.
- **`"sunset"`** — warm golden tones, dramatic.

Start with `"studio"` and adjust `environmentIntensity` (0.3–0.6) to balance brightness.

If the HDRI skybox is visible in the background (unlikely with a CSS background), set `background={false}` on the `<Environment>` to use it only for lighting, not as a visible backdrop.

### Step 4: Adjust Material Properties
With IBL, materials respond more realistically. You may want to:
- Slightly increase `metalness` on hub nodes (0.1 → 0.15) to pick up subtle reflections
- Lower `roughness` slightly on hub nodes (0.4 → 0.35) for a hint of sheen
- Agent node materials (roughness: 0.8) will naturally look more grounded with IBL — no change needed

### Step 5: Performance Consideration
The `<Environment>` component with a preset loads a small HDR cubemap (~100-300KB). This is a one-time network cost. GPU impact is negligible — IBL uses a prefiltered mipmap chain that is O(1) per pixel.

For absolute minimal impact, use `<Environment preset="studio" resolution={64} />` to use a lower-resolution cubemap.

## Files to Modify
- `packages/react-graph/src/ForceGraph.tsx` — Replace `<ambientLight>` with `<Environment>`, reduce directional intensity
- `features/World/ForceGraph.tsx` — Same changes

## Acceptance Criteria
- `<Environment>` component is rendering in both Canvas instances
- Ambient light is removed (replaced by IBL fill light)
- Directional light intensity is reduced to complement IBL, not compete
- Hub nodes show subtle environmental reflections
- Agent nodes appear naturally lit from all directions
- No visible HDRI skybox in the background (IBL is lighting-only)
- Frame rate remains at 60fps with 5,000 nodes
