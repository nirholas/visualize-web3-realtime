'use client';

import React, { memo, useCallback } from 'react';
import type { CategoryConfig } from '@web3viz/core';
import { fontFamily, fontSize } from '../tokens/typography';
import { borderRadius, shadows } from '../tokens/spacing';

// ============================================================================
// Protocol Button
// ============================================================================

interface ProtocolButtonProps {
  category: CategoryConfig;
  isActive: boolean;
  count?: number;
  onClick: () => void;
}

const ProtocolButton = memo<ProtocolButtonProps>(({ category, isActive, count, onClick }) => (
  <button
    aria-label={category.label}
    aria-pressed={isActive}
    data-group={category.id}
    onClick={onClick}
    title={`${category.label}${count != null ? ` (${count})` : ''}`}
    style={{
      alignItems: 'center',
      background: isActive ? category.color : 'var(--w3v-border, #e8e8e8)',
      border: isActive ? `2px solid ${category.color}` : '2px solid transparent',
      borderRadius: borderRadius.full,
      boxShadow: isActive ? shadows.glow(category.color) : 'none',
      color: isActive ? '#fff' : 'var(--w3v-fg, #333)',
      cursor: 'pointer',
      display: 'flex',
      fontFamily: 'monospace',
      fontSize: fontSize.lg,
      fontWeight: 700,
      height: 40,
      justifyContent: 'center',
      lineHeight: 1,
      outline: 'none',
      padding: 0,
      transition: 'all 150ms ease',
      width: 40,
    }}
  >
    {category.icon}
  </button>
));

ProtocolButton.displayName = 'ProtocolButton';

// ============================================================================
// FilterSidebar — vertical category toggle sidebar
// ============================================================================

export interface FilterSidebarProps {
  categories: CategoryConfig[];
  activeCategory: string | null;
  onToggle: (id: string) => void;
  counts?: Record<string, number>;
  position?: 'left' | 'right';
  style?: React.CSSProperties;
}

export const FilterSidebar = memo<FilterSidebarProps>(({
  categories,
  activeCategory,
  onToggle,
  counts,
  position = 'left',
  style,
}) => {
  if (categories.length === 0) return null;

  return (
    <nav
      aria-label="Protocol filters"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        [position]: 16,
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 20,
        ...style,
      }}
    >
      {categories.map((cfg) => (
        <ProtocolButton
          key={cfg.id}
          category={cfg}
          count={counts?.[cfg.id]}
          isActive={activeCategory === cfg.id}
          onClick={() => onToggle(cfg.id)}
        />
      ))}
    </nav>
  );
});

FilterSidebar.displayName = 'FilterSidebar';
