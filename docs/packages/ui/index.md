# @web3viz/ui -- Main Entry Point

## File Path

`packages/ui/src/index.ts`

## Purpose

Central barrel export file for the `@web3viz/ui` design system package. Aggregates and re-exports every public symbol (components, types, tokens, theme utilities) from the four internal module groups: **Tokens**, **Theme**, **Primitives**, and **Composed**. Consumers can import everything from a single entry point or use deep imports for tree-shaking.

## Module Dependencies

This file has no external dependencies. It re-exports from internal modules only:

| Internal Module | Path |
|---|---|
| Tokens / colors | `./tokens/colors` |
| Tokens / typography | `./tokens/typography` |
| Tokens / spacing | `./tokens/spacing` |
| Theme / ThemeProvider | `./theme/ThemeProvider` |
| Theme / themes | `./theme/themes` |
| Primitives / Button | `./primitives/Button` |
| Primitives / Pill | `./primitives/Pill` |
| Primitives / Badge | `./primitives/Badge` |
| Primitives / Input | `./primitives/Input` |
| Primitives / Dialog | `./primitives/Dialog` |
| Primitives / ColorControl | `./primitives/ColorControl` |
| Composed / FilterSidebar | `./composed/FilterSidebar` |
| Composed / StatsBar | `./composed/StatsBar` |
| Composed / LiveFeed | `./composed/LiveFeed` |
| Composed / SharePanel | `./composed/SharePanel` |
| Composed / ShareOverlay | `./composed/ShareOverlay` |
| Composed / InfoPopover | `./composed/InfoPopover` |
| Composed / Journey | `./composed/Journey` |
| Composed / WorldHeader | `./composed/WorldHeader` |

## Line-by-Line Documentation

### Lines 1-13: Module Header Comment

Block comment documenting the package name (`@web3viz/ui`), its role as the main entry point for the design system, and usage examples showing both barrel imports and deep imports.

### Lines 15-18: Token Exports

```ts
export { colors, palette, swatches } from './tokens/colors';
export { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textStyles } from './tokens/typography';
export { spacing, borderRadius, shadows, zIndex, breakpoints, transitions } from './tokens/spacing';
```

- **Line 16**: Re-exports three color constants -- `colors` (theme-aware semantic color map), `palette` (flat hex-value lookup), and `swatches` (arrays of hex strings used in color pickers).
- **Line 17**: Re-exports all typography tokens -- font families, sizes, weights, line heights, letter spacings, and pre-composed text style objects.
- **Line 18**: Re-exports all spacing/layout tokens -- spacing scale, border radius, box shadows, z-index layers, breakpoints, and transition definitions.

### Lines 20-22: Theme Exports

```ts
export { ThemeProvider, useTheme, type ThemeProviderProps } from './theme/ThemeProvider';
export { lightTheme, darkTheme, createTheme, type Theme } from './theme/themes';
```

- **Line 21**: Re-exports the React context provider (`ThemeProvider`), the consumer hook (`useTheme`), and the provider's props type (`ThemeProviderProps`).
- **Line 22**: Re-exports the two built-in theme objects (`lightTheme`, `darkTheme`), the factory function (`createTheme`), and the `Theme` type interface.

### Lines 24-30: Primitive Component Exports

```ts
export { Button, type ButtonProps } from './primitives/Button';
export { Pill, StatPill, type PillProps, type StatPillProps } from './primitives/Pill';
export { Badge, StatusDot, type BadgeProps, type StatusDotProps } from './primitives/Badge';
export { TextInput, HexInput, type TextInputProps, type HexInputProps } from './primitives/Input';
export { Dialog, Panel, type DialogProps, type PanelProps } from './primitives/Dialog';
export { SwatchPicker, ColorControl, type SwatchPickerProps, type ColorControlProps } from './primitives/ColorControl';
```

Each line re-exports one or more low-level UI components along with their TypeScript props interfaces.

### Lines 32-40: Composed Component Exports

```ts
export { FilterSidebar, type FilterSidebarProps } from './composed/FilterSidebar';
export { StatsBar, useAnimatedValue, formatNumber, type StatsBarProps } from './composed/StatsBar';
export { LiveFeed, type LiveFeedProps } from './composed/LiveFeed';
export { SharePanel, type SharePanelProps } from './composed/SharePanel';
export { ShareOverlay, type ShareOverlayProps } from './composed/ShareOverlay';
export { InfoPopover, type InfoPopoverProps } from './composed/InfoPopover';
export { JourneyOverlay, StartJourneyButton, type JourneyOverlayProps, type StartJourneyButtonProps } from './composed/Journey';
export { ConnectionIndicator, WorldHeader, type ConnectionIndicatorProps, type WorldHeaderProps } from './composed/WorldHeader';
```

Higher-level components composed from primitives. The `StatsBar` export also includes the `useAnimatedValue` hook and `formatNumber` utility function.

## Exported Members Summary

### Values

| Export | Kind | Source |
|---|---|---|
| `colors` | `const` object | `./tokens/colors` |
| `palette` | `const` object | `./tokens/colors` |
| `swatches` | `const` object | `./tokens/colors` |
| `fontFamily` | `const` object | `./tokens/typography` |
| `fontSize` | `const` object | `./tokens/typography` |
| `fontWeight` | `const` object | `./tokens/typography` |
| `lineHeight` | `const` object | `./tokens/typography` |
| `letterSpacing` | `const` object | `./tokens/typography` |
| `textStyles` | `const` object | `./tokens/typography` |
| `spacing` | `const` object | `./tokens/spacing` |
| `borderRadius` | `const` object | `./tokens/spacing` |
| `shadows` | `const` object | `./tokens/spacing` |
| `zIndex` | `const` object | `./tokens/spacing` |
| `breakpoints` | `const` object | `./tokens/spacing` |
| `transitions` | `const` object | `./tokens/spacing` |
| `ThemeProvider` | React component | `./theme/ThemeProvider` |
| `useTheme` | React hook | `./theme/ThemeProvider` |
| `lightTheme` | `Theme` | `./theme/themes` |
| `darkTheme` | `Theme` | `./theme/themes` |
| `createTheme` | function | `./theme/themes` |
| `Button` | React component | `./primitives/Button` |
| `Pill` | React component | `./primitives/Pill` |
| `StatPill` | React component | `./primitives/Pill` |
| `Badge` | React component | `./primitives/Badge` |
| `StatusDot` | React component | `./primitives/Badge` |
| `TextInput` | React component | `./primitives/Input` |
| `HexInput` | React component | `./primitives/Input` |
| `Dialog` | React component | `./primitives/Dialog` |
| `Panel` | React component | `./primitives/Dialog` |
| `SwatchPicker` | React component | `./primitives/ColorControl` |
| `ColorControl` | React component | `./primitives/ColorControl` |
| `FilterSidebar` | React component | `./composed/FilterSidebar` |
| `StatsBar` | React component | `./composed/StatsBar` |
| `useAnimatedValue` | React hook | `./composed/StatsBar` |
| `formatNumber` | function | `./composed/StatsBar` |
| `LiveFeed` | React component | `./composed/LiveFeed` |
| `SharePanel` | React component | `./composed/SharePanel` |
| `ShareOverlay` | React component | `./composed/ShareOverlay` |
| `InfoPopover` | React component | `./composed/InfoPopover` |
| `JourneyOverlay` | React component | `./composed/Journey` |
| `StartJourneyButton` | React component | `./composed/Journey` |
| `ConnectionIndicator` | React component | `./composed/WorldHeader` |
| `WorldHeader` | React component | `./composed/WorldHeader` |

### Types

`ThemeProviderProps`, `Theme`, `ButtonProps`, `PillProps`, `StatPillProps`, `BadgeProps`, `StatusDotProps`, `TextInputProps`, `HexInputProps`, `DialogProps`, `PanelProps`, `SwatchPickerProps`, `ColorControlProps`, `FilterSidebarProps`, `StatsBarProps`, `LiveFeedProps`, `SharePanelProps`, `ShareOverlayProps`, `InfoPopoverProps`, `JourneyOverlayProps`, `StartJourneyButtonProps`, `ConnectionIndicatorProps`, `WorldHeaderProps`

## Usage Examples

```tsx
// Barrel import
import { Button, ThemeProvider, darkTheme } from '@web3viz/ui';

// Deep imports for tree-shaking
import { Button } from '@web3viz/ui/primitives';
import { darkTheme } from '@web3viz/ui/theme';
import { colors } from '@web3viz/ui/tokens';
```
