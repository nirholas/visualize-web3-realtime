// ============================================================================
// @web3viz/ui — Theme Definitions
// ============================================================================

import { colors } from '../tokens/colors';

export interface Theme {
  name: string;
  cssVars: Record<string, string>;
}

/** Extract all CSS custom property defaults for a given mode */
function buildCssVars(mode: 'light' | 'dark'): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [, value] of Object.entries(colors)) {
    if (typeof value === 'object' && 'var' in value) {
      vars[value.var] = value[mode];
    }
  }
  return vars;
}

export const lightTheme: Theme = {
  name: 'light',
  cssVars: {
    ...buildCssVars('light'),
    '--w3v-backdrop': 'rgba(8,8,15,0.6)',
    '--w3v-backdrop-blur': '12px',
    '--w3v-graph-ground': '#f8f8fa',
  },
};

export const darkTheme: Theme = {
  name: 'dark',
  cssVars: {
    ...buildCssVars('dark'),
    '--w3v-backdrop': 'rgba(255,255,255,0.06)',
    '--w3v-backdrop-blur': '12px',
    '--w3v-graph-ground': '#111118',
  },
};

/** Create a custom theme by overriding specific CSS variables */
export function createTheme(name: string, overrides: Record<string, string>, base: Theme = lightTheme): Theme {
  return {
    name,
    cssVars: { ...base.cssVars, ...overrides },
  };
}
