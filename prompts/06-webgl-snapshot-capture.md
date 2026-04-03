# Prompt 06: WebGL Buffer Snapshot Capture

## Objective
Replace the current `html2canvas`-based screenshot system with direct WebGL buffer capture for higher quality, pixel-perfect 3D scene snapshots. Implement a synchronous render-then-capture approach that avoids the `preserveDrawingBuffer` performance tax.

## Problem
The current snapshot implementation uses `html2canvas` (dependency in root `package.json`). This library works by re-rendering DOM elements to a canvas — it **cannot** capture WebGL content accurately. It either produces a blank canvas, a low-fidelity rasterization, or misses 3D content entirely.

The current Canvas already has `preserveDrawingBuffer: true` (line ~443 of `packages/react-graph/src/ForceGraph.tsx`), which forces the GPU to retain every frame in memory. This is a global performance penalty paid on every single frame just to support occasional screenshots.

## Current Snapshot Flow
From `features/World/SharePanel.tsx`, the panel exposes `onDownloadWorld` and `onDownloadSnapshot` callbacks. The `GraphHandle` interface already exposes `getCanvasElement()` (line ~401) which returns the `<canvas>` DOM element.

## Implementation

### Step 1: Create Snapshot Utility

Create `packages/utils/src/webglSnapshot.ts`:

```typescript
export interface SnapshotOptions {
  /** Image format */
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** JPEG/WebP quality (0-1) */
  quality?: number;
  /** Custom filename */
  filename?: string;
  /** Scale factor for high-DPI captures */
  scale?: number;
}

/**
 * Captures the current WebGL canvas by forcing a synchronous render pass.
 * This avoids the need for preserveDrawingBuffer=true on the renderer.
 *
 * @param renderer - Three.js WebGLRenderer instance
 * @param scene - The Three.js Scene to render
 * @param camera - The active camera
 * @param options - Capture configuration
 * @returns Data URL of the captured image
 */
export function captureWebGLSnapshot(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: SnapshotOptions = {},
): string {
  const {
    format = 'image/png',
    quality = 1.0,
  } = options;

  // Force a synchronous render to populate the draw buffer RIGHT NOW
  renderer.render(scene, camera);

  // Immediately extract before the buffer is cleared
  const dataURL = renderer.domElement.toDataURL(format, quality);

  return dataURL;
}

/**
 * Downloads a WebGL snapshot as a file.
 */
export function downloadWebGLSnapshot(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: SnapshotOptions = {},
): void {
  const {
    filename = `web3viz-snapshot-${Date.now()}.png`,
  } = options;

  const dataURL = captureWebGLSnapshot(renderer, scene, camera, options);

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Returns a Blob of the WebGL snapshot (for sharing APIs).
 */
export async function snapshotToBlob(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: SnapshotOptions = {},
): Promise<Blob> {
  const {
    format = 'image/png',
    quality = 1.0,
  } = options;

  renderer.render(scene, camera);

  return new Promise((resolve, reject) => {
    renderer.domElement.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob from canvas'));
      },
      format,
      quality,
    );
  });
}
```

### Step 2: Expose Renderer/Scene/Camera via GraphHandle

Update the `GraphHandle` interface in `packages/react-graph/src/ForceGraph.tsx` to expose the Three.js internals needed for snapshot capture:

```tsx
// Add to the useImperativeHandle:
takeSnapshot: (options?: SnapshotOptions) => string | null;
```

Inside the Canvas, create a helper component that captures the R3F context:

```tsx
import { useThree } from '@react-three/fiber';

const SnapshotHelper = memo<{ snapshotRef: React.MutableRefObject<(() => string | null) | null> }>(
  ({ snapshotRef }) => {
    const { gl, scene, camera } = useThree();
    
    useEffect(() => {
      snapshotRef.current = () => {
        gl.render(scene, camera);
        return gl.domElement.toDataURL('image/png', 1.0);
      };
      return () => { snapshotRef.current = null; };
    }, [gl, scene, camera]);
    
    return null;
  }
);
```

Wire this into the `ForceGraph` component and expose via `useImperativeHandle`.

### Step 3: Remove preserveDrawingBuffer

Once the synchronous capture is in place, remove the global performance penalty:

```tsx
<Canvas
  gl={{ antialias: false, alpha: false, preserveDrawingBuffer: false }}
  // ... rest of config
>
```

**Note**: With the synchronous render approach, `preserveDrawingBuffer` is no longer needed. The forced `gl.render()` call populates the buffer, and `toDataURL()` reads it in the same synchronous execution context before the browser clears it.

**However**, if you find that `toDataURL` still returns blank on some browsers without `preserveDrawingBuffer`, keep it as `true` as a fallback. Test on Chrome, Firefox, and Safari.

### Step 4: Update SharePanel Integration

In the page-level code that connects `SharePanel` to the graph, replace the `html2canvas` call with the new `GraphHandle.takeSnapshot()` method:

```tsx
const handleDownloadSnapshot = useCallback(() => {
  const dataURL = graphRef.current?.takeSnapshot();
  if (!dataURL) return;
  
  const link = document.createElement('a');
  link.download = `web3viz-snapshot-${Date.now()}.png`;
  link.href = dataURL;
  link.click();
}, []);
```

### Step 5: Remove html2canvas Dependency

Once the WebGL capture is confirmed working:

```bash
npm uninstall html2canvas
```

Remove any imports of `html2canvas` from the codebase.

### Step 6: High-DPI Capture (Optional Enhancement)

For Retina/4K displays, the canvas DPR may produce a larger-than-expected image. To capture at a specific resolution:

```typescript
export function captureAtResolution(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number,
): string {
  const originalSize = renderer.getSize(new THREE.Vector2());
  const originalPixelRatio = renderer.getPixelRatio();

  renderer.setSize(width, height);
  renderer.setPixelRatio(1);
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png', 1.0);

  // Restore original size
  renderer.setSize(originalSize.x, originalSize.y);
  renderer.setPixelRatio(originalPixelRatio);

  return dataURL;
}
```

## Files to Create
- `packages/utils/src/webglSnapshot.ts`

## Files to Modify
- `packages/react-graph/src/ForceGraph.tsx` — Add `SnapshotHelper`, expose `takeSnapshot` on handle, optionally remove `preserveDrawingBuffer`
- `features/World/ForceGraph.tsx` — Same snapshot handle changes
- `app/world/page.tsx` (or wherever SharePanel callbacks are wired) — Use new snapshot API instead of html2canvas
- Root `package.json` — Remove `html2canvas` dependency

## Acceptance Criteria
- `graphRef.current.takeSnapshot()` returns a valid PNG data URL
- Downloaded snapshot matches the exact current 3D view (including post-processing effects)
- No blank/black images on Chrome, Firefox, Safari
- `html2canvas` is removed from the project
- `preserveDrawingBuffer` is set to `false` (or confirmed still needed with a comment explaining why)
- SharePanel download buttons use the new WebGL capture path
- No frame rate change from the old implementation (ideally improved if preserveDrawingBuffer is removed)
