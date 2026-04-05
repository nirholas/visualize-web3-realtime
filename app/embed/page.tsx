'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { useProviders } from '@web3viz/providers';
import { providers } from '../world/providers';

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
  const theme = searchParams.get('theme') ?? 'dark';
  const isDark = theme === 'dark';
  const bg = searchParams.get('bg') || (isDark ? '#0a0a1a' : '#ffffff');
  const maxNodes = Number(searchParams.get('maxNodes')) || 2000;
  const showLabels = searchParams.get('labels') !== 'false';
  const showWatermark = searchParams.get('watermark') !== 'false';

  const { stats } = useProviders({ providers, paused: false });

  // Limit to maxNodes
  const topTokens = stats.topTokens.slice(0, maxNodes);

  return (
    <div style={{ width: '100%', height: '100vh', background: bg, position: 'relative' }}>
      <ForceGraph
        topTokens={topTokens}
        traderEdges={stats.traderEdges}
        height="100%"
        isDark={isDark}
      />

      {/* Watermark — removable via ?watermark=false */}
      {showWatermark && (
        <a
          href="/world"
          rel="noopener noreferrer"
          style={{
            alignItems: 'center',
            background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)',
            borderRadius: 4,
            bottom: 6,
            color: isDark ? '#888' : '#666',
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
          Powered by Swarming
        </a>
      )}
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
