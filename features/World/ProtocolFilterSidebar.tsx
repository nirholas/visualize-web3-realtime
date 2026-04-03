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
    const [mobileOpen, setMobileOpen] = useState(false);

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

    const buttons = (
      <>
        {/* Render provider toggles — separate crypto and agent sources */}
        {sources && sources.length > 0 && onToggleProvider && (() => {
          const cryptoSources = sources.filter((s) => s.id !== 'agents');
          const agentSource = sources.find((s) => s.id === 'agents');
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cryptoSources.map((source) => (
                <ProviderToggle
                  key={source.id}
                  source={source}
                  active={enabledProviders?.has(source.id) ?? true}
                  onClick={() => onToggleProvider(source.id)}
                />
              ))}
              {agentSource && (
                <>
                  {/* Separator between crypto and agent sources */}
                  <div
                    style={{
                      borderTop: '1px solid rgba(0,0,0,0.1)',
                      margin: '4px 4px',
                    }}
                  />
                  <span
                    style={{
                      color: '#999',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 8,
                      letterSpacing: '0.1em',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                    }}
                  >
                    AI Agents
                  </span>
                  <ProviderToggle
                    source={agentSource}
                    active={enabledProviders?.has(agentSource.id) ?? true}
                    onClick={() => onToggleProvider(agentSource.id)}
                  />
                </>
              )}
            </div>
          );
        })()}

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
      </>
    );

    return (
      <>
        {/* Desktop sidebar */}
        <nav
          aria-label="Filter categories and providers"
          className="sidebar-desktop"
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
          {buttons}
        </nav>

        {/* Mobile hamburger button (visible below 768px) */}
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

        {/* Mobile sidebar drawer */}
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
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                borderRight: '1px solid #e0e0e0',
                boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                height: '100%',
                left: 0,
                padding: '60px 16px 16px',
                position: 'absolute',
                top: 0,
                width: 72,
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
                  left: 24,
                  lineHeight: 1,
                  position: 'absolute',
                  top: 16,
                }}
                type="button"
              >
                &times;
              </button>
              {buttons}
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
