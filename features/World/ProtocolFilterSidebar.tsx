'use client';

import { memo, useState, useCallback } from 'react';
import type { CategoryConfig, SourceConfig } from '@web3viz/core';

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
// Chevron icon
// ---------------------------------------------------------------------------

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="none"
    style={{
      transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 150ms ease',
      flexShrink: 0,
    }}
  >
    <path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------------------------------------------------------------------------
// Category toggle row
// ---------------------------------------------------------------------------

interface CategoryRowProps {
  category: CategoryConfig;
  isActive: boolean;
  onClick: () => void;
}

const CategoryRow = memo<CategoryRowProps>(({ category, isActive, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      aria-label={category.label}
      aria-pressed={isActive}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        alignItems: 'center',
        background: hovered ? 'rgba(0,0,0,0.03)' : 'transparent',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        display: 'flex',
        fontFamily: "'IBM Plex Mono', monospace",
        gap: 8,
        outline: 'none',
        padding: '4px 8px',
        transition: 'background 120ms ease',
        width: '100%',
      }}
    >
      {/* Color dot */}
      <span
        style={{
          background: isActive ? category.color : '#d0d0d4',
          borderRadius: '50%',
          boxShadow: isActive ? `0 0 6px ${category.color}50` : 'none',
          display: 'inline-block',
          flexShrink: 0,
          height: 8,
          transition: 'all 150ms ease',
          width: 8,
        }}
      />
      {/* Label */}
      <span
        style={{
          color: isActive ? '#333' : '#999',
          fontSize: 11,
          fontWeight: isActive ? 600 : 400,
          letterSpacing: '0.02em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'color 150ms ease',
          whiteSpace: 'nowrap',
        }}
      >
        {category.label}
      </span>
    </button>
  );
});
CategoryRow.displayName = 'CategoryRow';

// ---------------------------------------------------------------------------
// Source group (collapsible section)
// ---------------------------------------------------------------------------

interface SourceGroupProps {
  source: SourceConfig;
  categories: CategoryConfig[];
  enabledCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
  providerActive: boolean;
  onToggleProvider?: () => void;
}

const SourceGroup = memo<SourceGroupProps>(
  ({ source, categories, enabledCategories, onToggleCategory, providerActive, onToggleProvider }) => {
    const [open, setOpen] = useState(true);
    const [headerHovered, setHeaderHovered] = useState(false);

    const activeCount = categories.filter((c) => enabledCategories.has(c.id)).length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Group header */}
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            gap: 6,
            padding: '6px 4px',
            userSelect: 'none',
          }}
        >
          {/* Provider on/off toggle */}
          {onToggleProvider && (
            <button
              aria-label={`Toggle ${source.label}`}
              onClick={onToggleProvider}
              style={{
                alignItems: 'center',
                background: providerActive ? source.color : '#d0d0d4',
                border: 'none',
                borderRadius: '50%',
                boxShadow: providerActive ? `0 0 8px ${source.color}40` : 'none',
                color: providerActive ? '#fff' : '#888',
                cursor: 'pointer',
                display: 'flex',
                flexShrink: 0,
                fontSize: 12,
                height: 22,
                justifyContent: 'center',
                outline: 'none',
                padding: 0,
                transition: 'all 150ms ease',
                width: 22,
              }}
            >
              {source.icon}
            </button>
          )}

          {/* Clickable label + chevron to expand/collapse */}
          <button
            onClick={() => setOpen((o) => !o)}
            onMouseEnter={() => setHeaderHovered(true)}
            onMouseLeave={() => setHeaderHovered(false)}
            style={{
              alignItems: 'center',
              background: 'none',
              border: 'none',
              color: headerHovered ? '#333' : '#666',
              cursor: 'pointer',
              display: 'flex',
              flex: 1,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              fontWeight: 600,
              gap: 4,
              letterSpacing: '0.08em',
              outline: 'none',
              padding: 0,
              textTransform: 'uppercase',
              transition: 'color 120ms ease',
            }}
          >
            <ChevronIcon open={open} />
            {source.label}
          </button>

          {/* Active count badge */}
          <span
            style={{
              background: activeCount > 0 ? `${source.color}18` : 'transparent',
              borderRadius: 8,
              color: activeCount > 0 ? source.color : '#bbb',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              fontWeight: 600,
              lineHeight: 1,
              padding: '2px 5px',
              transition: 'all 150ms ease',
            }}
          >
            {activeCount}/{categories.length}
          </span>
        </div>

        {/* Collapsible category list */}
        <div
          style={{
            display: open ? 'flex' : 'none',
            flexDirection: 'column',
            gap: 1,
            paddingLeft: onToggleProvider ? 30 : 16,
          }}
        >
          {categories.map((cat) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              isActive={enabledCategories.has(cat.id)}
              onClick={() => onToggleCategory(cat.id)}
            />
          ))}
        </div>
      </div>
    );
  },
);
SourceGroup.displayName = 'SourceGroup';

// ---------------------------------------------------------------------------
// Main Sidebar
// ---------------------------------------------------------------------------

const ProtocolFilterSidebar = memo<ProtocolFilterSidebarProps>(
  ({ categories, sources, enabledCategories, onToggleCategory, enabledProviders, onToggleProvider }) => {
    const [mobileOpen, setMobileOpen] = useState(false);

    if (categories.length === 0) return null;

    // Group categories by source
    const categoryBySource = new Map<string | undefined, CategoryConfig[]>();
    for (const cat of categories) {
      const key = cat.sourceId;
      if (!categoryBySource.has(key)) categoryBySource.set(key, []);
      categoryBySource.get(key)!.push(cat);
    }

    // Separate sources: crypto vs agents
    const cryptoSources = sources?.filter((s) => s.id !== 'agents') ?? [];
    const agentSources = sources?.filter((s) => s.id === 'agents') ?? [];
    const allGroupedSources = [...cryptoSources, ...agentSources];

    const content = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
        }}
      >
        {/* Header */}
        <div
          style={{
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#aaa',
            padding: '8px 8px 6px',
            textTransform: 'uppercase',
          }}
        >
          Sources
        </div>

        {/* Grouped sources */}
        {allGroupedSources.map((source, i) => {
          const sourceCats = categoryBySource.get(source.id) || [];
          if (sourceCats.length === 0) return null;
          const isAgentSection = source.id === 'agents';
          return (
            <div key={source.id}>
              {isAgentSection && cryptoSources.length > 0 && (
                <div
                  style={{
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    margin: '4px 8px',
                  }}
                />
              )}
              <SourceGroup
                source={source}
                categories={sourceCats}
                enabledCategories={enabledCategories}
                onToggleCategory={onToggleCategory}
                providerActive={enabledProviders?.has(source.id) ?? true}
                onToggleProvider={onToggleProvider ? () => onToggleProvider(source.id) : undefined}
              />
            </div>
          );
        })}

        {/* Ungrouped categories (no sourceId) */}
        {categoryBySource.has(undefined) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '4px 8px' }}>
            {categoryBySource.get(undefined)!.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                isActive={enabledCategories.has(cat.id)}
                onClick={() => onToggleCategory(cat.id)}
              />
            ))}
          </div>
        )}
      </div>
    );

    return (
      <>
        {/* Desktop sidebar */}
        <nav
          aria-label="Filter categories and providers"
          className="sidebar-desktop"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 12,
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            left: 16,
            maxHeight: 'calc(100vh - 120px)',
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 180,
            zIndex: 20,
          }}
        >
          {content}
        </nav>

        {/* Mobile hamburger button */}
        <button
          aria-label="Open filters"
          className="sidebar-mobile-toggle"
          onClick={() => setMobileOpen(true)}
          style={{
            alignItems: 'center',
            background: '#ffffff',
            border: '1px solid #e8e8e8',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            color: '#666',
            cursor: 'pointer',
            display: 'none',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            height: 36,
            justifyContent: 'center',
            left: 12,
            position: 'absolute',
            top: 56,
            width: 36,
            zIndex: 20,
          }}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              background: 'rgba(0,0,0,0.2)',
              inset: 0,
              position: 'fixed',
              zIndex: 49,
            }}
          >
            <nav
              aria-label="Filter categories and providers"
              onClick={(e) => e.stopPropagation()}
              style={{
                animation: 'slideInLeft 0.25s ease-out',
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRight: '1px solid #e0e0e0',
                boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                left: 0,
                padding: '48px 0 0',
                position: 'absolute',
                top: 0,
                width: 200,
              }}
            >
              <button
                aria-label="Close filters"
                onClick={() => setMobileOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  cursor: 'pointer',
                  fontSize: 18,
                  left: 8,
                  lineHeight: 1,
                  position: 'absolute',
                  top: 14,
                }}
                type="button"
              >
                &times;
              </button>
              {content}
            </nav>
          </div>
        )}

        {/* Show hamburger on mobile only */}
        <style>{`
          @media (max-width: 768px) {
            .sidebar-mobile-toggle { display: flex !important; }
          }
        `}</style>
      </>
    );
  },
);

ProtocolFilterSidebar.displayName = 'ProtocolFilterSidebar';

export default ProtocolFilterSidebar;
