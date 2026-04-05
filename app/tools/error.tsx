'use client';

import { useEffect } from 'react';

export default function ToolsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[tools] Error:', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 16,
        fontFamily: "'IBM Plex Mono', monospace",
        color: '#d8d8e8',
      }}
    >
      <h2 style={{ fontSize: 14, fontWeight: 400, opacity: 0.7 }}>Tool crashed</h2>
      <button
        onClick={reset}
        style={{
          padding: '8px 16px',
          fontSize: 12,
          fontFamily: "'IBM Plex Mono', monospace",
          background: 'rgba(129,140,248,0.15)',
          border: '1px solid rgba(129,140,248,0.3)',
          borderRadius: 6,
          color: '#818cf8',
          cursor: 'pointer',
        }}
      >
        Reload tool
      </button>
    </div>
  );
}
