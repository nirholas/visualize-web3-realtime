// ============================================================================
// WebGL Renderer Configuration
//
// Applies optimal settings to the Three.js WebGLRenderer for the force graph.
// ============================================================================

import type { WebGLRenderer } from 'three';

/**
 * Configure a Three.js WebGLRenderer with optimal settings for the force graph.
 */
export function configureWebGLRenderer(gl: WebGLRenderer): void {
  gl.toneMapping = 1; // THREE.LinearToneMapping
  gl.toneMappingExposure = 1.0;
  gl.outputColorSpace = 'srgb';
}
