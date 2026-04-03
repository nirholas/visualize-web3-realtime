# Task 10: Light Theme, Typography & Final Polish

## Context
This is the final polish pass. All features are built. Now we need to ensure the visual quality matches the Giza World reference: clean white default theme, IBM Plex Mono typography everywhere, consistent spacing, smooth animations, and responsive behavior.

## Reference Behavior (Giza World)
- Default background: white (#ffffff)
- All UI text: IBM Plex Mono (monospace), uppercase where labels, mixed case for body
- Font weights: 200-600 range used contextually
- Clean, minimal chrome — UI elements float over the canvas
- Smooth transitions on all interactive elements
- Responsive: works on mobile (simplified layout)
- Professional, almost "Bloomberg terminal meets generative art" aesthetic

## What to Build

### 1. Default Light Theme
- Canvas/scene background: `#ffffff` (white)
- Node colors: `#161616` (near-black) for protocol hubs, `#4a4a4a` for agents
- Edge colors: `#c0c0c0` at opacity 0.3-0.5
- Remove all dark mode assumptions from CSS
- Update `app/layout.tsx`: remove `className="dark"` from html tag
- Update `app/globals.css`: set body background to `#cccccc` (Giza uses this as fallback)
- Update Tailwind config if dark mode classes are used

### 2. Typography Audit
- Ensure `IBM Plex Mono` is loaded (already in Google Fonts link)
- Set as the root font: `:root { font-family: "IBM Plex Mono", monospace; }`
- Apply consistently across ALL components:
  - Stats bar labels: 10px, uppercase, letter-spacing 0.08em, font-weight 400, color #666
  - Stats bar values: 14px, font-weight 500, color #161616
  - Timeline date popup: 12px, font-weight 400
  - Protocol filter labels: 10px, uppercase
  - Node hover labels: 11px, uppercase, letter-spacing 0.08em
  - Share panel labels: 11px, uppercase
  - Info popover body: 14px, font-weight 300, line-height 1.6
  - Journey overlay: 24-32px, font-weight 200

### 3. Reset & Base Styles
Update `app/globals.css`:
```css
:root {
  font-family: "IBM Plex Mono", monospace;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

* {
  margin: 0;
  padding: 0;
}
```

### 4. UI Element Polish
Go through each component and ensure:

**StatsBar:**
- White pill backgrounds with subtle `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- Clean borders: `1px solid #e8e8e8` or no border
- Consistent padding: 8px 16px
- Gap between pills: 8-12px

**TimelineBar:**
- White background, subtle bottom shadow
- Play button: dark (#2a2a2a) rounded square, crisp icon
- Timeline ticks: vary from #d0d0d0 (sparse) to #161616 (dense)

**Protocol Sidebar:**
- Buttons: white/light background with subtle border
- Active: colored background with white icon
- Hover: slight lift shadow

**Share Panel:**
- Clean white background
- Input fields: light gray border, focused state with blue outline
- Swatches: 24px circles, selected has 2px offset ring

**Hover Labels & Markers:**
- Background: #1a1a1a, color: white
- Border-radius: 20px (pill shape)
- Padding: 4px 12px
- Arrow: 6px CSS triangle

### 5. Animation Polish
- All hover transitions: 150ms ease
- Color changes: 200ms ease
- Panel open/close: 250ms ease-out (slide)
- Camera movements: 500ms with ease-in-out
- Number counters: 300ms ease-out
- Node entrance: 400ms scale from 0 → 1 with spring easing

### 6. Responsive Design
- **Desktop (>1200px)**: Full layout as designed
- **Tablet (768-1200px)**: 
  - Protocol sidebar shows icons only (no labels)
  - Stats bar wraps to 2 rows if needed
  - Share panel becomes full-width bottom sheet
- **Mobile (<768px)**:
  - Protocol sidebar hidden (accessible via hamburger menu)
  - Stats bar shows 2 stats + address search
  - Timeline simplified (no tick marks, just play/pause + progress)
  - Touch gestures for pan/zoom

### 7. Loading State
Create a clean loading screen matching Giza:
- Centered spinner (simple CSS border animation)
- "LOADING" text below spinner
- IBM Plex Mono, uppercase, letter-spacing 0.08em
- Fades out when canvas is ready (opacity transition 180ms)

### 8. Error Handling
- WebSocket disconnect: show subtle red dot indicator
- No data: show "Waiting for data..." message centered
- Canvas error (WebGL not supported): show fallback message

### 9. Cursor States
- Default: `cursor: default`
- Over interactive nodes: `cursor: pointer`
- Panning: `cursor: grab` → `cursor: grabbing`
- Over UI buttons: `cursor: pointer`

### 10. Final Cleanup
- Remove any unused imports, components, or dependencies
- Remove `features/X402Flow/` if fully replaced
- Ensure `package.json` only has needed dependencies
- Test build: `npm run build` should succeed with no errors
- Lighthouse: aim for 90+ performance score

## Files to Modify
- `app/globals.css` — Full style reset and base styles
- `app/layout.tsx` — Remove dark mode, ensure font links
- `tailwind.config.ts` — Update theme if needed
- ALL component files — Typography, color, spacing audit
- `features/World/LoadingScreen.tsx` — **NEW** loading spinner
- `app/world/page.tsx` — Add loading state

## Acceptance Criteria
- [ ] Default background is white, all UI is light-themed
- [ ] IBM Plex Mono is the only font, used consistently
- [ ] All interactive elements have smooth hover/active transitions
- [ ] Stats bar, timeline, sidebar, share panel all have polished consistent styling
- [ ] Loading screen shows spinner + "LOADING" text on initial load
- [ ] Responsive: usable on tablet and mobile
- [ ] No visual glitches, z-index issues, or overlapping elements
- [ ] WebGL fallback message if Three.js fails to initialize
- [ ] `npm run build` succeeds with no errors
- [ ] Visual quality matches the Giza World reference screenshots
