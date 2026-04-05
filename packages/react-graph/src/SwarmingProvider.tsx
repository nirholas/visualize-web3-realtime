// ============================================================================
// SwarmingProvider — React context for the plugin system
//
// Manages plugin lifecycle, provides theme and renderer hooks to children,
// and exposes the plugin manager for programmatic access.
//
// Usage:
//   <SwarmingProvider plugins={[mockPlugin(), darkTheme()]}>
//     <ForceGraph ... />
//   </SwarmingProvider>
//
// Or use the <Swarming> shorthand which wraps this with a Canvas.
// ============================================================================

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  ResolvedPlugin,
  PluginManager,
  ThemeConfig,
  RendererPluginHooks,
} from '@web3viz/core/plugin';
import { createPluginManager } from '@web3viz/core/plugin';
import type { DataProvider } from '@web3viz/core';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface SwarmingContextValue {
  /** The underlying plugin manager */
  manager: PluginManager;
  /** Active theme (from the last registered theme plugin) */
  theme: ThemeConfig | undefined;
  /** Merged renderer hooks */
  rendererHooks: RendererPluginHooks;
  /** All data providers from source plugins */
  providers: DataProvider[];
  /** All registered plugins */
  plugins: ResolvedPlugin[];
}

const SwarmingContext = createContext<SwarmingContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

export interface SwarmingProviderProps {
  /** Array of resolved plugins (from calling definePlugin factories) */
  plugins: ResolvedPlugin[];
  /** Whether to auto-connect source providers on mount (default: true) */
  autoConnect?: boolean;
  children: ReactNode;
}

export function SwarmingProvider({
  plugins: pluginsProp,
  autoConnect = true,
  children,
}: SwarmingProviderProps) {
  const managerRef = useRef<PluginManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = createPluginManager();
  }
  const manager = managerRef.current;

  // Track version for re-renders on plugin changes
  const [version, setVersion] = useState(0);

  // Register/unregister plugins when the prop changes
  useEffect(() => {
    const currentNames = new Set(manager.getAll().map((p) => p.name));
    const nextNames = new Set(pluginsProp.map((p) => p.name));

    // Unregister removed plugins
    for (const name of currentNames) {
      if (!nextNames.has(name)) {
        manager.unregister(name);
      }
    }

    // Register new plugins
    for (const plugin of pluginsProp) {
      if (!currentNames.has(plugin.name)) {
        manager.register(plugin);
      }
    }

    setVersion((v) => v + 1);
  }, [pluginsProp, manager]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      manager.connectAll();
    }
    return () => {
      manager.disconnectAll();
    };
  }, [autoConnect, manager]);

  // Subscribe to manager changes
  useEffect(() => {
    return manager.onChange(() => setVersion((v) => v + 1));
  }, [manager]);

  const value = useMemo<SwarmingContextValue>(
    () => ({
      manager,
      theme: manager.getActiveTheme(),
      rendererHooks: manager.getRendererHooks(),
      providers: manager.getProviders(),
      plugins: manager.getAll(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manager, version],
  );

  return (
    <SwarmingContext.Provider value={value}>
      {children}
    </SwarmingContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Access the full swarming plugin context */
export function useSwarming(): SwarmingContextValue {
  const ctx = useContext(SwarmingContext);
  if (!ctx) {
    throw new Error('useSwarming must be used within a <SwarmingProvider>');
  }
  return ctx;
}

/** Get the active theme from plugins */
export function useSwarmingTheme(): ThemeConfig | undefined {
  return useSwarming().theme;
}

/** Get all data providers registered by source plugins */
export function useSwarmingProviders(): DataProvider[] {
  return useSwarming().providers;
}

/** Get the plugin manager for programmatic access */
export function usePluginManager(): PluginManager {
  return useSwarming().manager;
}
