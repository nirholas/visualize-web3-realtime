// ============================================================================
// Physics module public API
// ============================================================================

export { PhysicsWorkerBridge, type PhysicsWorkerOptions } from './worker';
export { loadWasmPhysics, isWasmSupported, type WasmSimulation, type WasmPhysicsModule } from './wasm-loader';
export { detectPhysicsBackend, resolvePhysicsMode, type PhysicsBackend, type PhysicsMode } from './auto-detect';
export type { PhysicsCommand, PhysicsResponse } from './physics-worker';
export { WasmPhysicsSimulation, type WasmPhysicsConfig } from './WasmPhysicsSimulation';
