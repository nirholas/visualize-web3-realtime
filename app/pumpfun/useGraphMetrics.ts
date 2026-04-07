import { useMemo } from 'react';
import type { GraphData } from './types';

export interface GraphMetrics {
  activeTokens: number;
  liveSwaps: number;
  totalVolume: number;
}

/**
 * Derives real-time metrics from the current PumpFun graph state.
 * Recalculates whenever graphData changes (i.e. when nodes are added or GC'd).
 */
export function useGraphMetrics(graphData: GraphData): GraphMetrics {
  return useMemo(() => {
    let activeTokens = 0;
    let liveSwaps = 0;
    let totalVolume = 0;

    for (const node of graphData.nodes) {
      if (node.type === 'token') {
        activeTokens++;
      } else if (node.type === 'trade') {
        liveSwaps++;
        totalVolume += node.solAmount ?? 0;
      }
    }

    return { activeTokens, liveSwaps, totalVolume };
  }, [graphData]);
}
