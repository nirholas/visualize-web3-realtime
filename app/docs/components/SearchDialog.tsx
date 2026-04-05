'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { docsNavigation, flattenNavItems } from '../navigation';
import { docsContent } from '../content/registry';

interface SearchResult {
  title: string;
  href: string;
  section: string;
  excerpt: string;
  score: number;
}

function buildSearchIndex(): { title: string; href: string; section: string; text: string }[] {
  const items: { title: string; href: string; section: string; text: string }[] = [];
  const navItems = flattenNavItems(docsNavigation);

  for (const item of navItems) {
    const slugKey = item.slug.join('/');
    const entry = docsContent[slugKey];
    const sectionName = docsNavigation.find(s =>
      s.items.some(i => i.slug.join('/') === slugKey || i.items?.some(sub => sub.slug.join('/') === slugKey))
    )?.title || '';

    items.push({
      title: item.title,
      href: item.href,
      section: sectionName,
      text: entry?.searchText || item.title,
    });
  }
  return items;
}

function searchDocs(query: string, index: ReturnType<typeof buildSearchIndex>): SearchResult[] {
  if (!query.trim()) return [];
  const terms = query.toLowerCase().split(/\s+/);

  return index
    .map(item => {
      const text = `${item.title} ${item.text}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (item.title.toLowerCase().includes(term)) score += 10;
        if (text.includes(term)) score += 1;
      }

      // Find excerpt
      let excerpt = '';
      if (score > 0 && item.text) {
        const lower = item.text.toLowerCase();
        const idx = lower.indexOf(terms[0]);
        if (idx >= 0) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(item.text.length, idx + 80);
          excerpt = (start > 0 ? '...' : '') + item.text.slice(start, end) + (end < item.text.length ? '...' : '');
        } else {
          excerpt = item.text.slice(0, 100) + (item.text.length > 100 ? '...' : '');
        }
      }

      return { title: item.title, href: item.href, section: item.section, excerpt, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const indexRef = useRef<ReturnType<typeof buildSearchIndex> | null>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      if (!indexRef.current) {
        indexRef.current = buildSearchIndex();
      }
    }
  }, [open]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (indexRef.current) {
      setResults(searchDocs(value, indexRef.current));
      setActiveIndex(0);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      router.push(results[activeIndex].href);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, activeIndex, router, onClose]);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
        }}
      />
      {/* Dialog */}
      <div style={{
        position: 'fixed',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 560,
        background: '#141420',
        border: '1px solid rgba(140,140,200,0.2)',
        borderRadius: '12px',
        overflow: 'hidden',
        zIndex: 101,
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(140,140,200,0.1)',
          gap: '8px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8888aa" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documentation..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#e2e2f0',
              fontSize: '14px',
              fontFamily: 'var(--font-ibm-plex-mono), monospace',
              outline: 'none',
            }}
          />
          <kbd style={{
            padding: '2px 6px',
            background: 'rgba(140,140,200,0.1)',
            border: '1px solid rgba(140,140,200,0.2)',
            borderRadius: '4px',
            color: '#6b7280',
            fontSize: '11px',
            fontFamily: 'var(--font-ibm-plex-mono), monospace',
          }}>
            ESC
          </kbd>
        </div>

        {results.length > 0 ? (
          <div style={{ maxHeight: 320, overflowY: 'auto', padding: '8px' }}>
            {results.map((result, i) => (
              <a
                key={result.href}
                href={result.href}
                onClick={e => { e.preventDefault(); router.push(result.href); onClose(); }}
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: i === activeIndex ? 'rgba(167,139,250,0.1)' : 'transparent',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}>
                  <span style={{
                    color: i === activeIndex ? '#a78bfa' : '#d8d8e8',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}>
                    {result.title}
                  </span>
                  <span style={{
                    color: '#6b7280',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {result.section}
                  </span>
                </div>
                {result.excerpt && (
                  <p style={{
                    color: '#8888aa',
                    fontSize: '12px',
                    marginTop: '4px',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {result.excerpt}
                  </p>
                )}
              </a>
            ))}
          </div>
        ) : query.trim() ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '13px',
          }}>
            No results for &ldquo;{query}&rdquo;
          </div>
        ) : (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '13px',
          }}>
            Type to search across all documentation
          </div>
        )}
      </div>
    </>
  );
}
