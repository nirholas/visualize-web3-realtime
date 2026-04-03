import html2canvas from 'html2canvas';

/**
 * Capture the Three.js canvas as a high-res PNG Blob.
 * Uses 2x scale for retina quality.
 */
export async function captureCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  // Force a synchronous render to get the current frame
  const dataUrl = canvas.toDataURL('image/png');
  const res = await fetch(dataUrl);
  return res.blob();
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
  const dpr = window.devicePixelRatio || 1;

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
