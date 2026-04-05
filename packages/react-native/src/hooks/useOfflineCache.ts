// ============================================================================
// Offline cache hook
//
// Caches the latest topTokens and traderEdges to AsyncStorage so the
// visualization can display the last known state when offline.
// ============================================================================

import { useEffect, useRef, useCallback } from 'react';
import type { TopToken, TraderEdge } from '@web3viz/core';

const CACHE_KEY = '@swarming/offline-cache';

/** Minimal AsyncStorage-like interface */
interface StorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

function tryGetStorage(): StorageLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AsyncStorage } = require('react-native');
    return AsyncStorage;
  } catch {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('@react-native-async-storage/async-storage').default;
    } catch {
      return null;
    }
  }
}

interface CachedData {
  topTokens: TopToken[];
  traderEdges: TraderEdge[];
  timestamp: number;
}

export function useOfflineCache(
  topTokens: TopToken[],
  traderEdges: TraderEdge[],
  enabled: boolean,
): { cachedTokens: TopToken[]; cachedEdges: TraderEdge[] } {
  const cachedRef = useRef<CachedData | null>(null);

  // Load cache on mount
  useEffect(() => {
    if (!enabled) return;
    const storage = tryGetStorage();
    if (!storage) return;

    storage.getItem(CACHE_KEY).then((raw) => {
      if (raw) {
        try {
          cachedRef.current = JSON.parse(raw);
        } catch { /* ignore corrupt cache */ }
      }
    }).catch(() => {});
  }, [enabled]);

  // Persist when data changes
  const persist = useCallback(() => {
    if (!enabled || topTokens.length === 0) return;
    const storage = tryGetStorage();
    if (!storage) return;

    const data: CachedData = { topTokens, traderEdges, timestamp: Date.now() };
    cachedRef.current = data;
    storage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
  }, [enabled, topTokens, traderEdges]);

  useEffect(() => { persist(); }, [persist]);

  return {
    cachedTokens: topTokens.length > 0 ? topTokens : (cachedRef.current?.topTokens ?? []),
    cachedEdges: traderEdges.length > 0 ? traderEdges : (cachedRef.current?.traderEdges ?? []),
  };
}
