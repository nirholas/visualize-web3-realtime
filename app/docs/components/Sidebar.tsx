'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { docsNavigation } from '../navigation';
import type { NavItem } from '../types';

function SidebarItem({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;
  const hasChildren = item.items && item.items.length > 0;
  const isExpanded = hasChildren && (
    isActive || item.items!.some(sub => pathname === sub.href)
  );
  const [open, setOpen] = useState(isExpanded);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link
          href={item.href}
          style={{
            display: 'block',
            padding: `4px ${12 + depth * 12}px`,
            fontSize: '13px',
            fontFamily: 'var(--font-ibm-plex-mono), monospace',
            color: isActive ? '#a78bfa' : '#b0b0c8',
            background: isActive ? 'rgba(167,139,250,0.08)' : 'transparent',
            borderRadius: '4px',
            textDecoration: 'none',
            flex: 1,
            transition: 'all 150ms ease',
            fontWeight: isActive ? 500 : 400,
          }}
        >
          {item.title}
        </Link>
        {hasChildren && (
          <button
            onClick={() => setOpen(!open)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              padding: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease',
            }}
          >
            &#9654;
          </button>
        )}
      </div>
      {hasChildren && open && (
        <div style={{ marginLeft: '4px' }}>
          {item.items!.map(sub => (
            <SidebarItem key={sub.href} item={sub} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <nav style={{
      width: 260,
      height: '100%',
      overflowY: 'auto',
      padding: '16px 8px',
      borderRight: '1px solid rgba(140,140,200,0.1)',
      background: '#0e0e1a',
    }}>
      {/* Mobile close button */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            display: 'none',
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            color: '#8888aa',
            fontSize: '20px',
            cursor: 'pointer',
          }}
          className="docs-sidebar-close"
        >
          &times;
        </button>
      )}

      <Link href="/docs" style={{
        display: 'block',
        padding: '8px 12px',
        marginBottom: '16px',
        textDecoration: 'none',
        color: '#e2e2f0',
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'var(--font-ibm-plex-mono), monospace',
        letterSpacing: '-0.02em',
      }}>
        <span style={{ color: '#a78bfa' }}>swarming</span>
        <span style={{ color: '#6b7280' }}>.docs</span>
      </Link>

      {docsNavigation.map(section => (
        <div key={section.slug} style={{ marginBottom: '20px' }}>
          <div style={{
            padding: '4px 12px',
            fontSize: '10px',
            fontFamily: 'var(--font-ibm-plex-mono), monospace',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
            marginBottom: '4px',
          }}>
            {section.title}
          </div>
          {section.items.map(item => (
            <SidebarItem key={item.href} item={item} />
          ))}
        </div>
      ))}

      <div style={{
        padding: '16px 12px',
        borderTop: '1px solid rgba(140,140,200,0.08)',
        marginTop: '12px',
      }}>
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#6b7280',
          textDecoration: 'none',
          fontSize: '12px',
          fontFamily: 'var(--font-ibm-plex-mono), monospace',
        }}>
          &larr; Back to App
        </Link>
      </div>
    </nav>
  );
}
