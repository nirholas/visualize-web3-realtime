'use client';

import Link from 'next/link';
import React, { useState } from 'react';

interface DemoPageShellProps {
  title: string;
  description: string;
  audience: string;
  color: string;
  sourceUrl?: string;
  children: (opts: { isLive: boolean }) => React.ReactNode;
}

/**
 * Shared shell for all /demos/* pages.
 * Full-viewport dark chrome with header toolbar and mock/live toggle.
 */
export default function DemoPageShell({
  title,
  description,
  audience,
  color,
  sourceUrl,
  children,
}: DemoPageShellProps) {
  const [isLive, setIsLive] = useState(false);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0a12',
        color: '#e5e5e5',
        fontFamily: "'IBM Plex Mono', monospace",
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <header
        style={{
          height: 48,
          minHeight: 48,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(12px)',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/demos"
            style={{
              fontSize: 10,
              color: '#888',
              textDecoration: 'none',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            &larr; Demos
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 8px ${color}66`,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em' }}>{title}</span>
          <span style={{ fontSize: 10, color: '#666', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {description}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 9, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {audience}
          </span>
          {/* Mock / Live toggle */}
          <button
            onClick={() => setIsLive(!isLive)}
            style={{
              fontSize: 10,
              padding: '4px 12px',
              borderRadius: 12,
              border: `1px solid ${isLive ? '#10b981' : 'rgba(255,255,255,0.15)'}`,
              background: isLive ? '#10b98122' : 'transparent',
              color: isLive ? '#10b981' : '#888',
              cursor: 'pointer',
              letterSpacing: '0.06em',
              fontFamily: 'inherit',
              transition: 'all 200ms',
            }}
          >
            {isLive ? 'LIVE' : 'MOCK DATA'}
          </button>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 10,
                color: '#888',
                textDecoration: 'none',
                padding: '4px 10px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                letterSpacing: '0.06em',
              }}
            >
              Source &uarr;
            </a>
          )}
        </div>
      </header>

      {/* Content area */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {children({ isLive })}
      </main>
    </div>
  );
}
