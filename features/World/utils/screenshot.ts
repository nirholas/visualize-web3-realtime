import html2canvas from 'html2canvas';

/** Minimum export scale — ensures at least 2x even on 1x DPI displays. */
const MIN_SCALE = 2;

/**
 * Capture the Three.js canvas as a high-res PNG Blob.
 * Always exports at minimum 2x resolution for quality.
 */
export async function captureCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  const scale = Math.max(MIN_SCALE, window.devicePixelRatio || 1);
  const w = canvas.width;
  const h = canvas.height;

  // If we need to upscale beyond the native canvas size, redraw at higher res
  const out = document.createElement('canvas');
  out.width = w * scale;
  out.height = h * scale;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, out.width, out.height);

  return new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to export canvas'))),
      'image/png',
    );
  });
}

/**
 * Capture the canvas + HTML overlay composite as a PNG Blob.
 * Renders the overlay on top of the canvas capture using html2canvas.
 */
export async function captureSnapshot(
  canvas: HTMLCanvasElement,
  overlayElement: HTMLElement,
): Promise<Blob> {
  const w = canvas.width;
  const h = canvas.height;
  const dpr = Math.max(MIN_SCALE, window.devicePixelRatio || 1);

  // Create composite canvas at device pixel ratio
  const comp = document.createElement('canvas');
  comp.width = w * dpr;
  comp.height = h * dpr;
  const ctx = comp.getContext('2d')!;
  ctx.scale(dpr, dpr);

  // Draw the WebGL canvas as the base layer
  ctx.drawImage(canvas, 0, 0, w, h);

  // Render the HTML overlay with html2canvas
  const overlayCanvas = await html2canvas(overlayElement, {
    backgroundColor: null, // transparent
    scale: dpr,
    width: w,
    height: h,
    useCORS: true,
    logging: false,
  });

  // Draw overlay on top
  ctx.drawImage(overlayCanvas, 0, 0, w, h);

  // Convert to blob
  return new Promise<Blob>((resolve, reject) => {
    comp.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to export canvas'))),
      'image/png',
    );
  });
}

/**
 * Download a Blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Generate a timestamped filename.
 */
export function timestampedFilename(prefix: string, ext = 'png'): string {
  const ts = new Date().toISOString().replace(/[:T]/g, '-').replace(/\.\d+Z$/, '');
  return `${prefix}-${ts}.${ext}`;
}
