# Task 04: Bottom Stats Bar & Address Search

## Context
After Tasks 01-03, we have the core visualization with protocol filters. Now we need to build the Giza-style bottom stats bar that shows live metrics and an address search input.

## Reference Behavior (Giza World)
- Horizontal bar at the bottom of the screen
- Contains stat pills: "Total Agents | 18,211", "Volume | $4,114,197,239", "Transactions | 815,910"
- Each stat is in a white/light rounded pill with label + value
- Address search field: label "Address", input placeholder "0x...", "Go" button
- All text is uppercase monospace (IBM Plex Mono)
- Stats update in real-time with number animations (counting up)
- The bar sits above the canvas, not overlapping important content

## What to Build

### 1. StatsBar Component
Create `features/World/StatsBar.tsx`:
- Horizontal flex row, fixed at the bottom of the viewport
- Left-aligned stat pills, address search on the right side
- Background: semi-transparent or solid white pills on transparent bar

### 2. Stat Pills
Each stat is a rounded pill containing:
- **Label**: Uppercase, smaller font, light gray color (e.g., "Total Agents")
- **Value**: Larger font, dark/black, formatted with commas (e.g., "18,211")
- Stats to show:
  - **Total Tokens**: Count of unique tokens seen (`stats.totalTokens`)
  - **Volume**: Total SOL volume with symbol (`stats.totalVolume` formatted as currency)
  - **Transactions**: Total trade count (`stats.totalTrades`)
- Values animate when they change (count-up effect using `requestAnimationFrame` or CSS)

### 3. Address Search
- Label: "Address" in uppercase
- Input: text field, placeholder "0x..." (or for Solana: just "Address...")
- "Go" button: dark/black rounded button
- On submit:
  - Search for the address among known agent nodes
  - If found: pan camera to center on that node, show "YOU ARE HERE" marker
  - If not found: subtle error state (red border flash)
  - Update URL with `?address=...` query param

### 4. Number Formatting
```typescript
function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(0)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`
  return n.toLocaleString()
}
```

### 5. Animated Counter
- When stat values change, animate from old value to new value over 300-500ms
- Use easing (ease-out) for natural feel
- Don't animate on initial load — just show the number

### 6. Styling
- Font: IBM Plex Mono (already loaded via Google Fonts in layout)
- Pill background: white with subtle border or shadow
- Border-radius: 8px on pills
- Padding: 8px 16px per pill
- Gap between pills: 12px
- Bottom margin: 16-24px from screen edge

## Files to Create/Modify
- `features/World/StatsBar.tsx` — **NEW** bottom stats bar component
- `app/world/page.tsx` — Add StatsBar to layout, pass stats data
- `app/globals.css` — Add any needed base styles
- `hooks/usePumpFun.ts` — Ensure stats are exposed properly (already done)

## Acceptance Criteria
- [ ] Horizontal stats bar at the bottom of the screen
- [ ] Shows Total Tokens, Volume (SOL), and Transactions with live values
- [ ] Numbers are comma-formatted and animate on change
- [ ] Address search input with "Go" button
- [ ] Searching an address pans the camera to that node (if found)
- [ ] All text is uppercase IBM Plex Mono
- [ ] White pill styling with clean typography
- [ ] Responsive: pills stack or shrink on small screens
- [ ] Address search syncs to URL query params
