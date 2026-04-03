# AgentLiveFeed.tsx

## File Path
`/workspaces/visualize-web3-realtime/features/Agents/AgentLiveFeed.tsx`

## Purpose
Real-time scrolling event feed panel displaying agent activity. Positioned as an absolute overlay on the right side of the visualization, it shows the most recent 50 agent events (tool calls, task lifecycle, spawns, reasoning updates) with auto-scroll behavior, new-event highlighting, and click-to-select-agent interaction. Supports dark and light color schemes via theme tokens.

---

## Module Dependencies (Imports Breakdown)

### Line 1 - Client Directive
```ts
'use client';
```
Next.js client-side component directive.

### Line 3 - React Hooks
```ts
import { memo, useCallback, useEffect, useRef, useState } from 'react';
```
- `memo` - Memoizes both `EventRow` and `AgentLiveFeed` components.
- `useCallback` - Memoizes the scroll handler to prevent unnecessary re-renders.
- `useEffect` - Tracks new events and manages auto-scroll.
- `useRef` - References the scroll container div and previous event ID set.
- `useState` - Manages auto-scroll toggle and the set of newly arrived event IDs.

### Line 4 - Core Types
```ts
import type { AgentEvent, AgentIdentity } from '@web3viz/core';
```
- `AgentEvent` - Event data model with `eventId`, `agentId`, `type`, `timestamp`, `taskId`, and `payload`.
- `AgentIdentity` - Agent metadata with `agentId`, `name`, and `role`.

### Line 5 - Theme Tokens
```ts
import { agentThemeTokens } from '@/packages/ui/src/tokens/agent-colors';
```
`agentThemeTokens` - Provides color tokens keyed by `'dark' | 'light'` for consistent theming. Used tokens: `sidebar`, `edge`, `muted`, `taskComplete`, `agentHubActive`, `text`.

---

## Helper Functions

### timeAgo (Lines 11-17)
```ts
function timeAgo(ts: number): string
```
Converts a timestamp to a human-readable relative time string.
- < 5 seconds: `"just now"`
- < 60 seconds: `"{secs}s ago"`
- >= 60 seconds: `"{mins}m ago"`

### getEventIcon (Lines 20-28)
```ts
function getEventIcon(type: string): string
```
Maps event type prefixes to Unicode icon characters.

| Event Type Prefix | Icon | Meaning |
|---|---|---|
| `tool:` | `'lightning'` | Tool invocation |
| `task:started` | `'play'` | Task started |
| `task:completed` | `'check'` | Task completed |
| `task:failed` | `'cross'` | Task failed |
| `agent:spawn` / `subagent:spawn` | `'hexagon'` | Agent spawned |
| `reasoning:` | `'target'` | Reasoning update |
| (default) | `'dot'` | Unknown event |

### getEventColor (Lines 30-38)
```ts
function getEventColor(type: string): string
```
Maps event type prefixes to hex colors.

| Event Type Prefix | Color | Hex |
|---|---|---|
| `tool:` | Blue | `#60a5fa` |
| `task:completed` | Green | `#34d399` |
| `task:failed` | Red | `#f87171` |
| `task:` | Purple | `#a78bfa` |
| `agent:` / `subagent:` | Light purple | `#c084fc` |
| `reasoning:` | Amber | `#fbbf24` |
| (default) | Gray | `#6b7280` |

### getEventLabel (Lines 40-62)
```ts
function getEventLabel(event: AgentEvent, agentName: string): { title: string; sub: string }
```
Generates display text for an event row. Returns a `title` (agent name) and `sub` (description) string.

| Event Type | Sub Text |
|---|---|
| `agent:spawn` | `"spawned . role: {role}"` |
| `task:started` | Task description (truncated to 36 chars) |
| `task:completed` | `"task completed"` |
| `task:failed` | `"failed: {error}"` (truncated to 28 chars) |
| `tool:started` | `"{toolName} -- {inputSummary}"` (truncated to 24 chars) |
| `tool:completed` | `"{toolName} done"` |
| `subagent:spawn` | `"spawned {name}"` |
| `reasoning:update` | Reasoning text (truncated to 36 chars) |
| (default) | Event type string |

---

## Internal Components

### EventRow (Lines 68-117)
Memoized button component rendering a single event entry.

**Props**:

| Prop | Type | Description |
|---|---|---|
| `event` | `AgentEvent` | The event data. |
| `agentName` | `string` | Resolved agent display name. |
| `isNew` | `boolean` | Whether this event was recently received (triggers background highlight). |
| `onClick` | `() => void` | Click handler (selects the agent). |

**Visual Structure**:
- `<button>` with full width, left-aligned text, bottom border separator.
- Background: `rgba(192,132,252,0.05)` when `isNew`, transparent otherwise.
- 300ms background transition for smooth highlight fade.
- Top row: event icon (colored), agent name (bold, truncated with ellipsis), relative timestamp.
- Bottom row: event subtitle text (indented 17px, gray, truncated with ellipsis).

**Display Name**: `'EventRow'`

---

## Constants

### MAX_VISIBLE (Line 123)
```ts
const MAX_VISIBLE = 50;
```
Maximum number of events displayed in the feed at any time.

---

## Exported Members

### AgentLiveFeedProps (Lines 125-130)
Interface for the main component props.

| Prop | Type | Default | Description |
|---|---|---|---|
| `events` | `AgentEvent[]` | required | Array of events, newest first. |
| `agents` | `Map<string, AgentIdentity>` | required | Agent identity lookup map. |
| `onSelectAgent` | `(agentId: string) => void` | `undefined` | Optional callback when an event row is clicked. |
| `colorScheme` | `'dark' \| 'light'` | `'dark'` | Theme color scheme. |

### AgentLiveFeed (Lines 132-294)
Default export. Memoized functional component.

**Display Name**: `'AgentLiveFeed'`

---

## State Management

| State Variable | Type | Initial | Purpose |
|---|---|---|---|
| `autoScroll` | `boolean` | `true` | Whether the feed auto-scrolls to the top on new events. |
| `newIds` | `Set<string>` | empty Set | Set of event IDs that were just received, for highlight animation. |

**Refs**:
- `containerRef` - `HTMLDivElement` ref for the scrollable event list.
- `prevIdsRef` - `Set<string>` tracking event IDs from the previous render cycle.

---

## Side Effects

### New Event Tracking (Lines 142-155)
- Compares current visible events against `prevIdsRef.current`.
- Any new event IDs are stored in `newIds` state.
- After 600ms, `newIds` is cleared (removing the highlight).
- Updates `prevIdsRef` with current event IDs.

### Auto-Scroll (Lines 157-162)
- When `autoScroll` is true and the container ref exists, scrolls to top (`scrollTop = 0`) whenever `events` change.

---

## Event Handlers

### handleScroll (Lines 164-169)
Memoized callback attached to the scroll container's `onScroll`.
- Pauses auto-scroll if the user scrolls down (`scrollTop >= 20`).
- Re-enables auto-scroll when scrolled back near the top (`scrollTop < 20`).

---

## JSX Structure

### Container (Lines 172-186)
Absolute-positioned panel:
- Right: 0, Top: 0, Bottom: 60px.
- Width: 260px.
- Background: theme's `sidebar` token.
- Backdrop filter: 12px blur.
- Left border: theme's `edge` token.
- z-index: 10.

### Header (Lines 188-243)
- Label: "Agent Activity" with uppercase styling.
- Green pulsing dot (CSS `livePulse` animation, 2s infinite).
- ARIA attributes: `role="log"`, `aria-live="polite"`, `aria-label="Agent activity feed"`.
- When `autoScroll` is false: shows a "UP LIVE" button to jump back to live mode. Button has focus/blur outline handling for accessibility.

### Event List (Lines 246-286)
Scrollable container (`overflowY: auto`):
- **Empty state**: Centered "Waiting for agent activity..." message.
- **With events**: Maps `visible` events to `EventRow` components. Agent name is resolved from the `agents` map, falling back to the first 8 characters of the agent ID.

### CSS Animation (Line 288)
```css
@keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
```
Pulsing opacity animation for the live indicator dot.

---

## Usage Example

```tsx
import AgentLiveFeed from '@/features/Agents/AgentLiveFeed';

<AgentLiveFeed
  events={sortedEvents}
  agents={agentMap}
  onSelectAgent={(id) => setActiveAgent(id)}
  colorScheme="dark"
/>
```
