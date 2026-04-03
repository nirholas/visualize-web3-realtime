'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { useDataProvider } from '@/hooks/useDataProvider';

// Lazy-load the 3D force graph to avoid SSR issues with Three.js
const ForceGraph = dynamic(() => import('@/features/World/ForceGraph'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: '#ffffff' }} />,
});

// ---------------------------------------------------------------------------
// Inner component that reads search params
// ---------------------------------------------------------------------------

function EmbedInner() {
  const searchParams = useSearchParams();

  // Parse URL params for customization
  const bg = searchParams.get('bg') || '#ffffff';

  const { stats } = useDataProvider({ paused: false });

  return (
    <div style={{ width: '100%', height: '100vh', background: bg, position: 'relative' }}>
      <ForceGraph
        topTokens={stats.topTokens}
        traderEdges={stats.traderEdges}
        height="100%"
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
