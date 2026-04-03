# Prompt 01: Tone Mapping & Color Space Configuration

## Objective
Configure ACES Filmic tone mapping and proper linear-to-sRGB color space handling on the WebGL renderer to eliminate harsh color clipping and achieve a cinematic, professional color response.

## Problem
The current Canvas in `packages/react-graph/src/ForceGraph.tsx` uses default Three.js renderer settings — no tone mapping, no explicit color space management. Bright areas clip harshly to pure white, colors appear washed out or over-saturated, and the overall look feels flat and "digital" rather than polished.

## Current State
The Canvas is configured at line ~440 of `packages/react-graph/src/ForceGraph.tsx`:
```tsx
<Canvas
  camera={{ fov, near: 0.1, far: 500, position: cameraPosition }}
  style={{ background }}
  gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
  dpr={[1, 1.5]}
>
```
No `onCreated` callback sets tone mapping or output color space on the renderer.

There is also a **feature-level ForceGraph** at `features/World/ForceGraph.tsx` that has its own `<Canvas>` — both need updating.

## Implementation

### Step 1: Update `packages/react-graph/src/ForceGraph.tsx`
Add an `onCreated` callback to the `<Canvas>` component:

```tsx
import * as THREE from 'three';

<Canvas
  camera={{ fov, near: 0.1, far: 500, position: cameraPosition }}
  style={{ background }}
  gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
  dpr={[1, 1.5]}
  onCreated={({ gl }) => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }}
>
```

### Step 2: Update `features/World/ForceGraph.tsx`
Apply the same `onCreated` configuration to the Canvas in this file.

### Step 3: Adjust Material Colors
After enabling ACES Filmic tone mapping, colors will appear slightly different (highlights desaturate toward white naturally). You may need to:
- Slightly increase emissive intensities on glowing elements
- Bump `toneMappingExposure` to 1.1–1.3 if the scene appears too dark
- Verify the background color still looks correct (the background CSS color is not tone-mapped, only 3D content is)

### Step 4: Verify
- Compare before/after screenshots
- Bright nodes should softly desaturate toward white instead of hard-clipping
- Dark areas should retain more color detail
- The overall palette should feel warmer and more cohesive

## Key Constraints
- This is a config-only change — no new dependencies required
- Do NOT change any material color values initially; only tune `toneMappingExposure` if needed
- Both Canvas instances (package and feature level) must be updated consistently
- Performance impact: zero — tone mapping is a per-pixel operation already in the GPU pipeline

## Files to Modify
- `packages/react-graph/src/ForceGraph.tsx` — Canvas `onCreated` callback
- `features/World/ForceGraph.tsx` — Canvas `onCreated` callback

## Acceptance Criteria
- `gl.toneMapping` is set to `THREE.ACESFilmicToneMapping` on both Canvas instances
- `gl.outputColorSpace` is set to `THREE.SRGBColorSpace` on both Canvas instances
- Visual comparison shows softer highlight rolloff and more natural color transitions
- No regressions in node colors, background, or label readability
