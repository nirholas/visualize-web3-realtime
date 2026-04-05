// ============================================================================
// Renderer Auto-Detection
//
// Feature-detects WebGPU support and provides fallback logic.
// ============================================================================

export type RendererType = 'webgpu' | 'webgl' | 'auto';

export interface RendererCapabilities {
  /** Which renderer is actually active */
  active: 'webgpu' | 'webgl';
  /** Whether WebGPU was available at detection time */
  webgpuAvailable: boolean;
  /** Whether GPU compute shaders are supported */
  computeSupported: boolean;
  /** Max buffer size for compute (0 if no compute) */
  maxStorageBufferSize: number;
  /** Max compute workgroup size */
  maxComputeWorkgroupSize: number;
}

/** Cached detection result */
let cachedResult: RendererCapabilities | null = null;
let detecting: Promise<RendererCapabilities> | null = null;

/**
 * Detect which renderer to use. Results are cached after first call.
 *
 * @param preferred - 'auto' tries WebGPU first, falls back to WebGL.
 *   'webgpu' forces WebGPU (throws if unavailable).
 *   'webgl' skips detection entirely.
 */
export async function detectRenderer(
  preferred: RendererType = 'auto',
): Promise<RendererCapabilities> {
  if (preferred === 'webgl') {
    return {
      active: 'webgl',
      webgpuAvailable: false,
      computeSupported: false,
      maxStorageBufferSize: 0,
      maxComputeWorkgroupSize: 0,
    };
  }

  if (cachedResult) {
    if (preferred === 'webgpu' && !cachedResult.webgpuAvailable) {
      throw new Error(
        'WebGPU renderer requested but not available in this browser. ' +
        'Use renderer="auto" to fall back to WebGL automatically.',
      );
    }
    return cachedResult;
  }

  if (!detecting) {
    detecting = probeWebGPU();
  }

  const result = await detecting;
  cachedResult = result;

  if (preferred === 'webgpu' && !result.webgpuAvailable) {
    throw new Error(
      'WebGPU renderer requested but not available in this browser. ' +
      'Use renderer="auto" to fall back to WebGL automatically.',
    );
  }

  return result;
}

/** Synchronous check — returns cached result or null */
export function getRendererSync(): RendererCapabilities | null {
  return cachedResult;
}

async function probeWebGPU(): Promise<RendererCapabilities> {
  const fallback: RendererCapabilities = {
    active: 'webgl',
    webgpuAvailable: false,
    computeSupported: false,
    maxStorageBufferSize: 0,
    maxComputeWorkgroupSize: 0,
  };

  if (typeof navigator === 'undefined') return fallback;

  const gpu = (navigator as NavigatorGPU).gpu;
  if (!gpu) return fallback;

  try {
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return fallback;

    const limits = adapter.limits;
    const maxStorage = limits.maxStorageBufferBindingSize ?? 0;
    const maxWorkgroup = limits.maxComputeWorkgroupSizeX ?? 0;

    // Require at least 128 MB storage buffer and workgroup size >= 256
    const computeSupported = maxStorage >= 128 * 1024 * 1024 && maxWorkgroup >= 256;

    return {
      active: computeSupported ? 'webgpu' : 'webgl',
      webgpuAvailable: true,
      computeSupported,
      maxStorageBufferSize: maxStorage,
      maxComputeWorkgroupSize: maxWorkgroup,
    };
  } catch {
    return fallback;
  }
}

// TypeScript doesn't include WebGPU types yet — minimal shim
interface NavigatorGPU {
  gpu?: {
    requestAdapter(options?: { powerPreference?: string }): Promise<GPUAdapterResult | null>;
  };
}

interface GPUAdapterResult {
  limits: {
    maxStorageBufferBindingSize?: number;
    maxComputeWorkgroupSizeX?: number;
  };
}
