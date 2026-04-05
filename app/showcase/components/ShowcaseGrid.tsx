'use client';

import { ShowcaseCard } from './ShowcaseCard';
import type { ShowcaseEntry } from './ShowcaseCard';

function ShowcaseGrid({ entries }: { entries: ShowcaseEntry[] }) {
  if (entries.length === 0) {
    return (
      <div
        style={{
          padding: '60px 20px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
          No visualizations found matching your filters.
        </p>
        <p style={{ fontSize: 11, color: '#555', marginTop: 8 }}>
          Try adjusting your search or category filter.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16,
      }}
    >
      {entries.map((entry) => (
        <ShowcaseCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

export { ShowcaseGrid };
