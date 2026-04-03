'use client';

import { memo, useState } from 'react';
import type { CategoryConfig, SourceConfig } from '@web3viz/core';
import { COLOR_PALETTE } from './constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProtocolFilterSidebarProps {
  /** All available categories */
  categories: CategoryConfig[];
  /** All available sources/providers */
  sources?: SourceConfig[];
  /** Set of enabled category IDs */
  enabledCategories: Set<string>;
  /** Called when a category is toggled */
  onToggleCategory: (categoryId: string) => void;
  /** Set of enabled provider IDs */
  enabledProviders?: Set<string>;
  /** Called when a provider is toggled */
  onToggleProvider?: (providerId: string) => void;
}

// ---------------------------------------------------------------------------
// Single Category Button
// ---------------------------------------------------------------------------

interface CategoryButtonProps {
  category: CategoryConfig;
  isActive: boolean;
  onClick: () => void;
}

const CategoryButton = memo<CategoryButtonProps>(({ category, isActive, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      aria-label={category.label}
      aria-pressed={isActive}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={category.label}
      style={{
        alignItems: 'center',
        background: isActive ? category.color : '#c0c0c8',
        border: isActive ? `2px solid ${category.color}` : '2px solid transparent',
        borderRadius: '50%',
        boxShadow: isActive
          ? `0 2px 12px ${category.color}60`
          : hovered
          ? '0 2px 8px rgba(0,0,0,0.18)'
          : 'none',
        color: isActive ? '#fff' : '#222',
        cursor: 'pointer',
        display: 'flex',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 14,
        fontWeight: 700,
        height: 40,
        justifyContent: 'center',
        lineHeight: 1,
        outline: 'none',
        padding: 0,
        transform: hovered && !isActive ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 150ms ease',
        width: 40,
      }}
    >
      {category.icon}
    </button>
  );
});

CategoryButton.displayName = 'CategoryButton';

// ---------------------------------------------------------------------------
// Provider Toggle Button
// ---------------------------------------------------------------------------

interface ProviderToggleProps {
  source: SourceConfig;
  active: boolean;
  onClick: () => void;
}

const ProviderToggle = memo<ProviderToggleProps>(({ source, active, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      aria-label={`Toggle ${source.label}`}
      aria-pressed={active}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={active ? `Hide ${source.label}` : `Show ${source.label}`}
      style={{
        alignItems: 'center',
        background: active ? source.color : '#c0c0c8',
        border: active ? `2px solid ${source.color}` : '2px solid transparent',
        borderRadius: '50%',
        boxShadow: active
          ? `0 2px 12px ${source.color}60`
          : hovered
          ? '0 2px 8px rgba(0,0,0,0.18)'
          : 'none',
        color: active ? '#fff' : '#222',
        cursor: 'pointer',
        display: 'flex',
        fontSize: 14,
        height: 40,
        justifyContent: 'center',
        lineHeight: 1,
        outline: 'none',
        padding: 0,
        transform: hovered && !active ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 150ms ease',
        width: 40,
      }}
    >
      {source.icon}
    </button>
  );
});
ProviderToggle.displayName = 'ProviderToggle';

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const ProtocolFilterSidebar = memo<ProtocolFilterSidebarProps>(
  ({ categories, sources, enabledCategories, onToggleCategory, enabledProviders, onToggleProvider }) => {
    if (categories.length === 0) return null;

    // Group categories by source if multiple sources exist
    const hasMultipleSources = sources && sources.length > 1;
    const categoryBySource = new Map<string | undefined, CategoryConfig[]>();

    for (const cat of categories) {
      const sourceId = cat.sourceId;
      if (!categoryBySource.has(sourceId)) {
        categoryBySource.set(sourceId, []);
      }
      categoryBySource.get(sourceId)!.push(cat);
    }

    return (
      <nav
        aria-label="Filter categories and providers"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          left: 16,
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
        }}
      >
        {/* Render provider toggles if multiple sources */}
        {sources && sources.length > 0 && onToggleProvider && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sources.map((source) => (
              <ProviderToggle
                key={source.id}
                source={source}
                active={enabledProviders?.has(source.id) ?? true}
                onClick={() => onToggleProvider(source.id)}
              />
            ))}
          </div>
        )}

        {/* Render categories grouped by source or flat */}
        {hasMultipleSources && sources ? (
          // Grouped view
          sources.map((source) => {
            const sourceCats = categoryBySource.get(source.id) || [];
            if (sourceCats.length === 0) return null;
            return (
              <div key={source.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sourceCats.map((cat) => (
                  <CategoryButton
                    key={cat.id}
                    category={cat}
                    isActive={enabledCategories.has(cat.id)}
                    onClick={() => onToggleCategory(cat.id)}
                  />
                ))}
              </div>
            );
          })
        ) : (
          // Flat view for single source
          categories.map((cat) => (
            <CategoryButton
              key={cat.id}
              category={cat}
              isActive={enabledCategories.has(cat.id)}
              onClick={() => onToggleCategory(cat.id)}
            />
          ))
        )}
      </nav>
    );
  },
);

ProtocolFilterSidebar.displayName = 'ProtocolFilterSidebar';

export default ProtocolFilterSidebar;
