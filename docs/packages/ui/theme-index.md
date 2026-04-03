# @web3viz/ui -- Theme Module Index

## File Path

`packages/ui/src/theme/index.ts`

## Purpose

Barrel export file for the theme sub-module. Re-exports all public symbols from the `ThemeProvider` and `themes` modules so that consumers can import theme-related items from `@web3viz/ui/theme`.

## Module Dependencies

| Internal Module | Path |
|---|---|
| ThemeProvider | `./ThemeProvider` |
| themes | `./themes` |

## Line-by-Line Documentation

### Line 1: ThemeProvider Exports

```ts
export { ThemeProvider, useTheme, type ThemeProviderProps } from './ThemeProvider';
```

Re-exports the `ThemeProvider` component (React context provider that injects CSS custom properties), the `useTheme` hook (accesses current theme from context), and the `ThemeProviderProps` type interface.

### Line 2: Theme Definition Exports

```ts
export { lightTheme, darkTheme, createTheme, type Theme } from './themes';
```

Re-exports the two built-in theme objects (`lightTheme` and `darkTheme`), the `createTheme` factory function for producing custom themes, and the `Theme` type interface.

## Exported Members

| Export | Kind | Description |
|---|---|---|
| `ThemeProvider` | React component | Context provider for injecting theme CSS variables |
| `useTheme` | React hook | Reads current `Theme` from context |
| `ThemeProviderProps` | type | Props for `ThemeProvider` |
| `lightTheme` | `Theme` | Light color scheme theme object |
| `darkTheme` | `Theme` | Dark color scheme theme object |
| `createTheme` | function | Factory to create custom themes with overrides |
| `Theme` | type | Shape of a theme object (`name` + `cssVars` map) |

## Usage Examples

```tsx
import { ThemeProvider, darkTheme } from '@web3viz/ui/theme';

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <MyApp />
    </ThemeProvider>
  );
}
```
