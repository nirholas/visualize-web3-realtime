# Task 05: Timeline Scrubber Bar

## Context
After Tasks 01-04, we have the visualization, filters, and stats. Now we need the Giza-style timeline scrubber at the top of the screen that shows temporal data and allows playback control.

## Reference Behavior (Giza World)
- Horizontal bar across the top of the screen (full width)
- Left side: Giza logo + "World of Giza" info pill + (i) icon
- Play/pause button (dark rounded square with play/pause icon)
- Timeline track: horizontal bar with tick marks showing data density over time
- Tick marks are darker/taller where more activity occurred
- Draggable playhead/scrubber to seek to any point in time
- Hovering the timeline shows a date popup (e.g., "Fri, 2/14/2025")
- A colored progress bar fills from left to right showing current position
- When playing: auto-advances through time, new data appears progressively

## What to Build

### 1. TimelineBar Component
Create `features/World/TimelineBar.tsx`:
- Fixed at the top of the viewport, full width
- Height: ~48px
- Background: white/light with subtle bottom border

### 2. Left Section: Logo + Info
- App logo (use existing or create simple SVG)
- "PumpFun Visualizer" text pill (or your app's name)
- Info (i) icon button that opens an info popover (Task 09 handles the popover content)

### 3. Play/Pause Button
- Dark rounded square button (36x36px)
- Play icon (triangle) when paused
- Pause icon (two bars) when playing
- Toggles the WebSocket data ingestion pause state
- Also controls timeline playback for historical view

### 4. Timeline Track
- Horizontal bar taking remaining width
- Background: light gray (#e8e8e8)
- Tick marks: vertical lines of varying height based on data density at that time
  - Divide the full time range into ~100 buckets
  - Height of each tick = number of events in that bucket (normalized)
  - Color: dark gray to black based on density
- Progress indicator: colored bar from left edge to current playhead position
- Current position shown as a thin vertical line or small handle

### 5. Scrubbing Interaction
- Click anywhere on the track to jump to that time
- Click and drag to scrub through time
- During scrub, show a date popup above the cursor position
- Date format: "Mon, M/D/YYYY" (e.g., "Fri, 2/14/2025")
- On release: load data for that time position

### 6. Time-Based Data Filtering
- The timeline maps to the accumulated event history
- Scrubbing left shows only older events (hides newer nodes/edges)
- Scrubbing right reveals more events up to the current time
- "Live" mode: scrubber is at the rightmost position, new data streams in
- If user scrubs to a past position, pause live updates

### 7. Playback
- When "playing": auto-advance the scrubber from current position to end
- Playback speed: ~1 day per second (adjustable)
- At the end: loop back to start or stay at live position

### 8. Data Structure for Timeline
```typescript
interface TimelineBucket {
  timestamp: number    // Start of bucket
  eventCount: number   // Number of events in this bucket
  volume: number       // Total volume in this bucket
}
```
- Build buckets from the event history in usePumpFun
- Update buckets as new events arrive

## Files to Create/Modify
- `features/World/TimelineBar.tsx` — **NEW** timeline component
- `features/World/ForceGraph.tsx` — Accept `timeFilter: number` prop to show only events before that timestamp
- `app/world/page.tsx` — Add TimelineBar, manage playback state
- `hooks/usePumpFun.ts` — Expose event timestamps for timeline bucketing

## Acceptance Criteria
- [ ] Horizontal bar at the top with logo, info pill, play/pause, and timeline track
- [ ] Timeline shows tick marks reflecting data density over time
- [ ] Click/drag to scrub through the timeline
- [ ] Date popup appears on hover/scrub showing the timestamp
- [ ] Progress bar fills from left to current position
- [ ] Play/pause button toggles auto-advance and data streaming
- [ ] Scrubbing to a past time filters the graph to show only events up to that time
- [ ] Smooth transitions when jumping to different time positions
- [ ] "Live" mode when scrubber is at the end — new data streams in normally
