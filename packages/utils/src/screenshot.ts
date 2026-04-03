import html2canvas from 'html2canvas';

/**
 * Capture a Three.js canvas as a high-res PNG Blob.
 * Optionally composites an HTML overlay on top via html2canvas.
 */
export async function captureCanvas(
  canvas: HTMLCanvasElement,
  overlayElement?: HTMLElement,
): Promise<Blob> {
  if (!overlayElement) {
    return canvasToBlob(canvas);
  }

  const w = canvas.width;
  const h = canvas.height;

  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d')!;

  // Draw the 3D canvas first
  ctx.drawImage(canvas, 0, 0, w, h);

  // Render the HTML overlay via html2canvas
  const overlayCanvas = await html2canvas(overlayElement, {
    backgroundColor: null,
    scale: window.devicePixelRatio || 2,
    useCORS: true,
    logging: false,
    width: canvas.clientWidth,
    height: canvas.clientHeight,
  });

  ctx.drawImage(overlayCanvas, 0, 0, w, h);
  return canvasToBlob(offscreen);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob from canvas'));
      },
      'image/png',
      1.0,
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
