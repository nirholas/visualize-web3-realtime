// ============================================================================
// Auto-detect — feature detection for physics engine selection
//
// Determines the best physics backend for the current environment:
// 1. WASM + Web Worker (best: off-thread, SIMD-optimized)
// 2. WASM main-thread (good: fast math but blocks UI)
// 3. JavaScript fallback (baseline: d3-force-3d)
// ============================================================================

export type PhysicsBackend = 'wasm-worker' | 'wasm' | 'js';

export type PhysicsMode = 'auto' | 'wasm' | 'js';

/**
 * Detect which physics backend to use.
 */
export function detectPhysicsBackend(): PhysicsBackend {
  // Check WASM support
  if (!isWasmAvailable()) {
    return 'js';
  }

  // Check Web Worker support
  if (isWorkerAvailable()) {
    return 'wasm-worker';
  }

  return 'wasm';
}

/**
 * Resolve a user-specified physics mode to a concrete backend.
 */
export function resolvePhysicsMode(mode: PhysicsMode): PhysicsBackend {
  switch (mode) {
    case 'js':
      return 'js';
    case 'wasm':
      return isWasmAvailable() ? detectPhysicsBackend() : 'js';
    case 'auto':
    default:
      return detectPhysicsBackend();
  }
}

function isWasmAvailable(): boolean {
  try {
    if (typeof WebAssembly !== 'object') return false;
    const module = new WebAssembly.Module(
      new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
    );
    return module instanceof WebAssembly.Module;
  } catch {
    return false;
  }
}

function isWorkerAvailable(): boolean {
  try {
    return typeof Worker !== 'undefined';
  } catch {
    return false;
  }
}
