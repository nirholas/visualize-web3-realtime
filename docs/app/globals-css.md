# app/globals.css

## File Path

`/workspaces/visualize-web3-realtime/app/globals.css`

## Purpose

Global stylesheet for the application. Configures Tailwind CSS layers, sets base typography and layout defaults, defines keyframe animations, and provides responsive breakpoint rules for the sidebar, stats bar, live feed, and share panel.

## Module Dependencies

This is a CSS file. It relies on the Tailwind CSS PostCSS plugin being configured in the project build pipeline.

## Line-by-Line Documentation

### Lines 1-3 -- Tailwind Directives

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Standard Tailwind CSS directives that inject the framework's base reset styles, component classes, and utility classes into the stylesheet at build time.

### Lines 5-29 -- Base Layer

```css
@layer base { ... }
```

Overrides placed inside Tailwind's `base` layer so they have the correct specificity.

#### `:root` (Line 7-8)

```css
:root {
  font-family: 'IBM Plex Mono', monospace;
}
```

Sets the default font family for the entire document to IBM Plex Mono with a monospace fallback.

#### `html, body` (Lines 10-15)

```css
html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  color-scheme: light;
}
```

- `width: 100%; height: 100%` -- Forces full viewport coverage.
- `overflow: hidden` -- Prevents scrollbars; the app uses a fixed viewport with internal scroll regions.
- `color-scheme: light` -- Tells the browser to use light-mode form controls and scrollbar styling.

#### `body` (Lines 17-22)

```css
body {
  background-color: #cccccc;
  color: #1a1a1a;
  font-family: 'IBM Plex Mono', monospace;
  -webkit-font-smoothing: antialiased;
}
```

- `background-color: #cccccc` -- Medium gray default background (overridden per-page).
- `color: #1a1a1a` -- Near-black default text color.
- `-webkit-font-smoothing: antialiased` -- Enables sub-pixel anti-aliasing on WebKit browsers for crisper text.

#### Universal Reset `*` (Lines 24-28)

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

Resets margin and padding on all elements and switches to `border-box` sizing model.

### Lines 31-44 -- Keyframe Animations

#### `spin` (Lines 32-34)

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

Full 360-degree rotation. Used for loading spinners.

#### `fadeOut` (Lines 36-39)

```css
@keyframes fadeOut {
  from { opacity: 1; }
  to   { opacity: 0; pointer-events: none; }
}
```

Fades an element to invisible and disables pointer events. Used for dismissing the loading screen.

#### `pulse` (Lines 41-44)

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
```

Pulsing opacity effect between full and 40% opacity. Used for "breathing" UI indicators.

### Lines 46-53 -- Transitions

```css
button, a, input {
  transition: all 150ms ease;
}

button:hover {
  cursor: pointer;
}
```

Applies a 150ms ease transition to all interactive elements for smooth hover/focus effects. Ensures buttons always show a pointer cursor on hover.

### Lines 55-63 -- Cursor States

```css
canvas {
  cursor: grab;
}

canvas:active {
  cursor: grabbing;
}
```

Sets the cursor for `<canvas>` elements (the 3D force graph) to a grab hand, switching to a closed-hand grabbing cursor while the user is actively dragging.

### Lines 65-77 -- Responsive Breakpoint: max-width 1200px

```css
@media (max-width: 1200px) {
  .sidebar-label { display: none; }
  .stats-bar { flex-wrap: wrap; }
  .share-panel {
    width: 100% !important;
    bottom: 0 !important;
    top: auto !important;
    height: auto !important;
    max-height: 60vh !important;
    border-left: none !important;
    border-top: 1px solid #e0e0e0 !important;
  }
}
```

- Hides sidebar text labels, keeping only icons.
- Allows the stats bar to wrap onto multiple lines.
- Repositions the share panel from a side drawer to a bottom sheet, capped at 60% viewport height.

### Lines 79-84 -- Responsive Breakpoint: max-width 768px

```css
@media (max-width: 768px) {
  .sidebar-desktop { display: none !important; }
  .stats-bar > :nth-child(n+3):not(.search-pill) { display: none; }
  .timeline-ticks { display: none; }
  .live-feed { display: none; }
}
```

Mobile breakpoint:
- Hides the desktop sidebar entirely.
- Shows only the first two stat items in the stats bar (plus search).
- Hides timeline tick marks and the live event feed.

### Lines 86-89 -- slideInRight Keyframe

```css
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
```

Slides an element in from the right edge. Used for panel entrance animations (e.g., share panel, task inspector).

## Exported Members

None. CSS files do not have JavaScript exports. Styles are applied globally via the side-effect import in `app/layout.tsx`.

## Usage Examples

Imported in the root layout:

```ts
// app/layout.tsx
import "./globals.css";
```

CSS classes referenced throughout the application:
- `.sidebar-label` -- Text labels in the sidebar navigation.
- `.stats-bar` -- Bottom statistics bar container.
- `.share-panel` -- Share/download panel.
- `.sidebar-desktop` -- Desktop-only sidebar wrapper.
- `.search-pill` -- Search input in the stats bar.
- `.timeline-ticks` -- Tick marks on the timeline scrubber.
- `.live-feed` -- Live event feed panel.
