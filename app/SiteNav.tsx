'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/', label: 'Home' },
  { href: '/world', label: 'World' },
  { href: '/agents', label: 'Agents' },
  { href: '/demos', label: 'Demos' },
  { href: '/tools', label: 'Tools' },
  { href: '/docs', label: 'Docs' },
  { href: '/blog', label: 'Blog' },
  { href: '/showcase', label: 'Showcase' },
  { href: '/plugins', label: 'Plugins' },
  { href: '/benchmarks', label: 'Benchmarks' },
];

export const SiteNav = memo(function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on route change
  useEffect(() => setOpen(false), [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* Hamburger button */}
      <button
        ref={buttonRef}
        onClick={toggle}
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 10000,
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(18, 18, 30, 0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 10,
          cursor: 'pointer',
          padding: 0,
          transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(30, 30, 48, 0.82)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(18, 18, 30, 0.72)';
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          {open ? (
            <>
              <line x1="4" y1="4" x2="14" y2="14" />
              <line x1="14" y1="4" x2="4" y2="14" />
            </>
          ) : (
            <>
              <line x1="3" y1="5" x2="15" y2="5" />
              <line x1="3" y1="9" x2="15" y2="9" />
              <line x1="3" y1="13" x2="15" y2="13" />
            </>
          )}
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <nav
          ref={menuRef}
          role="navigation"
          aria-label="Site navigation"
          style={{
            position: 'fixed',
            top: 64,
            right: 16,
            zIndex: 10000,
            minWidth: 180,
            background: 'rgba(18, 18, 30, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
            padding: '8px 0',
            fontFamily: "var(--font-ibm-plex-mono), 'IBM Plex Mono', monospace",
            fontSize: 12,
            letterSpacing: '0.04em',
            animation: 'siteNavFadeIn 150ms ease-out',
          }}
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '10px 20px',
                color: isActive(href) ? '#e2e8f0' : '#94a3b8',
                textDecoration: 'none',
                fontWeight: isActive(href) ? 500 : 400,
                textTransform: 'uppercase',
                transition: 'color 120ms ease, background 120ms ease',
                background: isActive(href)
                  ? 'rgba(255, 255, 255, 0.04)'
                  : 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              }}
              onMouseLeave={(e) => {
                const active = isActive(href);
                e.currentTarget.style.color = active ? '#e2e8f0' : '#94a3b8';
                e.currentTarget.style.background = active
                  ? 'rgba(255, 255, 255, 0.04)'
                  : 'transparent';
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}

      {/* Keyframe animation */}
      <style jsx global>{`
        @keyframes siteNavFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
});
