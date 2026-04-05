'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
// AnimatePresence removed — panel renders inside a Window shell
import type { DataProvider, ConnectionState, SourceConfig } from '@web3viz/core';
import AddCustomProviderForm, { type CustomProviderFormData } from './AddCustomProviderForm';
import { useDarkMode } from './DarkModeContext';

// ============================================================================
// Types
// ============================================================================

interface ProviderPanelProps {
  open: boolean;
  onClose: () => void;
  providers: DataProvider[];
  enabledProviders: Set<string>;
  onToggleProvider: (id: string) => void;
  connections: Record<string, ConnectionState[]>;
  stats: { counts: Record<string, number> };
  onAddCustomProvider?: (data: CustomProviderFormData) => void;
  onRemoveCustomProvider?: (id: string) => void;
  customProviderIds?: Set<string>;
  demoMode?: boolean;
  onToggleDemo?: () => void;
}

// ============================================================================
// Toggle Switch
// ============================================================================

const ToggleSwitch = memo<{ enabled: boolean; onToggle: () => void }>(({ enabled, onToggle }) => (
  <button
    onClick={onToggle}
    type="button"
    aria-label={enabled ? 'Disable provider' : 'Enable provider'}
    style={{
      background: enabled ? '#34d399' : '#d1d5db',
      border: 'none',
      borderRadius: 10,
      cursor: 'pointer',
      height: 20,
      position: 'relative',
      transition: 'background 200ms',
      width: 36,
      flexShrink: 0,
    }}
  >
    <div
      style={{
        background: '#fff',
        borderRadius: '50%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        height: 16,
        left: enabled ? 18 : 2,
        position: 'absolute',
        top: 2,
        transition: 'left 200ms',
        width: 16,
      }}
    />
  </button>
));

ToggleSwitch.displayName = 'ToggleSwitch';

// ============================================================================
// Connection Dot
// ============================================================================

const StatusDot = memo<{ status: 'connected' | 'disconnected' | 'disabled' }>(({ status }) => {
  const color = status === 'connected' ? '#22c55e' : status === 'disconnected' ? '#ef4444' : '#d1d5db';
  const label = status === 'connected' ? 'Connected' : status === 'disconnected' ? 'Disconnected' : 'Disabled';
  return (
    <div
      title={label}
      style={{
        background: color,
        borderRadius: '50%',
        height: 6,
        width: 6,
        flexShrink: 0,
      }}
    />
  );
});

StatusDot.displayName = 'StatusDot';

// ============================================================================
// Chain Badge
// ============================================================================

const ChainBadge = memo<{ label: string; color: string }>(({ label, color }) => (
  <span
    style={{
      background: color,
      borderRadius: 10,
      color: '#fff',
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.02em',
      padding: '2px 6px',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </span>
));

ChainBadge.displayName = 'ChainBadge';

// ============================================================================
// Provider Card
// ============================================================================

const ProviderCard = memo<{
  provider: DataProvider;
  enabled: boolean;
  onToggle: () => void;
  connectionStatus: 'connected' | 'disconnected' | 'disabled';
  eventCount: number;
  categoryCount: number;
  isCustom?: boolean;
  onRemove?: () => void;
}>(({ provider, enabled, onToggle, connectionStatus, eventCount, categoryCount, isCustom, onRemove }) => {
  const isDark = useDarkMode();
  const src = provider.sourceConfig;

  return (
    <div
      style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : '#f8f8f8',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        opacity: enabled ? 1 : 0.5,
        padding: '12px 16px',
        transition: 'opacity 200ms',
      }}
    >
      {/* Header: name + toggle */}
      <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
          <StatusDot status={connectionStatus} />
          <span
            style={{
              color: isDark ? '#e2e8f0' : '#1a1a1a',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {src.icon} {provider.name}
          </span>
        </div>
        <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
          {isCustom && onRemove && (
            <button
              onClick={onRemove}
              type="button"
              title="Remove custom source"
              style={{
                alignItems: 'center',
                background: 'none',
                border: 'none',
                color: '#ccc',
                cursor: 'pointer',
                display: 'flex',
                fontSize: 14,
                padding: 0,
                transition: 'color 150ms',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#ef4444'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#ccc'; }}
            >
              &#x2715;
            </button>
          )}
          <ToggleSwitch enabled={enabled} onToggle={onToggle} />
        </div>
      </div>

      {/* Description */}
      {src.description && (
        <span
          style={{
            color: isDark ? '#64748b' : '#888',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            lineHeight: 1.4,
          }}
        >
          {src.description}
        </span>
      )}

      {/* Chain badge + stats row */}
      <div style={{ alignItems: 'center', display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
        <ChainBadge label={src.label} color={src.color} />
        <span
          style={{
            color: isDark ? '#64748b' : '#999',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {categoryCount} categories
        </span>
        <span
          style={{
            color: isDark ? '#64748b' : '#999',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {formatCount(eventCount)} events
        </span>
      </div>
    </div>
  );
});

ProviderCard.displayName = 'ProviderCard';

// ============================================================================
// Helpers
// ============================================================================

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ============================================================================
// ProviderPanel
// ============================================================================

const ProviderPanel = memo<ProviderPanelProps>(({
  open,
  onClose,
  providers,
  enabledProviders,
  onToggleProvider,
  connections,
  stats,
  onAddCustomProvider,
  onRemoveCustomProvider,
  customProviderIds,
  demoMode,
  onToggleDemo,
}) => {
  const isDark = useDarkMode();
  const [showAddForm, setShowAddForm] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [open, onClose]);

  // Compute total events per second (approximate from stats)
  const totalEvents = useMemo(() => {
    return Object.values(stats.counts).reduce((sum, v) => sum + v, 0);
  }, [stats.counts]);

  // Derive connection status per provider
  const getConnectionStatus = useCallback(
    (providerId: string): 'connected' | 'disconnected' | 'disabled' => {
      if (!enabledProviders.has(providerId)) return 'disabled';
      const conns = connections[providerId];
      if (!conns || conns.length === 0) return 'disconnected';
      return conns.some((c) => c.connected) ? 'connected' : 'disconnected';
    },
    [enabledProviders, connections],
  );

  // Get event count for a provider (sum its category counts)
  const getEventCount = useCallback(
    (provider: DataProvider): number => {
      let total = 0;
      for (const cat of provider.categories) {
        total += stats.counts[cat.id] ?? 0;
      }
      return total;
    },
    [stats.counts],
  );

  if (!open) return null;

  return (
        <div
          ref={panelRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '16px 20px',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >

          <p
            style={{
              color: isDark ? '#64748b' : '#888',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              lineHeight: 1.5,
              margin: '0 0 16px',
            }}
          >
            Manage live data providers. Toggle sources on/off to control what appears in the visualization.
          </p>

          {/* See Demo button — shown when no providers are active */}
          {onToggleDemo && !enabledProviders.size && (
            <button
              type="button"
              onClick={onToggleDemo}
              style={{
                alignItems: 'center',
                background: demoMode
                  ? 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)'
                  : 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                fontWeight: 600,
                gap: 8,
                justifyContent: 'center',
                letterSpacing: '0.04em',
                marginBottom: 16,
                padding: '12px 0',
                textTransform: 'uppercase',
                width: '100%',
                transition: 'opacity 150ms, transform 150ms',
                boxShadow: demoMode
                  ? '0 0 16px rgba(129,140,248,0.4)'
                  : '0 2px 8px rgba(129,140,248,0.3)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              {demoMode ? '⏹ Exit Demo' : '▶ See Demo'}
            </button>
          )}

          {/* Global stats */}
          <div
            style={{
              alignItems: 'center',
              background: isDark ? 'rgba(255,255,255,0.03)' : '#f0f0f0',
              borderRadius: 6,
              display: 'flex',
              gap: 12,
              justifyContent: 'space-between',
              marginBottom: 16,
              padding: '8px 12px',
            }}
          >
            <span
              style={{
                color: isDark ? '#64748b' : '#666',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Total Events
            </span>
            <span
              style={{
                color: isDark ? '#e2e8f0' : '#1a1a1a',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {formatCount(totalEvents)}
            </span>
          </div>

          {/* Provider list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {providers.length === 0 ? (
              <div
                style={{
                  color: '#999',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  padding: '24px 0',
                  textAlign: 'center',
                }}
              >
                No data providers registered.
              </div>
            ) : (
              providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  enabled={enabledProviders.has(provider.id)}
                  onToggle={() => onToggleProvider(provider.id)}
                  connectionStatus={getConnectionStatus(provider.id)}
                  eventCount={getEventCount(provider)}
                  categoryCount={provider.categories.length}
                  isCustom={customProviderIds?.has(provider.id)}
                  onRemove={customProviderIds?.has(provider.id) ? () => onRemoveCustomProvider?.(provider.id) : undefined}
                />
              ))
            )}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1, minHeight: 16 }} />

          {/* Add Custom Provider */}
          <div
            style={{
              borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e0e0e0',
              paddingTop: 16,
            }}
          >
            {showAddForm && onAddCustomProvider ? (
              <AddCustomProviderForm
                onSubmit={(data) => {
                  onAddCustomProvider(data);
                  setShowAddForm(false);
                }}
                onCancel={() => setShowAddForm(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                style={{
                  alignItems: 'center',
                  background: isDark ? '#818cf8' : '#1a1a1a',
                  border: isDark ? '1px solid #818cf8' : '1px solid #1a1a1a',
                  borderRadius: 8,
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  gap: 6,
                  justifyContent: 'center',
                  letterSpacing: '0.04em',
                  padding: '10px 0',
                  textTransform: 'uppercase',
                  width: '100%',
                  transition: 'opacity 150ms',
                }}
              >
                + Add Custom Source
              </button>
            )}
          </div>
        </div>
  );
});

ProviderPanel.displayName = 'ProviderPanel';

export default ProviderPanel;
