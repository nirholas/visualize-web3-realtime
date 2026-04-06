// ============================================================================
// Renderers — Public API
//
// Auto-detection, WebGPU compute engine, and WebGL configuration.
// ============================================================================

export { detectRenderer, getRendererSync, type RendererType, type RendererCapabilities } from './auto-detect';
export { WebGPUForceEngine, type GPUNodeData, type GPUEdgeData } from './webgpu';
export { configureWebGLRenderer } from './webgl';
export { useWebGPUSimulation } from './useWebGPUSimulation';
