'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/world', label: 'World' },
  { href: '/agents', label: 'Agents' },
  { href: '/demos', label: 'Demos' },
  { href: '/tools', label: 'Tools' },
  { href: '/docs', label: 'Docs' },
  { href: '/blog', label: 'Blog' },
  { href: '/showcase', label: 'Showcase' },
  { href: '/plugins', label: 'Plugins' },
  { href: '/playground', label: 'Playground' },
  { href: '/benchmarks', label: 'Benchmarks' },
  { href: '/pumpfun', label: 'PumpFun Live' },
];

export const SiteNav = memo(function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on route change
  useEffect(() => setMobileOpen(false), [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen]);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileOpen]);

  const toggle = useCallback(() => setMobileOpen((v) => !v), []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* ── Desktop horizontal nav bar ── */}
      <nav
        role="navigation"
        aria-label="Site navigation"
        className="siteNav-desktop"
      >
        <Link href="/" className="siteNav-logo">
          swarming
        </Link>
        <div className="siteNav-links">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`siteNav-link ${isActive(href) ? 'siteNav-active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Mobile hamburger button ── */}
      <button
        ref={buttonRef}
        onClick={toggle}
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={mobileOpen}
        className="siteNav-hamburger"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          {mobileOpen ? (
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

      {/* ── Mobile dropdown menu ── */}
      {mobileOpen && (
        <nav
          ref={menuRef}
          role="navigation"
          aria-label="Mobile navigation"
          className="siteNav-mobileMenu"
        >
          <Link
            href="/"
            className={`siteNav-mobileLink ${isActive('/') ? 'siteNav-active' : ''}`}
          >
            Home
          </Link>
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`siteNav-mobileLink ${isActive(href) ? 'siteNav-active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}

      <style jsx global>{`
        /* ── Desktop nav bar ── */
        .siteNav-desktop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          gap: 8px;
          height: 44px;
          padding: 0 20px;
          background: rgba(10, 10, 18, 0.72);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-family: var(--font-ibm-plex-mono), 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.06em;
        }

        .siteNav-logo {
          color: #e2e8f0;
          text-decoration: none;
          font-weight: 500;
          font-size: 13px;
          text-transform: lowercase;
          letter-spacing: 0.08em;
          margin-right: 16px;
          flex-shrink: 0;
        }

        .siteNav-links {
          display: flex;
          align-items: center;
          gap: 2px;
          overflow-x: auto;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .siteNav-links::-webkit-scrollbar {
          display: none;
        }

        .siteNav-link {
          color: #64748b;
          text-decoration: none;
          text-transform: uppercase;
          padding: 6px 10px;
          border-radius: 6px;
          white-space: nowrap;
          transition: color 120ms ease, background 120ms ease;
        }
        .siteNav-link:hover {
          color: #e2e8f0;
          background: rgba(255, 255, 255, 0.06);
        }
        .siteNav-link.siteNav-active {
          color: #e2e8f0;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.04);
        }

        .siteNav-hamburger {
          display: none;
        }

        .siteNav-mobileMenu {
          display: none;
        }

        /* ── Mobile: hide bar, show hamburger ── */
        @media (max-width: 860px) {
          .siteNav-desktop {
            display: none;
          }

          .siteNav-hamburger {
            position: fixed;
            top: 12px;
            right: 12px;
            z-index: 10000;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(18, 18, 30, 0.78);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            cursor: pointer;
            padding: 0;
            color: #94a3b8;
            transition: background 150ms ease;
          }
          .siteNav-hamburger:hover {
            background: rgba(30, 30, 48, 0.85);
          }

          .siteNav-mobileMenu {
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 60px;
            right: 12px;
            z-index: 10000;
            min-width: 180px;
            background: rgba(18, 18, 30, 0.94);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            padding: 6px 0;
            font-family: var(--font-ibm-plex-mono), 'IBM Plex Mono', monospace;
            font-size: 12px;
            letter-spacing: 0.04em;
            animation: siteNavFadeIn 150ms ease-out;
          }

          .siteNav-mobileLink {
            display: block;
            padding: 10px 20px;
            color: #94a3b8;
            text-decoration: none;
            text-transform: uppercase;
            transition: color 120ms ease, background 120ms ease;
          }
          .siteNav-mobileLink:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.06);
          }
          .siteNav-mobileLink.siteNav-active {
            color: #e2e8f0;
            font-weight: 500;
            background: rgba(255, 255, 255, 0.04);
          }
        }

        @keyframes siteNavFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
});
