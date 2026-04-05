'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import showcaseData from './data/showcase.json';
import { ShowcaseGrid } from './components/ShowcaseGrid';
import { CategoryFilter } from './components/CategoryFilter';
import { SubmitButton } from './components/SubmitButton';
import type { ShowcaseEntry } from './components/ShowcaseCard';
import type { SortOption } from './components/CategoryFilter';

const entries: ShowcaseEntry[] = showcaseData as ShowcaseEntry[];

export default function ShowcasePage() {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<SortOption>('featured');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = entries;

    // Filter by category
    if (category !== 'all') {
      result = result.filter((e) => e.category === category);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.author.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sort) {
      case 'recent':
        result = [...result].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'popular':
        result = [...result].sort((a, b) => b.stars - a.stars);
        break;
      case 'featured':
        result = [...result].sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return b.stars - a.stars;
        });
        break;
    }

    return result;
  }, [category, sort, search]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      counts[e.category] = (counts[e.category] || 0) + 1;
    }
    return counts;
  }, []);

  const featuredCount = entries.filter((e) => e.featured).length;

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        background: '#0a0a12',
        color: '#e5e5e5',
        fontFamily: "'IBM Plex Mono', monospace",
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '32px 40px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '0.05em', margin: 0 }}>
            Showcase
          </h1>
          <p style={{ fontSize: 11, color: '#888', marginTop: 4, letterSpacing: '0.08em' }}>
            Built with Swarming — community visualizations and demos
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SubmitButton />
          <Link
            href="/world"
            style={{
              fontSize: 11,
              color: '#888',
              textDecoration: 'none',
              padding: '8px 12px',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              transition: 'all 150ms',
            }}
          >
            ← Back to World
          </Link>
        </div>
      </header>

      {/* Stats bar */}
      <div
        style={{
          padding: '16px 40px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <Stat label="Total" value={entries.length} />
        <Stat label="Featured" value={featuredCount} color="#f59e0b" />
        {Object.entries(categoryCounts).map(([cat, count]) => (
          <Stat key={cat} label={cat} value={count} />
        ))}
      </div>

      {/* Filters */}
      <div style={{ padding: '20px 40px 0' }}>
        <CategoryFilter
          activeCategory={category}
          onCategoryChange={setCategory}
          activeSort={sort}
          onSortChange={setSort}
          searchQuery={search}
          onSearchChange={setSearch}
        />
      </div>

      {/* Grid */}
      <main style={{ padding: '24px 40px 48px' }}>
        <ShowcaseGrid entries={filtered} />
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '24px 40px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
          {entries.length} visualizations built with Swarming —{' '}
          <a
            href="https://github.com/nicholasgriffintn/visualize-web3-realtime/discussions/new?category=show-and-tell"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#a78bfa', textDecoration: 'none' }}
          >
            submit yours
          </a>
        </p>
      </footer>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ fontSize: 16, fontWeight: 500, color: color || '#e5e5e5' }}>{value}</span>
      <span
        style={{
          fontSize: 9,
          color: '#666',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
    </div>
  );
}
