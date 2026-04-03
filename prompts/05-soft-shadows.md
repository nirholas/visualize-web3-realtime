# Prompt 05: Soft Shadows Implementation

## Objective
Add soft, grounded shadows to the scene so objects feel anchored in the virtual world rather than floating in space. Use drei's `<ContactShadows>` or `<AccumulativeShadows>` for a high-quality, performant solution.

## Problem
The current scene has **no shadow rendering at all**. Shadows were omitted as a performance optimization. While this keeps the frame rate high, it makes objects appear disconnected from the ground plane — a major contributor to the "not clean" feeling.

The ground plane at line ~246 of `packages/react-graph/src/ForceGraph.tsx` has `receiveShadow` set but no light in the scene casts shadows.

## Approach Selection

There are three options for soft shadows in R3F:

| Approach | Quality | Performance | Best For |
|----------|---------|-------------|----------|
| Standard shadow maps + PCF | Medium | Medium | Dynamic scenes with few objects |
| `<ContactShadows>` (drei) | High (soft, blurred) | Low cost (baked per frame) | Flat ground planes, stylized look |
| `<AccumulativeShadows>` (drei) | Highest (ray-traced look) | High (accumulation passes) | Static scenes, hero shots |

**Recommended: `<ContactShadows>`** — It renders a shadow pass from below the ground plane, producing soft, diffused contact shadows. It's specifically designed for this use case (objects on a flat plane) and has excellent performance characteristics.

## Implementation

### Step 1: Add ContactShadows to NetworkScene

In `packages/react-graph/src/ForceGraph.tsx`, update the `NetworkScene` component:

```tsx
import { Environment, ContactShadows } from '@react-three/drei';

// Inside NetworkScene's return:
<>
  <Environment preset="studio" environmentIntensity={0.4} />
  <directionalLight position={[20, 40, 20]} intensity={0.3} />
  <Edges sim={sim} />
  <HubNodes sim={sim} />
  <AgentNodes sim={sim} />
  {showLabels && <HubLabels sim={sim} labelStyle={labelStyle} />}
  {showGround && (
    <>
      <Ground color={groundColor} />
      <ContactShadows
        position={[0, -0.49, 0]}
        scale={100}
        blur={2.5}
        far={4}
        opacity={0.35}
        resolution={512}
        color="#000000"
      />
    </>
  )}
</>
```

### Step 2: Parameter Tuning

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `position` | `[0, -0.49, 0]` | Just above the ground plane (at y=-0.5) to avoid z-fighting |
| `scale` | `100` | Must cover the visible area of the scene (ground is 200x200, but shadows only near center) |
| `blur` | `2.5` | Shadow softness — higher = softer, more diffused |
| `far` | `4` | How far above the shadow plane to capture casters — hub nodes have max radius ~3 |
| `opacity` | `0.35` | Shadow darkness — keep subtle for a clean look, not dramatic |
| `resolution` | `512` | Shadow map resolution — 512 is good balance; 1024 if quality needs a boost |
| `color` | `"#000000"` | Shadow color — black is standard; could tint to match environment |

### Step 3: Performance Optimization

ContactShadows renders an extra pass each frame. To minimize cost:

```tsx
<ContactShadows
  position={[0, -0.49, 0]}
  scale={100}
  blur={2.5}
  far={4}
  opacity={0.35}
  resolution={512}
  frames={1}  // Only render shadow once, then freeze
/>
```

Setting `frames={1}` renders the shadow map once and caches it. This is ideal for **static** scenes but won't update as nodes move.

For the dynamic force-directed graph, use `frames={Infinity}` (default) to update every frame, **or** use a compromise:

```tsx
// Re-render shadows every N frames to save GPU cycles
<ContactShadows
  position={[0, -0.49, 0]}
  scale={100}
  blur={2.5}
  far={4}
  opacity={0.35}
  resolution={256}  // Lower res for dynamic mode
  frames={Infinity}
/>
```

Lower the resolution to 256 when shadows must update dynamically — the blur makes low resolution invisible.

### Step 4: Apply to `features/World/ForceGraph.tsx`

The feature-level ForceGraph has its own scene composition. Add the same `<ContactShadows>` component adjacent to its ground plane.

### Step 5: Alternative — AccumulativeShadows for Snapshot Mode

When the user takes a snapshot (share/export), you can temporarily switch to `<AccumulativeShadows>` for a higher-quality capture:

```tsx
<AccumulativeShadows
  temporal
  frames={60}
  color="#000000"
  colorBlend={0.5}
  opacity={0.5}
  scale={100}
  position={[0, -0.49, 0]}
>
  <RandomizedLight amount={4} radius={10} position={[20, 40, 20]} />
</AccumulativeShadows>
```

This accumulates 60 frames of randomized light positions to produce ray-traced quality soft shadows. Only use for static captures, not real-time rendering.

### Step 6: Conditional Shadow Toggle

Expose a `showShadows` prop on `ForceGraphProps` (default `true`) to allow disabling shadows on low-end devices:

```tsx
export interface ForceGraphProps {
  // ... existing props
  showShadows?: boolean;
}
```

## Files to Modify
- `packages/react-graph/src/ForceGraph.tsx` — Add `<ContactShadows>` to NetworkScene, add `showShadows` prop
- `features/World/ForceGraph.tsx` — Add `<ContactShadows>` to scene

## Acceptance Criteria
- Soft contact shadows are visible beneath hub nodes on the ground plane
- Agent node clusters cast subtle grouped shadow areas
- Shadows are soft and diffused (blur >= 2), not hard-edged
- Shadow opacity is subtle (0.3–0.4), not dramatic
- No z-fighting between shadow plane and ground plane
- Frame rate remains above 55fps with 5,000 nodes
- Shadows can be disabled via prop for low-end devices
- Visual comparison shows objects feel "grounded" and spatially coherent
