# Component API Reference

This document provides a complete reference for the component libraries used in this project: `@web3viz/react-graph` for the 3D visualization and `@web3viz/ui` for the user interface.

---

## `@web3viz/react-graph`

This package contains the core 3D visualization components, built with React Three Fiber.

### ForceGraph

The main 3D visualization component. It renders a force-directed graph of nodes and edges.

```tsx
import { ForceGraph, type GraphHandle } from '@web3viz/react-graph';

const ref = useRef<GraphHandle>(null);

<ForceGraph
  ref={ref}
  nodes={nodes}
  edges={edges}
  background="#0a0a0f"
  showLabels
/>
```

#### Props

A comprehensive list of props for the `ForceGraph` component, including types, defaults, and descriptions.

| Prop | Type | Default | Description |
|---|---|---|---|
| `nodes` | `Node[]` | `[]` | The nodes to render in the graph. |
| `edges` | `Edge[]` | `[]` | The edges connecting the nodes. |
| `background` | `string` | `'#ffffff'` | The background color of the canvas. |
| `...` | `...` | `...` | Other props from the original doc... |

#### `GraphHandle` (ref methods)

The `GraphHandle` interface provides methods to interact with the graph programmatically.

```typescript
interface GraphHandle {
  animateCameraTo(request: { position: [x, y, z]; lookAt?: [x, y, z]; durationMs?: number; }): Promise<void>;
  focusNode(nodeId: string, durationMs?: number): Promise<void>;
  // ... other methods
}
```

---

## `@web3viz/ui`

This package provides a comprehensive design system and a library of reusable UI components.

### Theming

The UI library is built with a flexible theming system that uses CSS custom properties. You can customize the look and feel of the components by wrapping your application in the `ThemeProvider`.

```tsx
import { ThemeProvider, createTheme } from '@web3viz/ui';

const myTheme = createTheme({
  //... your theme overrides
});

function App({ children }) {
  return <ThemeProvider theme={myTheme}>{children}</ThemeProvider>;
}
```

### Primitives

A set of basic, reusable components.

*   **Button:** A clickable button.
*   **Input:** A text input field.
*   **Dialog:** A modal dialog.
*   **Panel:** A container with a consistent style.
*   **Badge:** A small badge for displaying status or counts.
*   **... and more.**

### Composed Components

More complex components that are built from the primitives.

*   **StatsBar:** The statistics bar displayed in the main visualization.
*   **LiveFeed:** The real-time event feed.
*   **FilterSidebar:** The sidebar for filtering and controlling the visualization.
*   **WorldHeader:** The main header of the application.
*   **... and more.**

</Button>
```

| Prop | Type | Default | Options |
|---|---|---|---|
| `variant` | `string` | `'primary'` | `'primary'`, `'secondary'`, `'ghost'`, `'icon'` |
| `size` | `string` | `'md'` | `'sm'`, `'md'`, `'lg'` |

Extends all native `<button>` props.

### TextInput

```tsx
import { TextInput } from '@web3viz/ui';

<TextInput variant="dark" placeholder="Search..." onChange={handle} />
```

| Prop | Type | Default |
|---|---|---|
| `variant` | `'default' \| 'dark'` | `'default'` |
| `inputStyle` | `CSSProperties` | — |

Extends all native `<input>` props.

### HexInput

Specialized input for hex color values with validation.

```tsx
import { HexInput } from '@web3viz/ui';

<HexInput value="#ff0000" onChange={(hex) => setColor(hex)} />
```

| Prop | Type | Description |
|---|---|---|
| `value` | `string` | Current hex value |
| `onChange` | `(hex: string) => void` | Called with normalized hex |

### Dialog

Modal/popover with focus trap and keyboard handling.

```tsx
import { Dialog } from '@web3viz/ui';

<Dialog isOpen={open} onClose={() => setOpen(false)} anchorRef={buttonRef}>
  <p>Dialog content</p>
</Dialog>
```

| Prop | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Visibility |
| `onClose` | `() => void` | Close handler (Escape, outside click) |
| `anchorRef` | `RefObject<HTMLElement>` | Position relative to anchor (centered if omitted) |
| `style` | `CSSProperties` | Custom styles |

### Panel

Slide-in side panel with backdrop.

```tsx
import { Panel } from '@web3viz/ui';

<Panel isOpen={open} onClose={close} side="right" width={320}>
  <h2>Settings</h2>
</Panel>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | — | Visibility |
| `onClose` | `() => void` | — | Close handler |
| `side` | `'left' \| 'right'` | `'right'` | Slide direction |
| `width` | `number` | `320` | Panel width (px) |

### Badge

```tsx
import { Badge } from '@web3viz/ui';

<Badge color="#22c55e">Active</Badge>
```

| Prop | Type | Default |
|---|---|---|
| `color` | `string` | Accent color |
| `children` | `ReactNode` | — |

### StatusDot

```tsx
import { StatusDot } from '@web3viz/ui';

<StatusDot color="#22c55e" pulse />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `string` | Success green | Dot color |
| `size` | `number` | `8` | Diameter (px) |
| `pulse` | `boolean` | `false` | Animated pulse |

### Pill / StatPill

```tsx
import { Pill, StatPill } from '@web3viz/ui';

<Pill icon="◉" bg="#1a1a2e" color="#22c55e">Launches</Pill>
<StatPill label="Volume" value="12.5K SOL" />
```

**Pill props:**

| Prop | Type | Description |
|---|---|---|
| `icon` | `ReactNode` | Left icon |
| `bg` | `string` | Background color |
| `color` | `string` | Text color |

**StatPill props:**

| Prop | Type | Description |
|---|---|---|
| `label` | `string` | Stat label |
| `value` | `string \| number` | Animated value |

### ColorControl / SwatchPicker

```tsx
import { ColorControl, SwatchPicker } from '@web3viz/ui';

<ColorControl
  label="Background"
  value="#0a0a0f"
  swatches={['#0a0a0f', '#1a1a2e', '#ffffff']}
  onChange={setColor}
/>

<SwatchPicker
  swatches={['#ff0000', '#00ff00', '#0000ff']}
  value={selected}
  onChange={setSelected}
  size={24}
/>
```

---

## Composed Components

### StatsBar

Bottom-center HUD displaying live stats with animated numbers.

```tsx
import { StatsBar } from '@web3viz/ui';

<StatsBar
  totalTokens={stats.counts.launches}
  totalVolumeSol={stats.totalVolume.solana}
  totalTrades={stats.counts.trades}
  onAddressSearch={(addr) => focusAddress(addr)}
/>
```

| Prop | Type | Description |
|---|---|---|
| `totalTokens` | `number` | Token count |
| `totalVolumeSol` | `number` | Volume in SOL |
| `totalTrades` | `number` | Trade count |
| `highlightedAddress` | `string \| null` | Currently highlighted address |
| `onAddressSearch` | `(addr: string) => void` | Search callback |
| `onDismissHighlight` | `() => void` | Clear highlight |

### LiveFeed

Right-side event stream with Framer Motion animations.

```tsx
import { LiveFeed } from '@web3viz/ui';

<LiveFeed
  events={filteredEvents}
  categoryMap={categoryLookup}
  maxVisible={12}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `events` | `DataProviderEvent[]` | — | Events to display |
| `categoryMap` | `Record<string, CategoryConfig>` | — | Category metadata lookup |
| `maxVisible` | `number` | `12` | Max visible items |

### FilterSidebar

Vertical category filter buttons.

```tsx
import { FilterSidebar } from '@web3viz/ui';

<FilterSidebar
  categories={allCategories}
  activeCategory={selected}
  onToggle={(id) => toggleCategory(id)}
  counts={stats.counts}
  position="left"
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `categories` | `CategoryConfig[]` | — | Available categories |
| `activeCategory` | `string \| null` | — | Currently selected |
| `onToggle` | `(id: string) => void` | — | Toggle callback |
| `counts` | `Record<string, number>` | — | Per-category counts |
| `position` | `'left' \| 'right'` | `'left'` | Screen side |

### SharePanel

Screenshot export and social sharing panel.

```tsx
import { SharePanel } from '@web3viz/ui';

<SharePanel
  isOpen={shareOpen}
  colors={shareColors}
  onChange={setShareColors}
  onClose={() => setShareOpen(false)}
  onDownloadWorld={() => captureCanvas()}
  onShareX={() => shareOnX(url)}
/>
```

| Prop | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Visibility |
| `colors` | `ShareColors` | Background, protocol, user colors |
| `onChange` | `(colors) => void` | Color change handler |
| `onClose` | `() => void` | Close handler |
| `onDownloadWorld` | `() => void` | Full canvas download |
| `onDownloadSnapshot` | `() => void` | Cropped snapshot download |
| `onShareX` | `() => void` | Share to X (Twitter) |
| `onShareLinkedIn` | `() => void` | Share to LinkedIn |
| `downloading` | `'world' \| 'snapshot' \| null` | Loading state |

### WorldHeader

```tsx
import { WorldHeader, ConnectionIndicator } from '@web3viz/ui';

<WorldHeader title="swarming.world" onInfoClick={() => setInfoOpen(true)} />
<ConnectionIndicator connected={true} label="PumpPortal" />
```

---

## Theme System

### ThemeProvider

Wrap your app to inject CSS custom properties:

```tsx
import { ThemeProvider, darkTheme, createTheme } from '@web3viz/ui';

// Use a preset
<ThemeProvider theme={darkTheme}>
  <App />
</ThemeProvider>

// Or create a custom theme
const custom = createTheme('my-theme', {
  '--w3v-bg': '#ffffff',
  '--w3v-text': '#111111',
  '--w3v-accent': '#ff6600',
}, darkTheme); // extend dark theme

<ThemeProvider theme={custom}>
  <App />
</ThemeProvider>
```

### useTheme

```tsx
import { useTheme } from '@web3viz/ui';

function MyComponent() {
  const { theme, getVar } = useTheme();
  const bg = getVar('--w3v-bg'); // '#0a0a0f'
}
```

### Design Tokens

| Token | Dark | Light | Description |
|---|---|---|---|
| `--w3v-bg` | `#0a0a0f` | `#ffffff` | Background |
| `--w3v-surface` | `#141420` | `#f8f8fa` | Card/panel surface |
| `--w3v-border` | `#2a2a3a` | `#e2e2e8` | Borders |
| `--w3v-text` | `#e2e2f0` | `#111118` | Primary text |
| `--w3v-text-muted` | `#8888aa` | `#666680` | Secondary text |
| `--w3v-accent` | `#a78bfa` | `#7c3aed` | Accent/brand |

### Spacing Scale

| Token | Value |
|---|---|
| `spacing[0]` | `0px` |
| `spacing[1]` | `4px` |
| `spacing[2]` | `8px` |
| `spacing[3]` | `12px` |
| `spacing[4]` | `16px` |
| `spacing[6]` | `24px` |
| `spacing[8]` | `32px` |
| `spacing[12]` | `48px` |

### Typography

- **Primary font:** IBM Plex Mono (monospace)
- **Secondary font:** Inter (sans-serif)
- **Sizes:** `2xs` (9px) through `3xl` (24px)
- **Pre-composed styles:** `textStyles.label`, `.caption`, `.body`, `.heading`, `.stat`
