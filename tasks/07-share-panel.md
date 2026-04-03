# Task 07: Share Panel with Color Customization

## Context
After Tasks 01-06, we have the full interactive visualization. Now we need the Giza-style share panel that lets users customize colors and prepare a styled snapshot for sharing.

## Reference Behavior (Giza World)
- Clicking "Share" button opens a side panel overlay
- Panel contains:
  - Header: "Edit snapshot" title + subtitle "Style your Giza world and share it on social media."
  - **World background** color control: text input for hex code + row of color swatches
  - **Protocols color** control: text input for hex code + row of color swatches
  - **User color** control: text input for hex code + row of color swatches
  - "Remix" button (randomizes all colors)
  - "Close" button
- Color changes apply immediately to the canvas preview
- Swatches are small circles, clicking one selects it (adds border/ring)
- Custom hex input overrides swatch selection
- The canvas shows the current graph with applied colors + overlay metadata:
  - Top: "Address 0x9dc5...3ee8" + Giza logo + "Active since Jan 2025"
  - Bottom: "235 Transactions" + "$25,285 VOLUME"

## What to Build

### 1. SharePanel Component
Create `features/World/SharePanel.tsx`:
- Fixed position panel on the right side (or slides in from right)
- Width: ~320px
- Background: white, slight shadow on left edge
- Closes on "Close" button click or clicking outside

### 2. Color Controls
Each color control has:
- **Label**: uppercase text (e.g., "World background")
- **Hex Input**: text field, placeholder "Enter a custom HEX code"
  - Validates input as valid hex color
  - Applies on blur or Enter key
- **Swatch Row**: 8 small colored circles (24x24px)
  - Pre-defined palette per control:
    - Background: #ffffff, #3a3a3a, #768bea, #84bbdc, #87c47d, #d18949, #cc6b57, #7e61ee
    - Protocol: #ffffff, #d2d2d2, #7b8eea, #86bcdc, #89c57f, #d18b4e, #ce715f, #8165ee
    - User: same as protocol swatches
  - Selected swatch has a ring/border indicator
  - Clicking a swatch applies its color immediately

### 3. Color State Management
```typescript
interface ShareColors {
  background: string   // Canvas/scene background
  protocol: string     // Protocol hub node color override
  user: string         // User/highlighted node color override
}
```
- Store in React state, pass to ForceGraph
- ForceGraph applies:
  - `background` → scene.background / Canvas background
  - `protocol` → all protocol hub node materials
  - `user` → highlighted user node material
- Changes are live-previewed instantly

### 4. Remix Button
- On click: randomize all three colors from a curated palette
- Use pleasing random combinations (not fully random — pick from extended palettes)
- Apply with a quick transition (200ms)

### 5. Snapshot Overlay
When share panel is open, overlay metadata on the canvas:
- **Top bar**: Address (truncated) + app logo + "Active since [date]"
- **Bottom bar**: Transaction count + Volume
- These overlays are part of the screenshot/export (Task 08)
- Styled: dark semi-transparent background, white text, IBM Plex Mono

### 6. Share Trigger Button
- Position: bottom-right area of the screen (next to "Start journey")
- Style: light gray rounded pill, text "Share"
- On click: opens the SharePanel
- When panel is open: button state changes (or hides)

## Files to Create/Modify
- `features/World/SharePanel.tsx` — **NEW** color customization panel
- `features/World/ShareOverlay.tsx` — **NEW** metadata overlay on canvas
- `features/World/ForceGraph.tsx` — Accept color override props, apply to materials
- `app/world/page.tsx` — Add SharePanel, manage share state and colors

## Acceptance Criteria
- [ ] "Share" button in bottom-right opens the share panel
- [ ] Panel slides in with "Edit snapshot" header
- [ ] Three color controls: background, protocol, user — each with hex input + swatches
- [ ] Clicking a swatch immediately changes the corresponding color in the visualization
- [ ] Typing a valid hex code applies the color on Enter/blur
- [ ] Selected swatch has a visual indicator (ring)
- [ ] "Remix" button randomizes all three colors from a curated palette
- [ ] "Close" button closes the panel
- [ ] Metadata overlay appears on the canvas when share panel is open
- [ ] Color changes are smooth/instant with no flicker
