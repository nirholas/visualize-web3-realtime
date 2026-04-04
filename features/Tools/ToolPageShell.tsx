'use client';

import Link from 'next/link';
import React from 'react';

interface ToolPageShellProps {
  title: string;
  description: string;
  externalUrl?: string;
  children: React.ReactNode;
}

/**
 * Shared shell for all /tools/* pages.
 * Full-viewport dark chrome with a thin header toolbar.
 */
export default function ToolPageShell({ title, description, externalUrl, children }: ToolPageShellProps) {
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
          height: 44,
          minHeight: 44,
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
            href="/tools"
            style={{
              fontSize: 10,
              color: '#888',
              textDecoration: 'none',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            ← Tools
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.04em' }}>{title}</span>
          <span style={{ fontSize: 10, color: '#666' }}>{description}</span>
        </div>
        {externalUrl && (
          <a
            href={externalUrl}
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
            Docs ↗
          </a>
        )}
      </header>

      {/* Content area */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {children}
      </main>
    </div>
  );
}
