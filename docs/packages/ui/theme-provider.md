# @web3viz/ui -- ThemeProvider

## File Path

`packages/ui/src/theme/ThemeProvider.tsx`

## Purpose

Implements the React context-based theming system for the design system. Provides `ThemeProvider` (which injects CSS custom properties as inline styles on a wrapper `<div>`) and `useTheme` (which reads the current theme from context). Marked with `'use client'` for Next.js App Router compatibility.

## Module Dependencies

| Import | Source | Description |
|---|---|---|
| `React` | `react` | React namespace (JSX runtime) |
| `createContext` | `react` | Creates the `ThemeContext` |
| `useContext` | `react` | Used by `useTheme` hook |
| `useMemo` | `react` | Memoizes context value and style object |
| `ReactNode` | `react` | Type for `children` prop |
| `lightTheme` | `./themes` | Default theme when none is provided |
| `Theme` | `./themes` | Type interface for theme objects |

## Line-by-Line Documentation

### Line 1: Client Directive

```ts
'use client';
```

Next.js App Router directive that marks this module as a client component, since it uses React context, hooks, and interactive rendering.

### Line 3: React Imports

```ts
import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
```

Imports the React namespace and the specific hooks/types needed: `createContext` for creating the theme context, `useContext` for the consumer hook, `useMemo` for performance optimization, and `ReactNode` for children typing.

### Line 4: Theme Imports

```ts
import { lightTheme, type Theme } from './themes';
```

Imports the `lightTheme` object (used as the default context value and default prop) and the `Theme` type.

### Lines 10-14: ThemeContextValue Interface

```ts
interface ThemeContextValue {
  theme: Theme;
  /** Resolve a CSS variable to its current value */
  getVar: (varName: string) => string;
}
```

Internal (non-exported) interface defining the shape of the context value:
- **`theme`** (`Theme`): The full theme object containing `name` and `cssVars`.
- **`getVar`** (`(varName: string) => string`): A utility function that resolves a CSS custom property name to its current string value from the theme's `cssVars` map. Returns empty string if the variable is not found.

### Lines 16-19: ThemeContext Creation

```ts
const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  getVar: (v) => lightTheme.cssVars[v] ?? '',
});
```

Creates the React context with a sensible default value (light theme) so that components using `useTheme` outside of a provider still function with light theme defaults.

### Lines 25-28: ThemeProviderProps Interface

```ts
export interface ThemeProviderProps {
  theme?: Theme;
  children: ReactNode;
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `theme` | `Theme` | `lightTheme` | Optional theme object; defaults to light theme |
| `children` | `ReactNode` | (required) | Child components that will have access to the theme context |

### Lines 42-67: ThemeProvider Component

```ts
export function ThemeProvider({ theme = lightTheme, children }: ThemeProviderProps) {
```

A named function component (not wrapped in `memo` since it is a top-level provider and re-renders are expected to be infrequent).

#### Lines 43-49: Context Value Memoization

```ts
const contextValue = useMemo<ThemeContextValue>(
  () => ({
    theme,
    getVar: (varName: string) => theme.cssVars[varName] ?? '',
  }),
  [theme],
);
```

Creates a memoized `ThemeContextValue` that recalculates only when the `theme` reference changes. The `getVar` closure captures the current theme's `cssVars` for property resolution.

#### Lines 52-58: CSS Variables Style Object

```ts
const style = useMemo(() => {
  const s: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.cssVars)) {
    s[key] = value;
  }
  return s;
}, [theme.cssVars]);
```

Converts the theme's `cssVars` map into a flat `Record<string, string>` suitable for React's inline `style` prop. Memoized on `theme.cssVars`. When React renders this as inline styles on the wrapper `<div>`, the browser registers them as CSS custom properties (e.g., `--w3v-bg: #ffffff`).

#### Lines 60-66: JSX Render

```tsx
return (
  <ThemeContext.Provider value={contextValue}>
    <div style={style} data-w3v-theme={theme.name}>
      {children}
    </div>
  </ThemeContext.Provider>
);
```

- Wraps children in `ThemeContext.Provider` to supply theme context.
- Renders a `<div>` wrapper with:
  - `style={style}` -- injects all CSS custom properties as inline styles.
  - `data-w3v-theme={theme.name}` -- data attribute (e.g., `data-w3v-theme="dark"`) for CSS selectors or debugging.

### Lines 74-76: useTheme Hook

```ts
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
```

Consumer hook that returns the `ThemeContextValue` from the nearest `ThemeProvider`. If used outside a provider, returns the default context (light theme).

## Exported Members

| Export | Kind | Description |
|---|---|---|
| `ThemeProviderProps` | type | Props interface for the `ThemeProvider` |
| `ThemeProvider` | function component | Context provider that injects CSS variables |
| `useTheme` | function (hook) | Returns `{ theme, getVar }` from context |

## Usage Examples

```tsx
import { ThemeProvider, useTheme, darkTheme } from '@web3viz/ui/theme';

// Provide theme at the app root
function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <Dashboard />
    </ThemeProvider>
  );
}

// Consume theme in any child component
function Dashboard() {
  const { theme, getVar } = useTheme();
  const bg = getVar('--w3v-bg'); // '#08080f' for dark theme
  return <div>Current theme: {theme.name}</div>;
}
```
