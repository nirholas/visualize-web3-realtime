# Task 09: Info Popover & "Start Journey" Guided Tour

## Context
After Tasks 01-08, the visualization is feature-complete. Now we add the info popover (explains what the visualization is) and "Start journey" button (guided onboarding animation).

## Reference Behavior (Giza World)
### Info Popover
- Clicking the (i) icon next to "World of Giza" opens a popover
- Popover content explains the visualization in 2-3 paragraphs
- Styled as a floating card with light background and body text
- Closes on click outside or pressing Escape
- Has `role="dialog"` and `aria-hidden` for accessibility

### Start Journey
- "Start journey" is a large dark circle button in the bottom-right
- Clicking it starts an automated guided tour:
  1. Camera zooms out to show the full network
  2. Text overlays explain what you're seeing
  3. Camera pans to a protocol cluster, label appears
  4. Camera pans to another cluster
  5. If user has an address, camera moves to their node with "YOU ARE HERE"
  6. Tour ends, user has full control

## What to Build

### 1. InfoPopover Component
Create `features/World/InfoPopover.tsx`:
- Triggered by clicking the (i) button in TimelineBar
- Positioned below the button (or centered on mobile)
- Content (customize for your project):
  ```
  This is a live visualization of every token and trade on PumpFun — 
  a real-time map of Solana's most active token launch platform.
  
  Each point represents a wallet actively trading tokens. Larger nodes 
  represent the most popular tokens by volume. Lines show the connections 
  between traders and the tokens they trade.
  
  Everything you see is backed by real on-chain data streaming in 
  via WebSocket. Watch the network grow in real time.
  ```
- Styling: white background, 16px body text, max-width 400px, subtle shadow
- Close on outside click, Escape key, or close button

### 2. InfoPopover Accessibility
- `role="dialog"`, `aria-modal="true"`
- Focus trap while open
- `aria-expanded` on trigger button
- `aria-controls` linking button to popover

### 3. StartJourney Component
Create `features/World/StartJourney.tsx`:
- Large circular dark button (60-70px diameter) in bottom-right
- Text: "Start journey" in two lines, white text, small font
- On click: initiates the guided tour sequence

### 4. Journey Sequence Engine
Create `features/World/useJourney.ts` hook:
```typescript
interface JourneyStep {
  target: 'overview' | 'protocol' | 'user' | 'cluster'
  protocolId?: string
  camera: { position: [number, number, number], zoom: number }
  label?: string
  description?: string
  duration: number  // ms to hold on this step
}
```
- Define a sequence of 5-7 steps
- Each step: animate camera to target, show text overlay, wait, move to next
- Steps:
  1. **Overview**: Zoom out, show "Welcome to PumpFun World" overlay
  2. **Network**: Pan slightly, "X tokens, Y traders, Z transactions"
  3. **Top Token**: Zoom to largest protocol hub, show its name + stats
  4. **Second Token**: Pan to another hub
  5. **Connections**: Highlight spoke lines, "Each line is a real trade"
  6. **User** (if address set): Pan to user node, "YOU ARE HERE"
  7. **Return**: Zoom back to comfortable default view, "Explore freely"
- Overlay text: centered, large white text on semi-transparent dark backdrop

### 5. Journey Controls
- During journey: show "Skip" button to exit early
- Journey auto-pauses WebSocket updates (or keeps them running for dynamism)
- After journey ends: restore normal controls, hide overlay
- Journey button changes to "Restart journey" after completion (or stays "Start journey")

### 6. Text Overlay During Journey
- Full-screen semi-transparent overlay (rgba(0,0,0,0.3))
- Centered text: large, white, IBM Plex Mono
- Fade in/out between steps (300ms transitions)
- Don't block the visualization — text should be readable but graph visible behind

## Files to Create/Modify
- `features/World/InfoPopover.tsx` — **NEW** info dialog
- `features/World/StartJourney.tsx` — **NEW** journey button
- `features/World/useJourney.ts` — **NEW** journey sequence hook
- `features/World/JourneyOverlay.tsx` — **NEW** text overlay during tour
- `features/World/TimelineBar.tsx` — Wire up (i) button to InfoPopover
- `features/World/ForceGraph.tsx` — Expose camera control API for journey
- `app/world/page.tsx` — Add StartJourney button and journey state

## Acceptance Criteria
- [ ] (i) button opens an info popover explaining the visualization
- [ ] Popover closes on outside click and Escape key
- [ ] Popover is accessible (role=dialog, focus trap, aria attributes)
- [ ] "Start journey" button in bottom-right starts a guided camera tour
- [ ] Tour has 5-7 steps with camera animations and text overlays
- [ ] Text fades in/out between journey steps
- [ ] "Skip" button available to exit the tour early
- [ ] Tour visits protocol hubs, shows labels, and (if address set) finds the user's node
- [ ] After tour: normal controls restored
