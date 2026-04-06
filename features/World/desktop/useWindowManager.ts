import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WindowId, WindowState } from './desktopTypes';
import { APP_MAP } from './desktopConstants';

const STORAGE_KEY = 'w12_windows';

function defaultState(id: WindowId): WindowState {
  const app = APP_MAP[id];
  return {
    id,
    isOpen: false,
    isMinimized: false,
    zIndex: 10,
    position: app?.defaultPosition ?? { x: 200, y: 100 },
    size: app?.defaultSize,
  };
}

function loadPersistedState(): Record<WindowId, WindowState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistState(state: Record<WindowId, WindowState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded – ignore */
  }
}

const ALL_IDS: WindowId[] = [
  'filters', 'livefeed', 'stats', 'aichat', 'share', 'embed', 'sources', 'timeline',
];

function buildInitialState(): Record<WindowId, WindowState> {
  const state = {} as Record<WindowId, WindowState>;
  for (const id of ALL_IDS) {
    state[id] = defaultState(id);
    // Always start with windows closed on fresh page load
    state[id].isOpen = false;
    state[id].isMinimized = false;
  }
  return state;
}

let nextZ = 100;

export function useWindowManager() {
  const [windows, setWindows] = useState<Record<WindowId, WindowState>>(buildInitialState);

  // Restore persisted positions/sizes after mount to avoid hydration mismatch
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const persisted = loadPersistedState();
    if (!persisted) return;
    setWindows((prev) => {
      const next = { ...prev };
      for (const id of ALL_IDS) {
        if (persisted[id]) {
          next[id] = { ...persisted[id], isOpen: false, isMinimized: false };
        }
      }
      return next;
    });
  }, []);

  const update = useCallback((id: WindowId, patch: Partial<WindowState>) => {
    setWindows((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      persistState(next);
      return next;
    });
  }, []);

  const openWindow = useCallback((id: WindowId) => {
    nextZ += 1;
    update(id, { isOpen: true, isMinimized: false, zIndex: nextZ });
  }, [update]);

  const closeWindow = useCallback((id: WindowId) => {
    update(id, { isOpen: false, isMinimized: false });
  }, [update]);

  const minimizeWindow = useCallback((id: WindowId) => {
    update(id, { isMinimized: true });
  }, [update]);

  const focusWindow = useCallback((id: WindowId) => {
    nextZ += 1;
    update(id, { zIndex: nextZ });
  }, [update]);

  const toggleWindow = useCallback((id: WindowId) => {
    setWindows((prev) => {
      const w = prev[id];
      nextZ += 1;
      let patch: Partial<WindowState>;
      if (!w.isOpen) {
        patch = { isOpen: true, isMinimized: false, zIndex: nextZ };
      } else if (w.isMinimized) {
        patch = { isMinimized: false, zIndex: nextZ };
      } else {
        patch = { isMinimized: true };
      }
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      persistState(next);
      return next;
    });
  }, []);

  const updatePosition = useCallback((id: WindowId, position: { x: number; y: number }) => {
    update(id, { position });
  }, [update]);

  const updateSize = useCallback((id: WindowId, size: { width: number; height: number }) => {
    update(id, { size });
  }, [update]);

  const openWindows = useMemo(
    () => Object.values(windows).filter((w) => w.isOpen && !w.isMinimized),
    [windows],
  );

  return {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    focusWindow,
    toggleWindow,
    updatePosition,
    updateSize,
    openWindows,
  };
}
