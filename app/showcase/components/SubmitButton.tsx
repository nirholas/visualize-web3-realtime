'use client';

import { useState } from 'react';

function SubmitButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href="https://github.com/nirholas/visualize-web3-realtime/discussions/new?category=show-and-tell"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        padding: '8px 16px',
        borderRadius: 6,
        border: hovered
          ? '1px solid rgba(139,92,246,0.4)'
          : '1px solid rgba(139,92,246,0.2)',
        background: hovered ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.06)',
        color: '#a78bfa',
        textDecoration: 'none',
        letterSpacing: '0.04em',
        fontWeight: 500,
        fontFamily: "'IBM Plex Mono', monospace",
        transition: 'all 200ms',
        cursor: 'pointer',
      }}
    >
      + Submit Your Visualization
    </a>
  );
}

export { SubmitButton };
