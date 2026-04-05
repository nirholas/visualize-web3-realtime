'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TopToken, TraderEdge } from '@web3viz/core';

// ---------------------------------------------------------------------------
// Domain-agnostic demo simulation hook
// Maps any domain's hub/particle concepts onto TopToken + TraderEdge for the
// existing ForceGraph renderer.
// ---------------------------------------------------------------------------

export interface DemoHub {
  id: string;
  label: string;
  /** Display name */
  name: string;
  /** Semantic group (maps to chain for coloring) */
  group: string;
  /** Initial weight/activity count */
  weight: number;
  /** Volume-like metric */
  metric: number;
  /** Native unit label */
  unit: string;
  /** Source identifier for the demo */
  source: string;
}

export interface DemoParticle {
  id: string;
  /** Which hub(s) this particle connects to (by hub id) */
  hubIds: string[];
  /** Semantic group */
  group: string;
  /** Activity count */
  weight: number;
  /** Metric value */
  metric: number;
  source: string;
}

export interface DemoDataset {
  hubs: DemoHub[];
  particles: DemoParticle[];
}

/** Convert demo hubs/particles to TopToken/TraderEdge format */
export function toGraphData(dataset: DemoDataset): {
  topTokens: TopToken[];
  traderEdges: TraderEdge[];
} {
  const topTokens: TopToken[] = dataset.hubs.map((h) => ({
    tokenAddress: h.id,
    symbol: h.label,
    name: h.name,
    chain: h.group,
    trades: h.weight,
    volume: h.metric,
    volumeSol: h.metric,
    nativeSymbol: h.unit,
    source: h.source,
  }));

  const traderEdges: TraderEdge[] = dataset.particles.flatMap((p) =>
    p.hubIds.map((hubId) => ({
      trader: p.id,
      tokenAddress: hubId,
      chain: p.group,
      trades: p.weight,
      volume: p.metric,
      volumeSol: p.metric,
      source: p.source,
    })),
  );

  return { topTokens, traderEdges };
}

/**
 * Stagger hook — progressively reveals hubs over time, then continuously
 * adds new particles to simulate real-time data arriving.
 */
export function useDemoSimulation(
  dataset: DemoDataset,
  opts: {
    /** Interval between revealing new hubs (ms) */
    hubInterval?: number;
    /** Interval for adding new particles (ms) */
    particleInterval?: number;
    /** Max particles to keep in memory */
    maxParticles?: number;
    /** Whether to run the simulation */
    active?: boolean;
    /** Function to generate a new random particle */
    generateParticle?: (hubs: DemoHub[], tick: number) => DemoParticle;
  } = {},
) {
  const {
    hubInterval = 700,
    particleInterval = 400,
    maxParticles = 200,
    active = true,
    generateParticle,
  } = opts;

  const [hubCount, setHubCount] = useState(0);
  const [extraParticles, setExtraParticles] = useState<DemoParticle[]>([]);
  const tickRef = useRef(0);

  const reset = useCallback(() => {
    setHubCount(0);
    setExtraParticles([]);
    tickRef.current = 0;
  }, []);

  // Stagger hub reveal
  useEffect(() => {
    if (!active) { reset(); return; }
    setHubCount(1);
    const iv = setInterval(() => {
      setHubCount((prev) => {
        if (prev >= dataset.hubs.length) {
          clearInterval(iv);
          return prev;
        }
        return prev + 1;
      });
    }, hubInterval);
    return () => clearInterval(iv);
  }, [active, dataset.hubs.length, hubInterval, reset]);

  // Continuously add particles
  useEffect(() => {
    if (!active || !generateParticle) return;
    const iv = setInterval(() => {
      tickRef.current += 1;
      const visibleHubs = dataset.hubs.slice(0, hubCount);
      if (visibleHubs.length === 0) return;
      const particle = generateParticle(visibleHubs, tickRef.current);
      setExtraParticles((prev) => {
        const next = [...prev, particle];
        return next.length > maxParticles ? next.slice(-maxParticles) : next;
      });
    }, particleInterval);
    return () => clearInterval(iv);
  }, [active, hubCount, dataset.hubs, generateParticle, particleInterval, maxParticles]);

  const graphData = useMemo(() => {
    const visibleHubs = dataset.hubs.slice(0, hubCount);
    const visibleHubIds = new Set(visibleHubs.map((h) => h.id));
    const baseParticles = dataset.particles.filter((p) =>
      p.hubIds.some((id) => visibleHubIds.has(id)),
    );
    const allParticles = [...baseParticles, ...extraParticles.filter((p) =>
      p.hubIds.some((id) => visibleHubIds.has(id)),
    )];
    return toGraphData({ hubs: visibleHubs, particles: allParticles });
  }, [hubCount, dataset, extraParticles]);

  return { ...graphData, reset, hubCount };
}
