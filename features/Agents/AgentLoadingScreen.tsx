'use client';

import { memo, useEffect, useState } from 'react';

interface AgentLoadingScreenProps {
  ready: boolean;
}

const AgentLoadingScreen = memo<AgentLoadingScreenProps>(({ ready }) => {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (ready && visible) {
      setFadeOut(true);
      const t = setTimeout(() => setVisible(false), 600);
      return () => clearTimeout(t);
    }
  }, [ready, visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'IBM Plex Mono', monospace",
        transition: 'opacity 600ms ease',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'all',
      }}
    >
      {/* Hexagon pulse icon */}
      <div
        style={{
          fontSize: 48,
          animation: 'hexPulse 2s ease-in-out infinite',
          marginBottom: 24,
          color: '#c084fc',
        }}
      >
        ⬡
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 13,
          color: '#c084fc',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Agent World
      </div>

      {/* Status */}
      <div
        style={{
          fontSize: 10,
          color: '#4b5563',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Connecting to agent executor...
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: '#c084fc',
              animation: `loadDot 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes hexPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.92); }
        }
        @keyframes loadDot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition-duration: 0s !important; }
        }
      `}</style>
    </div>
  );
});

AgentLoadingScreen.displayName = 'AgentLoadingScreen';
export default AgentLoadingScreen;
