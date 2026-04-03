'use client';

import { memo, useCallback } from 'react';
import type { CategoryConfig, PumpFunCategory } from '@/hooks/useDataProvider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProtocolFilterSidebarProps {
  /** Category configs to render as buttons */
  categories: CategoryConfig[];
  /** Currently highlighted protocol (null = none) */
  activeProtocol: PumpFunCategory | null;
  /** Called when a protocol button is clicked */
  onToggle: (id: PumpFunCategory) => void;
  /** Optional per-category counts to show as badge */
  counts?: Record<PumpFunCategory, number>;
}

// ---------------------------------------------------------------------------
// Single Protocol Button
// ---------------------------------------------------------------------------

interface ProtocolButtonProps {
  category: CategoryConfig;
  isActive: boolean;
  count?: number;
  onClick: () => void;
}

const ProtocolButton = memo<ProtocolButtonProps>(({ category, isActive, count, onClick }) => {
  // Use first 2 characters of the label as the text icon
  const iconText = category.icon;

  return (
    <button
      aria-label={category.label}
      aria-pressed={isActive}
      data-group={category.id}
      onClick={onClick}
      title={`${category.label}${count != null ? ` (${count})` : ''}`}
      style={{
        alignItems: 'center',
        background: isActive ? category.color : '#e8e8e8',
        border: isActive ? `2px solid ${category.color}` : '2px solid transparent',
        borderRadius: '50%',
        boxShadow: isActive
          ? `0 2px 12px ${category.color}60`
          : 'none',
        color: isActive ? '#fff' : '#333',
        cursor: 'pointer',
        display: 'flex',
        fontFamily: 'monospace',
        fontSize: 14,
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
      {iconText}
    </button>
  );
});

ProtocolButton.displayName = 'ProtocolButton';

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const ProtocolFilterSidebar = memo<ProtocolFilterSidebarProps>(
  ({ categories, activeProtocol, onToggle, counts }) => {
    if (categories.length === 0) return null;

    return (
      <nav
        aria-label="Protocol filters"
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
        {categories.map((cfg) => (
          <ProtocolButton
            key={cfg.id}
            category={cfg}
            count={counts?.[cfg.id]}
            isActive={activeProtocol === cfg.id}
            onClick={() => onToggle(cfg.id)}
          />
        ))}
      </nav>
    );
  },
);

ProtocolFilterSidebar.displayName = 'ProtocolFilterSidebar';

export default ProtocolFilterSidebar;
