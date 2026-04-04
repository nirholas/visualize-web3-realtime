'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns perceived luminance (0 = black, 1 = white) from a hex color */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface DarkModeContextValue {
  isDark: boolean;
}

const DarkModeContext = createContext<DarkModeContextValue>({ isDark: true });

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function DarkModeProvider({
  background,
  children,
}: {
  /** Current scene/page background color (hex) */
  background: string;
  children: ReactNode;
}) {
  const value = useMemo<DarkModeContextValue>(
    () => ({ isDark: luminance(background) < 0.45 }),
    [background],
  );

  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDarkMode(): boolean {
  return useContext(DarkModeContext).isDark;
}
