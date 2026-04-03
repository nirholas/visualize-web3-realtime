'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import type { X402NetworkHandle } from '@/features/X402Flow/X402Network';
import { CATEGORY_CONFIGS, type DataProviderStats, type PumpFunCategory } from '@/hooks/useDataProvider';

export interface JourneyStep {
  target: 'overview' | 'protocol' | 'user' | 'cluster';
  protocolId?: string;
  camera: { position: [number, number, number]; zoom: number };
  label?: string;
  description?: string;
  duration: number;
}

interface UseJourneyParams {
  enabledCategories: Set<PumpFunCategory>;
  networkRef: React.RefObject<X402NetworkHandle | null>;
  stats: DataProviderStats;
  userAddress?: string;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function useJourney({ enabledCategories, networkRef, stats, userAddress }: UseJourneyParams) {
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [overlay, setOverlay] = useState<{
    description?: string;
    label?: string;
    title?: string;
    visible: boolean;
  }>({ visible: false });

  const runIdRef = useRef(0);

  const topCategories = useMemo(() => {
    const sorted = CATEGORY_CONFIGS
      .filter((cfg) => enabledCategories.has(cfg.id))
      .sort((a, b) => stats.counts[b.id] - stats.counts[a.id]);

    return {
      first: sorted[0] ?? CATEGORY_CONFIGS[0],
      second: sorted[1] ?? sorted[0] ?? CATEGORY_CONFIGS[1],
    };
  }, [enabledCategories, stats.counts]);

  const steps = useMemo<JourneyStep[]>(() => {
    const base: JourneyStep[] = [
      {
        target: 'overview',
        camera: { position: [0, 18, 58], zoom: 1 },
        label: 'Step 1 of 7',
        description: 'Welcome to PumpFun World',
        duration: 1700,
      },
      {
        target: 'cluster',
        camera: { position: [16, 8, 42], zoom: 1 },
        label: 'Step 2 of 7',
        description: `${stats.counts.launches + stats.counts.agentLaunches} launches, ${stats.totalAgents} traders, ${stats.totalTransactions} transactions`,
        duration: 1700,
      },
      {
        target: 'protocol',
        protocolId: topCategories.first.id,
        camera: { position: [11, 5, 22], zoom: 1 },
        label: 'Step 3 of 7',
        description: `${topCategories.first.label} is one of the busiest hubs`,
        duration: 1700,
      },
      {
        target: 'protocol',
        protocolId: topCategories.second.id,
        camera: { position: [-12, 4, 20], zoom: 1 },
        label: 'Step 4 of 7',
        description: `${topCategories.second.label} forms another active cluster`,
        duration: 1600,
      },
      {
        target: 'cluster',
        camera: { position: [4, 12, 34], zoom: 1 },
        label: 'Step 5 of 7',
        description: 'Each line is a real trade connection moving through the network',
        duration: 1700,
      },
    ];

    if (userAddress) {
      base.push({
        target: 'user',
        camera: { position: [5, 3, 14], zoom: 1.1 },
        label: 'Step 6 of 7',
        description: 'You are here',
        duration: 1700,
      });
    }

    base.push({
      target: 'overview',
      camera: { position: [0, 8, 34], zoom: 1 },
      label: userAddress ? 'Step 7 of 7' : 'Step 6 of 6',
      description: 'Explore freely',
      duration: 1600,
    });

    return base;
  }, [stats, topCategories, userAddress]);

  const skipJourney = useCallback(() => {
    runIdRef.current += 1;
    networkRef.current?.setOrbitEnabled(true);
    setOverlay({ visible: false });
    setIsRunning(false);
    setIsComplete(true);
  }, [networkRef]);

  const startJourney = useCallback(async () => {
    if (isRunning || !networkRef.current) return;

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setIsRunning(true);
    setIsComplete(false);
    networkRef.current.setOrbitEnabled(false);

    for (let i = 0; i < steps.length; i++) {
      if (runIdRef.current !== runId) return;

      const step = steps[i];
      const title =
        i === 0
          ? 'Welcome to PumpFun World'
          : step.target === 'user'
            ? 'YOU ARE HERE'
            : step.target === 'protocol'
              ? (step.protocolId ? CATEGORY_CONFIGS.find((cfg) => cfg.id === step.protocolId)?.label : 'Protocol Hub')
              : 'Live Network';

      setOverlay({
        visible: true,
        title: title ?? 'Live Network',
        description: step.description,
        label: step.label,
      });

      if (step.target === 'protocol') {
        await networkRef.current.focusHub(i === 2 ? 1 : 2, 1200);
      } else if (step.target === 'user') {
        await networkRef.current.focusHub(0, 1100);
      } else {
        await networkRef.current.animateCameraTo({
          position: step.camera.position,
          lookAt: [0, 0, 0],
          durationMs: 1200,
        });
      }

      if (runIdRef.current !== runId) return;
      await wait(step.duration);
    }

    if (runIdRef.current !== runId) return;

    networkRef.current.setOrbitEnabled(true);
    setOverlay({ visible: false });
    setIsRunning(false);
    setIsComplete(true);
  }, [isRunning, networkRef, steps]);

  return {
    isComplete,
    isRunning,
    overlay,
    skipJourney,
    startJourney,
  };
}
