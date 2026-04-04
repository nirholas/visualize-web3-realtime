'use client';

import { memo, useEffect, useState } from 'react';

interface LoadingScreenProps {
  ready?: boolean;
}

const LoadingScreen = memo<LoadingScreenProps>(({ ready = false }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!ready) return;
    // Dispatch event to dismiss the inline boot loader in layout.tsx
    window.dispatchEvent(new Event('webgl-ready'));
    const timer = setTimeout(() => setVisible(false), 180);
    return () => clearTimeout(timer);
  }, [ready]);

  // Force hide after 5 seconds even if not ready to prevent infinite loading
  useEffect(() => {
    const forceHideTimer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(forceHideTimer);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        alignItems: 'center',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        inset: 0,
        justifyContent: 'center',
        opacity: ready ? 0 : 1,
        position: 'absolute',
        transition: 'opacity 180ms ease',
        zIndex: 200,
      }}
    >
      <div
        style={{
          animation: 'spin 1s linear infinite',
          border: '2px solid #1e293b',
          borderRadius: '50%',
          borderTopColor: '#60a5fa',
          height: 32,
          width: 32,
        }}
      />
      <span
        style={{
          color: '#555',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        LOADING
      </span>
    </div>
  );
});

LoadingScreen.displayName = 'LoadingScreen';

export default LoadingScreen;
