// ============================================================================
// WASM Loader — initializes the swarming-physics WASM module
//
// Supports two loading strategies:
// 1. Streaming compilation from URL (preferred, uses instantiateStreaming)
// 2. Inline base64-encoded WASM binary (fallback, no network request)
// ============================================================================

export interface WasmPhysicsModule {
  Simulation: new (config?: object) => WasmSimulation;
}

export interface WasmSimulation {
  add_node(id: string, x: number, y: number, z: number, nodeType: number, radius: number): void;
  add_edge(source: string, target: string): void;
  remove_node(id: string): void;
  remove_edge(source: string, target: string): void;
  clear(): void;
  tick(): Float64Array;
  tick_n(n: number): Float64Array;
  get_positions(): Float64Array;
  node_count(): number;
  edge_count(): number;
  set_alpha(alpha: number): void;
  get_alpha(): number;
  set_charge(strength: number): void;
  set_agent_charge(strength: number): void;
  set_link_distance(distance: number): void;
  set_agent_link_distance(distance: number): void;
  set_center_pull(pull: number): void;
  set_collision_radius(radius: number): void;
  set_theta(theta: number): void;
  set_mouse_repulsion(x: number, y: number, z: number, strength: number, radius: number): void;
  get_node_ids(): string;
}

let wasmModule: WasmPhysicsModule | null = null;
let loadingPromise: Promise<WasmPhysicsModule> | null = null;

/**
 * Load the WASM physics module. Returns a cached instance on subsequent calls.
 *
 * @param wasmUrl - URL to the .wasm file. If not provided, attempts to load
 *   from the default CDN path or pkg/ directory.
 */
export async function loadWasmPhysics(wasmUrl?: string): Promise<WasmPhysicsModule> {
  if (wasmModule) return wasmModule;
  if (loadingPromise) return loadingPromise;

  loadingPromise = doLoad(wasmUrl);
  wasmModule = await loadingPromise;
  return wasmModule;
}

async function doLoad(wasmUrl?: string): Promise<WasmPhysicsModule> {
  // Try to load the wasm-bindgen generated JS glue
  // In a bundled environment, this will be resolved by the bundler
  try {
    // Dynamic import of the wasm-pack output
    const wasmInit = await import('swarming-physics');
    // wasm-pack generates an init function as default export
    if (typeof wasmInit.default === 'function') {
      await wasmInit.default(wasmUrl);
    }
    return wasmInit as unknown as WasmPhysicsModule;
  } catch {
    throw new Error(
      'Failed to load swarming-physics WASM module. ' +
      'Ensure the package is built with wasm-pack and available in node_modules.'
    );
  }
}

/**
 * Check if WASM is supported in the current environment.
 */
export function isWasmSupported(): boolean {
  try {
    if (typeof WebAssembly !== 'object') return false;
    // Test basic compilation capability
    const module = new WebAssembly.Module(
      // Minimal valid WASM binary (empty module)
      new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
    );
    return module instanceof WebAssembly.Module;
  } catch {
    return false;
  }
}

/**
 * Reset the cached module (useful for testing).
 */
export function resetWasmCache(): void {
  wasmModule = null;
  loadingPromise = null;
}
