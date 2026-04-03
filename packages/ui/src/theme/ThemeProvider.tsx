'use client';

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { lightTheme, type Theme } from './themes';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ThemeContextValue {
  theme: Theme;
  /** Resolve a CSS variable to its current value */
  getVar: (varName: string) => string;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  getVar: (v) => lightTheme.cssVars[v] ?? '',
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ThemeProviderProps {
  theme?: Theme;
  children: ReactNode;
}

/**
 * Provides theme context and injects CSS custom properties.
 *
 * @example
 * ```tsx
 * import { ThemeProvider, darkTheme } from '@web3viz/ui/theme';
 *
 * <ThemeProvider theme={darkTheme}>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ theme = lightTheme, children }: ThemeProviderProps) {
  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      getVar: (varName: string) => theme.cssVars[varName] ?? '',
    }),
    [theme],
  );

  // Inject CSS variables as inline styles on a wrapper div
  const style = useMemo(() => {
    const s: Record<string, string> = {};
    for (const [key, value] of Object.entries(theme.cssVars)) {
      s[key] = value;
    }
    return s;
  }, [theme.cssVars]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <div style={style} data-w3v-theme={theme.name}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Access the current theme */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
