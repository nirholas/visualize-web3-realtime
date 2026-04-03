# Prompt 03: Post-Processing Pipeline (SMAA, SSAO, Bloom)

## Objective
Add a screen-space post-processing pipeline to the R3F Canvas using `@react-three/postprocessing`. This is the single biggest visual upgrade — adding anti-aliasing (SMAA), ambient occlusion (SSAO), and bloom to transform the raw 3D render into a polished, cinematic visualization.

## Problem
The current rendering has:
- Jagged polygon edges (relying only on hardware MSAA via `antialias: true`)
- No ambient occlusion — objects lack contact shadows and depth at intersections
- No bloom — emissive/bright elements don't glow, making the scene feel flat
- No unified post-processing pipeline

## Dependencies to Install

```bash
npm install @react-three/postprocessing postprocessing --workspace=packages/react-graph
npm install @react-three/postprocessing postprocessing
```

The `postprocessing` library is the underlying engine; `@react-three/postprocessing` provides React/R3F bindings.

## Implementation

### Step 1: Create a PostProcessing component

Create `packages/react-graph/src/PostProcessing.tsx`:

```tsx
'use client';

import { memo } from 'react';
import { EffectComposer, SMAA, N8AO, Bloom } from '@react-three/postprocessing';

export interface PostProcessingProps {
  /** Enable/disable the entire pipeline */
  enabled?: boolean;
  /** Bloom intensity (0 = off) */
  bloomIntensity?: number;
  /** Bloom luminance threshold — only pixels brighter than this glow */
  bloomThreshold?: number;
  /** SSAO intensity (0 = off) */
  aoIntensity?: number;
}

const PostProcessing = memo<PostProcessingProps>(({
  enabled = true,
  bloomIntensity = 0.4,
  bloomThreshold = 0.85,
  aoIntensity = 0.5,
}) => {
  if (!enabled) return null;

  return (
    <EffectComposer multisampling={0}>
      {/* SMAA replaces hardware MSAA — better quality, compatible with post-processing */}
      <SMAA />

      {/* N8AO is a high-performance SSAO implementation optimized for R3F */}
      <N8AO
        aoRadius={0.5}
        intensity={aoIntensity}
        distanceFalloff={0.5}
        halfRes
      />

      {/* Bloom — selective glow on bright/emissive elements */}
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
    </EffectComposer>
  );
});
PostProcessing.displayName = 'PostProcessing';

export default PostProcessing;
```

### Step 2: Integrate into ForceGraph Canvas

In `packages/react-graph/src/ForceGraph.tsx`, add the PostProcessing component inside the Canvas, after the scene:

```tsx
import PostProcessing from './PostProcessing';

// Inside the Canvas:
<Canvas
  camera={{ fov, near: 0.1, far: 500, position: cameraPosition }}
  style={{ background }}
  gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true }}
  dpr={[1, 1.5]}
  onCreated={({ gl }) => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }}
>
  <CameraSetup apiRef={cameraApiRef} initialPosition={cameraPosition} />
  <NetworkScene ... />
  <PostProcessing />
</Canvas>
```

**Important**: Set `antialias: false` on the Canvas `gl` prop — SMAA replaces hardware MSAA. Running both wastes GPU cycles.

### Step 3: Update `features/World/ForceGraph.tsx`
Add the same `<PostProcessing />` component inside the feature-level Canvas.

### Step 4: Make Hub Nodes Bloom-Worthy

For bloom to be visually meaningful, some materials need to emit light above the luminance threshold. Update hub node materials to include emissive properties:

In `HubNodes` material setup:
```tsx
const material = useMemo(
  () => new THREE.MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0.15,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.1,
  }),
  [],
);
```

For agent nodes that represent active trades or events, temporarily boost emissive intensity to create a pulse-and-glow effect visible through bloom.

### Step 5: Expose Props for Customization

Export `PostProcessingProps` from the package and allow `ForceGraphProps` to accept optional post-processing overrides:

```tsx
export interface ForceGraphProps {
  // ... existing props
  /** Post-processing configuration */
  postProcessing?: PostProcessingProps;
}
```

### Step 6: Tuning Guide

| Parameter | Too Low | Good Range | Too High |
|-----------|---------|------------|----------|
| `bloomIntensity` | No visible glow | 0.3–0.6 | Entire scene washed out |
| `bloomThreshold` | Everything glows | 0.8–0.95 | Nothing glows |
| `aoIntensity` | No visible depth | 0.3–0.7 | Dark halos around objects |
| `aoRadius` | Tiny, noisy shadows | 0.3–1.0 | Large, blobby shadows |

### Step 7: Performance Budget

Post-processing adds GPU cost. Budget guidance:
- **SMAA**: ~0.5ms per frame — negligible
- **N8AO with `halfRes`**: ~1-2ms per frame — acceptable
- **Bloom with `mipmapBlur`**: ~0.5-1ms per frame — negligible
- **Total**: ~2-3.5ms overhead, well within 16.6ms budget for 60fps

If frame rate drops on low-end devices, the `enabled` prop allows disabling the entire pipeline. Consider adding a UI toggle or auto-detecting GPU tier.

## Files to Create
- `packages/react-graph/src/PostProcessing.tsx`

## Files to Modify
- `packages/react-graph/src/ForceGraph.tsx` — Import and add `<PostProcessing />`, disable hardware MSAA
- `packages/react-graph/src/index.ts` — Export `PostProcessing` and `PostProcessingProps`
- `packages/react-graph/package.json` — Add `@react-three/postprocessing` and `postprocessing` deps
- `features/World/ForceGraph.tsx` — Add `<PostProcessing />` inside Canvas
- Root `package.json` — Add `@react-three/postprocessing` and `postprocessing` deps

## Acceptance Criteria
- `EffectComposer` renders inside both Canvas instances
- Polygon edges are smooth (SMAA active)
- Hub nodes where objects cluster show subtle ambient occlusion darkening
- Bright/emissive elements produce a soft glow halo (bloom)
- Hardware MSAA is disabled (`antialias: false`) to avoid double-AA
- No frame rate regression below 55fps with 5,000 nodes
- Post-processing can be disabled via `enabled={false}` prop
