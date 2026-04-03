// ============================================================================
// @web3viz/ui — Main Entry Point
//
// Design system for Web3 real-time visualizations.
//
// Usage:
//   import { Button, ThemeProvider, darkTheme } from '@web3viz/ui';
//
// Or use deep imports:
//   import { Button } from '@web3viz/ui/primitives';
//   import { darkTheme } from '@web3viz/ui/theme';
//   import { colors } from '@web3viz/ui/tokens';
// ============================================================================

// Tokens
export { colors, palette, swatches } from './tokens/colors';
export { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textStyles } from './tokens/typography';
export { spacing, borderRadius, shadows, zIndex, breakpoints, transitions } from './tokens/spacing';

// Theme
export { ThemeProvider, useTheme, type ThemeProviderProps } from './theme/ThemeProvider';
export { lightTheme, darkTheme, createTheme, type Theme } from './theme/themes';

// Primitives
export { Button, type ButtonProps } from './primitives/Button';
export { Pill, StatPill, type PillProps, type StatPillProps } from './primitives/Pill';
export { Badge, StatusDot, type BadgeProps, type StatusDotProps } from './primitives/Badge';
export { TextInput, HexInput, type TextInputProps, type HexInputProps } from './primitives/Input';
export { Dialog, Panel, type DialogProps, type PanelProps } from './primitives/Dialog';
export { SwatchPicker, ColorControl, type SwatchPickerProps, type ColorControlProps } from './primitives/ColorControl';

// Composed
export { FilterSidebar, type FilterSidebarProps } from './composed/FilterSidebar';
export { StatsBar, useAnimatedValue, formatNumber, type StatsBarProps } from './composed/StatsBar';
export { LiveFeed, type LiveFeedProps } from './composed/LiveFeed';
export { SharePanel, type SharePanelProps } from './composed/SharePanel';
export { ShareOverlay, type ShareOverlayProps } from './composed/ShareOverlay';
export { InfoPopover, type InfoPopoverProps } from './composed/InfoPopover';
export { JourneyOverlay, StartJourneyButton, type JourneyOverlayProps, type StartJourneyButtonProps } from './composed/Journey';
export { ConnectionIndicator, WorldHeader, type ConnectionIndicatorProps, type WorldHeaderProps } from './composed/WorldHeader';
