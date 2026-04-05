'use client';

import { useState } from 'react';

export interface ShowcaseEntry {
  id: string;
  title: string;
  author: string;
  github: string;
  demo: string;
  thumbnail: string;
  category: string;
  description: string;
  featured: boolean;
  stars: number;
  createdAt: string;
}

const categoryColors: Record<string, string> = {
  blockchain: '#8b5cf6',
  devops: '#3b82f6',
  social: '#ec4899',
  iot: '#14b8a6',
  ai: '#f59e0b',
  other: '#6b7280',
};

function ShowcaseCard({ entry }: { entry: ShowcaseEntry }) {
  const [hovered, setHovered] = useState(false);
  const catColor = categoryColors[entry.category] || categoryColors.other;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        border: hovered
          ? '1px solid rgba(255,255,255,0.12)'
          : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        overflow: 'hidden',
        transition: 'all 200ms',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Thumbnail placeholder */}
      <div
        style={{
          height: 180,
          background: `linear-gradient(135deg, ${catColor}15, ${catColor}08)`,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated dots pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(${catColor}30 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            opacity: 0.5,
          }}
        />
        <div
          style={{
            fontSize: 32,
            opacity: 0.3,
            position: 'relative',
          }}
        >
          {entry.category === 'blockchain' && '\u25C8'}
          {entry.category === 'devops' && '\u2699'}
          {entry.category === 'social' && '\u25CB'}
          {entry.category === 'iot' && '\u25A3'}
          {entry.category === 'ai' && '\u25C7'}
          {entry.category === 'other' && '\u25A1'}
        </div>
        {entry.featured && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              fontSize: 9,
              padding: '2px 8px',
              borderRadius: 10,
              background: '#f59e0b22',
              color: '#f59e0b',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            Staff Pick
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{entry.title}</h3>
          <span
            style={{
              fontSize: 9,
              padding: '2px 8px',
              borderRadius: 10,
              background: `${catColor}22`,
              color: catColor,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.category}
          </span>
        </div>

        <p style={{ fontSize: 11, color: '#999', lineHeight: 1.6, margin: 0, flex: 1 }}>
          {entry.description}
        </p>

        {/* Author + stars */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <a
            href={`https://github.com/${entry.author}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11,
              color: '#888',
              textDecoration: 'none',
              transition: 'color 150ms',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            @{entry.author}
          </a>
          <span style={{ fontSize: 10, color: '#666' }}>
            {entry.stars} stars
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <a
            href={entry.demo}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              fontSize: 10,
              padding: '6px 0',
              textAlign: 'center',
              borderRadius: 4,
              background: `${catColor}18`,
              color: catColor,
              textDecoration: 'none',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontWeight: 500,
              transition: 'background 150ms',
            }}
          >
            View Live
          </a>
          <a
            href={entry.github}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              fontSize: 10,
              padding: '6px 0',
              textAlign: 'center',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#888',
              textDecoration: 'none',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontWeight: 500,
              transition: 'all 150ms',
            }}
          >
            View Source
          </a>
        </div>
      </div>
    </div>
  );
}

export { ShowcaseCard };
