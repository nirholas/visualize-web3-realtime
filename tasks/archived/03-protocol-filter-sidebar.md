# Task 03: Protocol Filter Sidebar (Left Side)

## Context
After Tasks 01-02, we have a force-directed graph with colored protocol hubs and hover labels. Now we need the Giza-style left sidebar with protocol filter toggle buttons — each button shows a protocol icon and name, and clicking it highlights that protocol's cluster in the graph.

## Reference Behavior (Giza World)
- Vertical column of circular buttons on the left edge of the screen
- Each button has the protocol's logo icon inside a circle
- Buttons are light gray when inactive, highlighted when active (pressed state)
- Clicking a button: that protocol's hub node + agents turn the protocol's brand color, everything else dims
- Clicking the same button again: deactivates filter, returns to default view
- Only one protocol filter active at a time (or possibly multiple — match Giza behavior)
- Hovering a button shows the protocol name as a tooltip
- The buttons have `aria-pressed` for accessibility
- Buttons use `data-group` attribute matching protocol ID

## What to Build

### 1. ProtocolFilterSidebar Component
Create `features/World/ProtocolFilterSidebar.tsx`:
- Vertical flex column, fixed on the left side of the viewport
- Centered vertically
- Each button is a 40x40px circle with the token's logo/icon inside
- Buttons are spaced 8-12px apart

### 2. Button States
- **Inactive**: Light gray background (#e8e8e8), dark icon
- **Active**: Protocol's brand color background, white icon (or inverted)
- **Hover**: Slight scale-up (1.05) and shadow
- Smooth transition on all state changes (150ms)

### 3. Protocol Icons
Since we're using PumpFun tokens (not established DeFi protocols), we need to handle icons:
- Option A: Use the first 1-2 letters of the token symbol as a text icon (e.g., "MO" for a token)
- Option B: Generate simple colored circle icons with the token's assigned color
- Option C: If the token has an image URI from PumpFun data, use that
- Store icons in `public/images/` if static, or render dynamically

### 4. Filter Logic
- Maintain state: `activeProtocol: string | null`
- Pass active filter to ForceGraph component
- ForceGraph reacts by:
  - Setting the active protocol's hub + agents to brand color
  - Dimming all other nodes (opacity 0.15-0.2)
  - Dimming all non-related edges
  - Optionally zooming/centering on the active cluster

### 5. URL State Sync
- Sync active protocol filter to URL query params: `?protocols=tokenMint`
- On page load, read query params and activate matching filter
- This matches Giza's behavior: `?protocols=morpho_gauntlet_usdc_prime,moonwell`

### 6. Layout Integration
- Position absolutely on the left side, z-index above the canvas
- Don't overlap with the stats bar at the bottom
- Responsive: hide labels on small screens, show only icons

## Files to Create/Modify
- `features/World/ProtocolFilterSidebar.tsx` — **NEW** sidebar component
- `features/World/ForceGraph.tsx` — Accept `activeProtocol` prop, implement dim/highlight logic
- `app/world/page.tsx` — Add ProtocolFilterSidebar to layout, manage filter state
- `app/globals.css` — Add sidebar styles if needed (prefer Tailwind)

## Acceptance Criteria
- [ ] Vertical row of circular buttons on the left edge of the screen
- [ ] Each button represents a top token/protocol from the live data
- [ ] Clicking a button highlights that protocol's cluster (hub + agents turn brand color)
- [ ] All other nodes dim when a filter is active
- [ ] Clicking an active button deactivates the filter
- [ ] Buttons have hover tooltip showing the token name
- [ ] Filter state syncs to URL query params
- [ ] Smooth transitions between filtered/unfiltered states
- [ ] Accessible: `aria-pressed`, keyboard navigable
