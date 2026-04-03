'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';

import {
  useDataProvider,
  CATEGORY_CONFIGS,
  type PumpFunCategory,
} from '@/hooks/useDataProvider';
import type { X402FlowTrace } from '@/features/X402Flow/types';

// Lazy-load the 3D network to avoid SSR issues with Three.js
const X402Network = dynamic(() => import('@/features/X402Flow/X402Network'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: '#ffffff' }} />,
});

// ---------------------------------------------------------------------------
// Map provider data → X402FlowTrace (same logic as world page)
// ---------------------------------------------------------------------------

function buildCategoryFlow(
  stats: ReturnType<typeof useDataProvider>['stats'],
  enabledCategories: Set<PumpFunCategory>,
): X402FlowTrace {
  const now = Date.now();
  const enabledConfigs = CATEGORY_CONFIGS.filter((c) => enabledCategories.has(c.id));

  return {
    agentAddress: 'pump.fun',
    agentName: 'PumpFun Network',
    apiCalls: enabledConfigs.map((cfg, i) => ({
      amountPaid: String(stats.counts[cfg.id]),
      duration: 200,
      id: `cat-${cfg.id}`,
      paymentRequired: true,
      responseStatus: 200,
      url: cfg.label,
    })),
    duration: 0,
    events: enabledConfigs.map((cfg, i) => ({
      apiUrl: cfg.label,
      category: cfg.id,
      sequenceIndex: i,
      timestamp: now - (enabledConfigs.length - i) * 200,
      type: 'api_call_complete' as const,
    })),
    flowId: 'live',
    startedAt: now - 5000,
    status: 'active',
    totalPaid: String(stats.totalVolumeSol),
    userPrompt: 'Live PumpFun activity',
  };
}

// ---------------------------------------------------------------------------
// Inner component that reads search params
// ---------------------------------------------------------------------------

function EmbedInner() {
  const searchParams = useSearchParams();

  // Parse URL params for customization
  const bg = searchParams.get('bg') || '#ffffff';
  const nodeColor = searchParams.get('nodeColor') || '#1a1a1a';
  const userColor = searchParams.get('userColor') || '#1a1a1a';
  const title = searchParams.get('title') || 'PumpFun · Live';
  const protocolsParam = searchParams.get('protocols');

  // Parse selected protocols
  const selectedProtocols = useMemo(() => {
    if (!protocolsParam) return null; // null = all
    return new Set(protocolsParam.split(',').filter(Boolean) as PumpFunCategory[]);
  }, [protocolsParam]);

  const theme = useMemo(
    () => ({ bg, nodeColor, userColor }),
    [bg, nodeColor, userColor],
  );

  const { stats, enabledCategories } = useDataProvider({ paused: false });

  // If specific protocols selected, filter to those; otherwise use all enabled
  const effectiveCategories = useMemo(() => {
    if (!selectedProtocols) return enabledCategories;
    return new Set([...enabledCategories].filter((c) => selectedProtocols.has(c)));
  }, [enabledCategories, selectedProtocols]);

  const flow = useMemo<X402FlowTrace | null>(
    () =>
      effectiveCategories.size > 0
        ? buildCategoryFlow(stats, effectiveCategories)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveCategories, Math.floor(stats.totalTransactions / 20)],
  );

  const apiEndpoints = useMemo(
    () =>
      CATEGORY_CONFIGS
        .filter((c) => effectiveCategories.has(c.id))
        .map((c) => c.label),
    [effectiveCategories],
  );

  const categoryColors = useMemo(
    () =>
      CATEGORY_CONFIGS
        .filter((c) => effectiveCategories.has(c.id))
        .map((c) => c.color),
    [effectiveCategories],
  );

  return (
    <div style={{ width: '100%', height: '100vh', background: bg, position: 'relative' }}>
      <X402Network
        apiEndpoints={apiEndpoints}
        categoryColors={categoryColors}
        compact
        flow={flow}
        height="100%"
        stage={stats.totalTransactions > 0 ? 'calling' : 'idle'}
        theme={theme}
        title={title}
      />
      {/* Branding link — opens parent site in new tab */}
      <a
        href="/world"
        rel="noopener noreferrer"
        style={{
          alignItems: 'center',
          background: 'rgba(255,255,255,0.85)',
          borderRadius: 4,
          bottom: 6,
          color: '#666',
          display: 'flex',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          gap: 4,
          left: 6,
          letterSpacing: '0.06em',
          padding: '2px 6px',
          position: 'absolute',
          textDecoration: 'none',
          textTransform: 'uppercase',
          zIndex: 20,
        }}
        target="_blank"
      >
        ⚡ PumpFun World
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Suspense boundary for useSearchParams)
// ---------------------------------------------------------------------------

export default function EmbedPage() {
  return (
    <Suspense fallback={<div style={{ width: '100%', height: '100vh', background: '#ffffff' }} />}>
      <EmbedInner />
    </Suspense>
  );
}
