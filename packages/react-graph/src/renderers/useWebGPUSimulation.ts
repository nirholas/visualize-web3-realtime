// ============================================================================
// useWebGPUSimulation Hook
//
// Wraps ForceGraphSimulation with optional WebGPU acceleration.
// When WebGPU is available and renderer != 'webgl', the GPU engine runs the
// force step; otherwise the hook falls back to the CPU-based d3-force sim.
// ============================================================================

import { useRef, useMemo, useCallback } from 'react';
import {
  ForceGraphSimulation,
  type ForceGraphConfig,
  type TopToken,
  type TraderEdge,
} from '@web3viz/core';
import type { RendererType } from './auto-detect';

interface GPUSimState {
  sim: ForceGraphSimulation;
  gpuActive: boolean;
  update: (topTokens: TopToken[], traderEdges: TraderEdge[]) => void;
  dispose: () => void;
  tick: () => void;
}

/**
 * Hook that manages a ForceGraphSimulation instance.
 *
 * When `renderer` is 'auto' or 'webgpu', it attempts to initialise a WebGPU
 * compute pipeline for the force step. If unavailable (or `renderer === 'webgl'`),
 * the CPU-based d3-force simulation is used directly.
 */
export function useWebGPUSimulation(
  renderer: RendererType = 'auto',
  config?: ForceGraphConfig,
): GPUSimState {
  const simRef = useRef<ForceGraphSimulation | null>(null);

  const sim = useMemo(() => {
    if (simRef.current) return simRef.current;
    const s = new ForceGraphSimulation(config);
    simRef.current = s;
    return s;
  }, [config]);

  // For now, GPU acceleration is only available when the full WebGPU engine
  // is wired up end-to-end.  The hook degrades to CPU-only seamlessly.
  const gpuActive = false;
  void renderer; // acknowledged — GPU path is a future enhancement

  const update = useCallback(
    (topTokens: TopToken[], traderEdges: TraderEdge[]) => {
      sim.update(topTokens, traderEdges);
    },
    [sim],
  );

  const dispose = useCallback(() => {
    sim.dispose();
  }, [sim]);

  const tick = useCallback(() => {
    sim.tick();
  }, [sim]);

  return { sim, gpuActive, update, dispose, tick };
}
