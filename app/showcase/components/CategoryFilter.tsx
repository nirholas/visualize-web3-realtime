'use client';

import { useState } from 'react';

const categories = [
  { id: 'all', label: 'All', color: '#e5e5e5' },
  { id: 'blockchain', label: 'Blockchain', color: '#8b5cf6' },
  { id: 'devops', label: 'DevOps', color: '#3b82f6' },
  { id: 'social', label: 'Social', color: '#ec4899' },
  { id: 'iot', label: 'IoT', color: '#14b8a6' },
  { id: 'ai', label: 'AI', color: '#f59e0b' },
  { id: 'other', label: 'Other', color: '#6b7280' },
];

type SortOption = 'recent' | 'popular' | 'featured';

function CategoryFilter({
  activeCategory,
  onCategoryChange,
  activeSort,
  onSortChange,
  searchQuery,
  onSearchChange,
}: {
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Categories */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              style={{
                fontSize: 10,
                padding: '4px 12px',
                borderRadius: 12,
                border: isActive
                  ? `1px solid ${cat.color}44`
                  : '1px solid rgba(255,255,255,0.08)',
                background: isActive ? `${cat.color}18` : 'transparent',
                color: isActive ? cat.color : '#888',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontWeight: 500,
                fontFamily: "'IBM Plex Mono', monospace",
                transition: 'all 150ms',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Search + Sort */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            fontSize: 11,
            padding: '6px 12px',
            borderRadius: 4,
            border: searchFocused
              ? '1px solid rgba(255,255,255,0.2)'
              : '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            color: '#e5e5e5',
            fontFamily: "'IBM Plex Mono', monospace",
            outline: 'none',
            width: 160,
            transition: 'border-color 150ms',
          }}
        />
        <select
          value={activeSort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          style={{
            fontSize: 10,
            padding: '6px 8px',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.08)',
            background: '#0a0a12',
            color: '#888',
            fontFamily: "'IBM Plex Mono', monospace",
            cursor: 'pointer',
            outline: 'none',
            letterSpacing: '0.04em',
          }}
        >
          <option value="recent">Recent</option>
          <option value="popular">Most Popular</option>
          <option value="featured">Staff Picks</option>
        </select>
      </div>
    </div>
  );
}

export { CategoryFilter };
export type { SortOption };
