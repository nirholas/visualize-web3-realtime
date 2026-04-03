# Task 06: "YOU ARE HERE" Marker & Address Highlighting

## Context
After Tasks 01-05, we have the full visualization with timeline and stats. Now we need the "YOU ARE HERE" marker that appears when a user searches for their wallet address, highlighting their position in the network.

## Reference Behavior (Giza World)
- When a user enters their address and clicks "Go", the graph:
  1. Pans/zooms to center on their agent node
  2. Shows a floating "YOU ARE HERE" label above their node
  3. Their node is highlighted in a distinct color (blue by default)
  4. Connection lines from their node to protocol hubs are highlighted
- The "YOU ARE HERE" label is a dark rounded pill with white uppercase text
- Below the pill is a small downward arrow/caret pointing to the node
- The label follows the node position as the graph layout shifts
- The address appears in the bottom stats bar
- Share overlay shows "Address 0x9dc5...3ee8" with truncated address

## What to Build

### 1. YouAreHereMarker Component
Create `features/World/YouAreHereMarker.tsx`:
- Uses `@react-three/drei` `<Html>` component to render HTML at a 3D position
- Dark pill background (#1a1a1a), white text, rounded corners (20px)
- Text: "YOU ARE HERE" in uppercase IBM Plex Mono, ~11px, letter-spacing 0.08em
- Small triangular arrow below the pill pointing down
- The component tracks a target node's position and updates every frame

### 2. Address Search Integration
Update the address search (from Task 04) to:
- On valid address submit:
  - Search through all known agent nodes for a matching address
  - If found:
    - Set `highlightedAddress` state
    - Animate camera pan to center on that node (smooth 500ms transition)
    - Zoom in slightly to show the node in context of its cluster
    - Show the YouAreHereMarker at that node's position
    - Change node color to user highlight color (blue #3d63ff by default)
    - Highlight edges from that node with a brighter/thicker line
  - If not found:
    - Show a subtle toast/flash: "Address not found in current data"
    - Could also create a temporary node at a random position

### 3. Node Highlight Effect
- The highlighted user node should:
  - Be larger than normal agent nodes (2-3x radius)
  - Pulse gently (scale oscillation, 0.95 - 1.05 over 2s)
  - Have a distinct color (user color, default blue)
  - Have slightly thicker/brighter connection lines

### 4. Camera Animation
- When highlighting an address, smoothly animate:
  - Camera position to center on the node
  - Zoom level to show the node's local cluster
- Use lerp/spring animation (not instant jump)
- After animation completes, user can still pan/zoom normally
- Store the pre-search camera position to allow "reset" back

### 5. Address Truncation Utility
```typescript
function truncateAddress(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
```

### 6. URL State
- When an address is searched: update URL to `?address=<full_address>`
- On page load with `?address=` param: auto-search and highlight that address
- Clear address param when marker is dismissed

### 7. Dismiss Behavior
- Clicking elsewhere on the graph (not the highlighted node) dismisses the marker
- Or: add a small "x" button on the marker pill
- On dismiss: remove highlight, return node to normal color, keep camera position

## Files to Create/Modify
- `features/World/YouAreHereMarker.tsx` — **NEW** floating marker component
- `features/World/ForceGraph.tsx` — Add highlighted node logic, camera animation
- `features/World/StatsBar.tsx` — Update address search to trigger highlighting
- `app/world/page.tsx` — Manage `highlightedAddress` state, pass to components

## Acceptance Criteria
- [ ] Searching a valid address shows "YOU ARE HERE" dark pill label above the node
- [ ] Label has a downward arrow/caret pointing to the node
- [ ] Camera smoothly pans and zooms to center on the searched node
- [ ] Highlighted node is a distinct color (blue) and slightly larger
- [ ] Connection lines from the highlighted node are emphasized
- [ ] Marker follows the node position as the graph layout shifts
- [ ] Address is shown in the stats bar input field
- [ ] URL updates with the searched address
- [ ] Marker can be dismissed, returning to normal view
- [ ] Searching a non-existent address shows an appropriate error message
