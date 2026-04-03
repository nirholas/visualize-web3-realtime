import type * as THREE from 'three';

export interface SnapshotOptions {
  /** Image format */
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** JPEG/WebP quality (0-1) */
  quality?: number;
  /** Custom filename */
  filename?: string;
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
  const { format = 'image/png', quality = 1.0 } = options;

  // Force a synchronous render to populate the draw buffer RIGHT NOW
  renderer.render(scene, camera);

  // Immediately extract before the buffer is cleared
  return renderer.domElement.toDataURL(format, quality);
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
  const { filename = `web3viz-snapshot-${Date.now()}.png` } = options;
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
  const { format = 'image/png', quality = 1.0 } = options;

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
