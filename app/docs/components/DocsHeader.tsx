'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SearchDialog } from './SearchDialog';

export function DocsHeader({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header style={{
        height: 48,
        borderBottom: '1px solid rgba(140,140,200,0.1)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '12px',
        background: '#0a0a12',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuToggle}
          className="docs-menu-toggle"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: '#8888aa',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          &#9776;
        </button>

        <Link href="/docs" style={{
          textDecoration: 'none',
          color: '#e2e2f0',
          fontSize: '13px',
          fontFamily: 'var(--font-ibm-plex-mono), monospace',
          fontWeight: 600,
        }}>
          <span style={{ color: '#a78bfa' }}>swarming</span>
          <span style={{ color: '#6b7280' }}>.docs</span>
        </Link>

        <nav style={{ display: 'flex', gap: 8 }}>
          {[
            { href: '/', label: 'Home' },
            { href: '/world', label: 'World' },
            { href: '/agents', label: 'Agents' },
            { href: '/demos', label: 'Demos' },
            { href: '/tools', label: 'Tools' },
            { href: '/blog', label: 'Blog' },
            { href: '/showcase', label: 'Showcase' },
            { href: '/plugins', label: 'Plugins' },
            { href: '/playground', label: 'Playground' },
            { href: '/benchmarks', label: 'Benchmarks' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: 10,
                color: '#6b7280',
                textDecoration: 'none',
                transition: 'color 150ms',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Search trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'rgba(140,140,200,0.06)',
            border: '1px solid rgba(140,140,200,0.15)',
            borderRadius: '6px',
            color: '#6b7280',
            fontSize: '12px',
            fontFamily: 'var(--font-ibm-plex-mono), monospace',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            minWidth: 200,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Search docs...
          <kbd style={{
            marginLeft: 'auto',
            padding: '1px 5px',
            background: 'rgba(140,140,200,0.1)',
            border: '1px solid rgba(140,140,200,0.2)',
            borderRadius: '3px',
            fontSize: '10px',
          }}>
            &#8984;K
          </kbd>
        </button>

        {/* GitHub link */}
        <a
          href="https://github.com/swarming-world/visualize-web3-realtime"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
      </header>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
