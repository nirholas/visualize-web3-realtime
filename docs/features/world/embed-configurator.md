# EmbedConfigurator

## File Path
`features/World/EmbedConfigurator.tsx`

## Purpose
Provides a full-screen modal dialog that allows users to configure and generate embeddable widget code snippets (HTML iframe, JavaScript script tag, or React component) for the PumpFun visualization. Users can customize the widget's size, background color, and title, then copy the generated code to their clipboard.

---

## Module Dependencies

| Import | Source | Description |
|--------|--------|-------------|
| `memo` | `react` | Higher-order component for memoizing functional components to prevent unnecessary re-renders. |
| `useCallback` | `react` | Hook that returns a memoized callback function, preventing recreation on every render. |
| `useEffect` | `react` | Hook for performing side effects such as resolving the browser origin URL on mount. |
| `useMemo` | `react` | Hook that memoizes computed values, used to derive the code snippet from config state. |
| `useRef` | `react` | Hook that creates a mutable ref object, used to reference the `<pre>` element for text selection fallback. |
| `useState` | `react` | Hook for managing local component state (config, snippet type, copied status, base URL). |

---

## Exported Members

| Export | Type | Description |
|--------|------|-------------|
| `EmbedConfig` | `interface` | Named export. Defines the shape of the embed configuration object with fields `bg`, `width`, `height`, and `title`. |
| `default` (EmbedConfigurator) | `React.FC` | Default export. The main modal component for configuring embed widgets. |

---

## Types and Interfaces

### `EmbedConfig` (exported)
```typescript
export interface EmbedConfig {
  bg: string;       // Background color as a hex string (e.g., '#ffffff')
  width: number;    // Widget width in pixels (0 = 100% / full width)
  height: number;   // Widget height in pixels
  title: string;    // Widget title attribute for the iframe
}
```

### `EmbedConfiguratorProps` (internal)
```typescript
interface EmbedConfiguratorProps {
  onClose: () => void;  // Callback invoked when the modal should close
}
```

### `SnippetType` (internal)
```typescript
type SnippetType = 'iframe' | 'script' | 'react';
```
Union type representing the three available code generation formats.

---

## Constants

### `HEX_RE`
- **Type:** `RegExp`
- **Value:** `/^#([0-9a-f]{3}|[0-9a-f]{6})$/i`
- **Purpose:** Regular expression that validates 3-digit and 6-digit hex color codes with a leading `#`.

### `SIZE_PRESETS`
- **Type:** `readonly { label: string; width: number; height: number }[]`
- **Value:** Four preset sizes: Small (400x300), Medium (600x400), Large (800x500), Full Width (0x450 where 0 means 100%).
- **Purpose:** Quick-select buttons for common widget dimensions.

### `BG_SWATCHES`
- **Type:** `string[]`
- **Value:** `['#ffffff', '#08080f', '#1a1a2e', '#3a3a3a', '#fdf6e3', '#282a36']`
- **Purpose:** Predefined background color options displayed as clickable swatches.

---

## Helper Functions

### `isValidHex(v: string): boolean`
- **Line 26-28**
- Validates whether a string is a valid 3- or 6-digit hex color.
- Prepends `#` if not present before testing against `HEX_RE`.

### `normalizeHex(v: string): string`
- **Line 30-37**
- Normalizes a hex color string to lowercase 6-digit format.
- Expands shorthand notation (e.g., `#abc` becomes `#aabbcc`).
- Returns empty string if input is invalid.

### `buildEmbedUrl(config: EmbedConfig): string`
- **Line 52-58**
- Constructs the embed URL path with query parameters.
- Only includes `bg` param if not the default (`#ffffff`).
- Only includes `title` param if not the default (`PumpFun . Live`).
- Returns a relative URL path starting with `/embed`.

### `generateIframeSnippet(config: EmbedConfig, baseUrl: string): string`
- **Line 64-69**
- Generates a multi-line HTML `<iframe>` embed snippet.
- Sets `width` to pixel value or `"100%"` when `config.width` is 0.
- Includes `frameborder="0"`, `allow="accelerometer; autoplay"`, and inline border-radius styling.

### `generateScriptSnippet(config: EmbedConfig, baseUrl: string): string`
- **Line 71-75**
- Generates a `<div>` container with a `<script>` tag that programmatically creates and appends an iframe.
- Uses an IIFE pattern for encapsulation.

### `generateReactSnippet(config: EmbedConfig, baseUrl: string): string`
- **Line 77-81**
- Generates a React functional component (`PumpFunWidget`) that renders an `<iframe>`.
- Uses JSX-style props (`frameBorder`, `style` object).

---

## Sub-Components

### `SwatchRow`
- **Line 87-111**
- **Props:** `{ swatches: string[]; value: string; onChange: (hex: string) => void }`
- Renders a horizontal row of circular color swatch buttons.
- The currently selected swatch gets a blue border (`#3d63ff`); others get a light gray border.
- Each button triggers `onChange` with the swatch's hex value on click.
- Wrapped in `memo` for performance.
- `displayName` set to `'SwatchRow'`.

### `HexInput`
- **Line 113-144**
- **Props:** `{ value: string; onChange: (hex: string) => void }`
- A controlled text input for manually entering hex color codes.
- **State:** `input` (local string reflecting the text field value).
- **Effects:** Syncs local `input` state when the external `value` prop changes.
- **`commit` callback:** Normalizes the input; if valid, calls `onChange`; if invalid, reverts to the current `value`.
- Commits on blur and on Enter key press.
- Styled with IBM Plex Mono monospace font, 11px font size.
- Wrapped in `memo` for performance.
- `displayName` set to `'HexInput'`.

---

## Main Component: `EmbedConfigurator`

### State Management

| State Variable | Type | Initial Value | Purpose |
|----------------|------|---------------|---------|
| `config` | `EmbedConfig` | `{ bg: '#ffffff', height: 400, title: 'PumpFun . Live', width: 600 }` | Stores the current embed configuration. |
| `snippetType` | `SnippetType` | `'iframe'` | Tracks which code format tab is active. |
| `copied` | `boolean` | `false` | Indicates whether the copy-to-clipboard action succeeded (shows checkmark for 2 seconds). |
| `baseUrl` | `string` | `''` | The browser's origin URL, resolved on the client side. |

### Refs

| Ref | Type | Purpose |
|-----|------|---------|
| `codeRef` | `React.RefObject<HTMLPreElement>` | References the `<pre>` element containing the generated snippet for text selection fallback. |

### Side Effects

1. **Origin resolution** (Line 165-167): On mount, reads `window.location.origin` and sets `baseUrl`. This runs client-side only (`'use client'` directive) since `window` is not available during SSR.

### Callbacks

- **`update`** (Line 169-172): Merges a partial `EmbedConfig` into the current config state. Memoized with no dependencies (stable reference).
- **`snippet`** (Line 174-184): Memoized computed value that generates the appropriate code snippet based on `config`, `snippetType`, and `baseUrl`. Returns empty string if `baseUrl` is not yet resolved.
- **`handleCopy`** (Line 186-201): Attempts to copy the snippet to clipboard via `navigator.clipboard.writeText`. On success, sets `copied` to `true` for 2 seconds. On failure, falls back to selecting the text content of the `<pre>` element using `document.createRange()` and `window.getSelection()`.

### JSX Structure

1. **Backdrop overlay** (Line 206-220): Fixed full-screen semi-transparent backdrop with blur effect. Clicking the backdrop (but not its children) triggers `onClose`.

2. **Modal container** (Line 221-239): Centered white card with rounded corners, max width 860px, max height 90vh, IBM Plex Mono font family.

3. **Header** (Line 241-269): Flex row with "Embed Widget" title and close button (x symbol).

4. **Content area** (Line 271-462): Two-column layout:
   - **Left column (Controls)** (Line 273-365): Width 320px, contains:
     - Size preset buttons (Small, Medium, Large, Full Width)
     - Manual width/height number inputs (min 200)
     - Background color swatch row + hex input
     - Widget title text input
   - **Right column (Preview + Code)** (Line 368-461): Flexible width, contains:
     - Live iframe preview (capped at 300px height)
     - Snippet type tab buttons (HTML, Script, React) with segmented button styling
     - Code block (`<pre>`) with dark background (#1a1a1a) and copy button

---

## Shared Styles

### `labelStyle`
- **Type:** `React.CSSProperties`
- **Line 475-482**
- Applied to all section labels. Gray (#999), uppercase, 9px font size, 0.08em letter spacing.

### `numInputStyle`
- **Type:** `React.CSSProperties`
- **Line 484-493**
- Applied to width/height number inputs. Light background (#f5f5f5), 60px wide, IBM Plex Mono font.

---

## Usage Example

```tsx
import EmbedConfigurator from '@/features/World/EmbedConfigurator';

function ParentComponent() {
  const [showEmbed, setShowEmbed] = useState(false);

  return (
    <>
      <button onClick={() => setShowEmbed(true)}>Embed</button>
      {showEmbed && <EmbedConfigurator onClose={() => setShowEmbed(false)} />}
    </>
  );
}
```
