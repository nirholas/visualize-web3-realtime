# app/agents/page.tsx

## File Path

`/workspaces/visualize-web3-realtime/app/agents/page.tsx`

## Purpose

Main page component for the Agent World visualization (`/agents` route). Renders a full-screen real-time force-directed graph of AI agent activity, including a sidebar for agent selection, a live event feed, timeline scrubber, stats bar, executor health banner, task inspector panel, and theme/download controls. The page supports deep linking via URL search params, keyboard shortcuts, responsive layouts, and a dormant state with a "Run Demo" button.

## Module Dependencies

| Import | Source | Description |
|--------|--------|-------------|
| `Link` | `next/link` | Next.js client-side navigation component. |
| `dynamicImport` | `next/dynamic` | Next.js dynamic import for code splitting and SSR avoidance. |
| `useSearchParams` | `next/navigation` | Hook to read URL query parameters on the client. |
| `Suspense` | `react` | React component for wrapping lazy-loaded children with a fallback. |
| `useCallback` | `react` | Hook to memoize callback functions. |
| `useEffect` | `react` | Hook for side effects (event listeners, data subscriptions). |
| `useMemo` | `react` | Hook to memoize computed values. |
| `useRef` | `react` | Hook to create mutable ref objects. |
| `useState` | `react` | Hook for local component state. |
| `AgentTask` (type) | `@web3viz/core` | TypeScript type representing an agent task. |
| `AgentIdentity` (type) | `@web3viz/core` | TypeScript type representing an agent's identity. |
| `AgentForceGraphHandle` (type) | `@/features/Agents/AgentForceGraph` | TypeScript type for the imperative handle exposed by the force graph ref. |
| `useAgentProvider` | `@/hooks/useAgentProvider` | Custom hook that manages WebSocket/mock connections and returns agent data. |
| `useAgentKeyboardShortcuts` | `@/hooks/useAgentKeyboardShortcuts` | Custom hook that registers keyboard shortcuts for agent navigation. |
| `AgentSidebar` | `@/features/Agents/AgentSidebar` | Sidebar component listing agents and tool category filters. |
| `AgentStatsBar` | `@/features/Agents/AgentStatsBar` | Bottom stats bar showing agent metrics. |
| `AgentLiveFeed` | `@/features/Agents/AgentLiveFeed` | Right-side panel showing real-time agent events. |
| `AgentTimeline` | `@/features/Agents/AgentTimeline` | Top timeline/scrubber for agent events. |
| `ExecutorBanner` | `@/features/Agents/ExecutorBanner` | Top banner showing executor health status. |
| `AgentLoadingScreen` | `@/features/Agents/AgentLoadingScreen` | Full-screen loading overlay shown until first data. |
| `TaskInspectorPanel` | `@/features/Agents/TaskInspector` | Slide-in panel for inspecting a selected task. |
| `agentThemeTokens` | `@/packages/ui/src/tokens/agent-colors` | Theme token object with dark/light color palettes. |
| `captureCanvas` | `@/features/World/utils/screenshot` | Utility to capture a canvas element as a Blob. |
| `downloadBlob` | `@/features/World/utils/screenshot` | Utility to trigger a file download from a Blob. |
| `timestampedFilename` | `@/features/World/utils/screenshot` | Generates a filename with a timestamp suffix. |

## Line-by-Line Documentation

### Line 1 -- Client Directive

```ts
'use client';
```

Marks this module as a Client Component. Required because it uses hooks (`useState`, `useEffect`, `useSearchParams`, etc.) and browser APIs.

### Lines 3-19 -- Imports

All imports are enumerated in the Module Dependencies table above.

### Lines 22-43 -- Dynamic Import: AgentForceGraph

```ts
const AgentForceGraph = dynamicImport(() => import('@/features/Agents/AgentForceGraph'), {
  ssr: false,
  loading: () => ( <div>...</div> ),
}) as any;
```

Dynamically imports the `AgentForceGraph` component with SSR disabled (`ssr: false`) because Three.js requires browser APIs (`window`, `WebGL`). The `loading` callback renders a centered placeholder with the text "Connecting to agent executor..." on a dark background (`#0a0a0f`). Cast to `any` to suppress TypeScript errors from the dynamic import generic.

### Lines 49 -- Tool Category Set

```ts
const ALL_TOOL_CATEGORIES = new Set(['filesystem', 'search', 'terminal', 'network', 'code', 'reasoning']);
```

Static `Set` defining all possible tool categories that agents can use. Used as the initial value for the tool category filter state.

### Lines 55-591 -- AgentsPageInner Component

The main page logic, extracted into a separate component to allow `useSearchParams` to be wrapped in `<Suspense>`.

#### State Variables (Lines 57-71)

| Variable | Type | Initial Value | Purpose |
|----------|------|---------------|---------|
| `searchParams` | `ReadonlyURLSearchParams` | (from hook) | Current URL query parameters. |
| `agentGraphRef` | `Ref<AgentForceGraphHandle>` | `null` | Ref to the force graph's imperative API. |
| `activeAgentId` | `string \| null` | `null` | Currently selected/focused agent. |
| `selectedTaskId` | `string \| null` | `null` | Currently inspected task. |
| `pageReady` | `boolean` | `false` | Whether first agent data has arrived. |
| `activeToolCategories` | `Set<string>` | `ALL_TOOL_CATEGORIES` | Which tool categories are visible in the graph. |
| `isPlaying` | `boolean` | `true` | Whether the timeline is playing/live. |
| `scrubOffset` | `number` | `0` | Current scrub position offset. |
| `feedVisible` | `boolean` | `true` | Whether the live feed panel is shown. |
| `colorScheme` | `'dark' \| 'light'` | `'dark'` | Current theme. |
| `windowWidth` | `number` | `window.innerWidth` or `1440` | Current viewport width for responsive layout. |
| `downloading` | `boolean` | `false` | Whether a screenshot download is in progress. |
| `demoActive` | `boolean` | `false` | Whether the demo/mock data mode is active. |

#### useAgentProvider Hook (Lines 72-77)

```ts
const { stats, agents, flows, executorState, agentStats, connected, events } = useAgentProvider({ ... });
```

Connects to the agent data source. Configuration:
- `mock`: Defaults to `true` unless `NEXT_PUBLIC_AGENT_MOCK` is `'false'`.
- `url`: WebSocket URL from `NEXT_PUBLIC_SPERAXOS_WS_URL`.
- `apiKey`: API key from `NEXT_PUBLIC_SPERAXOS_API_KEY`.
- `enabled`: Only connects when `demoActive` is `true`.

Returns:
- `stats` -- Aggregate statistics including `rawEvents`, `topTokens`, `traderEdges`.
- `agents` -- `Map<string, AgentIdentity>` of all known agents.
- `flows` -- `Map<string, AgentFlow>` of agent execution flows.
- `executorState` -- Current executor health/status.
- `agentStats` -- Computed stats: `totalAgents`, `activeTasks`, `toolCallsPerMinute`, `totalTasksCompleted`, `totalTasksFailed`.
- `connected` -- Whether the WebSocket is connected.
- `events` -- Raw event stream.

#### Callback Handlers (Lines 79-118)

| Handler | Lines | Purpose |
|---------|-------|---------|
| `handleSelectAgent` | 79-81 | Sets `activeAgentId`. Memoized with `useCallback`. |
| `handleSelectTask` | 83-85 | Sets `selectedTaskId`. |
| `handleToggleToolCategory` | 87-97 | Toggles a category in the `activeToolCategories` Set. |
| `handleTogglePlay` | 99 | Toggles `isPlaying`. |
| `handleFitCamera` | 100-102 | Placeholder for camera fit (handled internally by graph). |
| `handleToggleFeed` | 103 | Toggles `feedVisible`. |
| `handleDownloadAgent` | 105-118 | Captures the force graph canvas as a PNG and triggers download. Guards against concurrent downloads. |

#### Effects (Lines 120-158)

| Effect | Lines | Purpose |
|--------|-------|---------|
| Page ready detection | 121-123 | Sets `pageReady = true` when `agents.size > 0`. |
| Window resize tracking | 126-130 | Adds/removes a `resize` event listener to track `windowWidth`. |
| Deep link support | 133-138 | Reads `?agentId=X` from URL params and selects that agent. |
| Event batching | 144-158 | Collects agent events and batches them over a 100ms window to prevent UI jank. Caps at 500 events. |

#### Computed Values (Lines 163-210)

| Memo | Lines | Purpose |
|------|-------|---------|
| `selectedTask` | 163-175 | Searches all flows to find the `AgentTask` matching `selectedTaskId`. |
| `selectedTaskAgent` | 177-180 | Retrieves the `AgentIdentity` for the selected task's `agentId`. |
| `selectedTaskToolCalls` | 183-192 | Filters tool calls from the matching flow for the selected task. |
| `selectedTaskSubAgents` | 195-210 | Finds agents spawned during the selected task's execution window. |

#### Keyboard Shortcuts (Lines 213-221)

```ts
useAgentKeyboardShortcuts({ ... });
```

Registers keyboard shortcuts for:
- Navigating between agents (`onSelectAgent`).
- Toggling play/pause (`onTogglePlay`).
- Fitting camera (`onFitCamera`).
- Toggling feed visibility (`onToggleFeed`).
- Closing the task inspector (`onCloseInspector`).

#### Layout Constants (Lines 222-234)

| Constant | Value | Purpose |
|----------|-------|---------|
| `BANNER_H` | `24` | Height of the executor banner in pixels. |
| `TIMELINE_H` | `40` | Height of the timeline bar. |
| `STATS_H` | `60` | Height of the bottom stats bar. |
| `isMobile` | `windowWidth < 768` | Mobile breakpoint flag. |
| `isTablet` | `768 <= windowWidth < 1024` | Tablet breakpoint flag. |
| `isDesktop` | `windowWidth >= 1024` | Desktop breakpoint flag. |
| `sidebarWidth` | `0 / 48 / 200` | Sidebar width based on breakpoint. |
| `feedWidth` | `0 / 200 / 260` | Feed panel width based on breakpoint. |
| `themeTokens` | object | Color tokens for the active theme (dark/light). |
| `allAgentsIdle` | boolean | True when page is ready, agents exist, but no tasks are active. |

#### JSX Structure (Lines 239-590)

The component returns a full-viewport `<div>` with `position: relative` and the following children:

1. **AgentLoadingScreen** (Line 250) -- Full-screen loading overlay. Only rendered when `demoActive` is true. Fades out when `pageReady` becomes true.

2. **AgentSidebar** (Lines 253-264) -- Left sidebar listing agents and tool category toggles. Hidden on mobile. Collapsed (icon-only) on tablet.

3. **ExecutorBanner** (Lines 267-274) -- Top banner showing executor connection health. Positioned above the graph area.

4. **AgentTimeline** (Lines 277-287) -- Timeline scrubber for navigating agent events. Hidden on mobile.

5. **3D Force Graph Container** (Lines 290-314) -- Absolutely positioned `<div>` filling the space between banner, sidebar, feed, and stats bar. Contains `<Suspense>` wrapping `<AgentForceGraph>`.

6. **AgentLiveFeed** (Lines 317-324) -- Right-side live event feed. Conditionally shown based on `feedVisible`.

7. **AgentStatsBar** (Lines 327-336) -- Bottom bar showing `totalAgents`, `activeTasks`, `toolCallsPerMinute`, `totalCompleted`, `totalErrors`.

8. **Navigation Links** (Lines 339-369) -- Top-center navigation with a "World" back link and "Agent World" label.

9. **Download Button** (Lines 372-399) -- Top-right button to capture a screenshot of the graph canvas. Shows a spinner icon while downloading.

10. **Theme Toggle Button** (Lines 402-427) -- Top-right button to switch between dark and light themes. Shows sun/moon icon.

11. **Connection Indicator** (Lines 430-455) -- Small dot + "live"/"mock" label in the top-left of the graph area.

12. **Feed Toggle Button** (Lines 458-487) -- Button to show/hide the live feed panel. Hidden on mobile.

13. **All Agents Idle Overlay** (Lines 490-519) -- Centered overlay message shown when all agents have no active tasks.

14. **TaskInspectorPanel** (Lines 522-531) -- Slide-in panel for detailed task inspection. Shown when both `selectedTask` and `selectedTaskAgent` are non-null.

15. **Dormant State Overlay** (Lines 534-588) -- Full-screen overlay shown when `demoActive` is false. Displays "Agent Executor" title, explanation text, and a "Run Demo" button.

### Lines 594-600 -- AgentsPage (Exported)

```ts
export default function AgentsPage() {
  return (
    <Suspense fallback={<div style={{ ... }} />}>
      <AgentsPageInner />
    </Suspense>
  );
}
```

Wraps `AgentsPageInner` in a `<Suspense>` boundary. This is required because `useSearchParams()` needs a Suspense boundary in Next.js App Router. The fallback is a full-viewport dark div.

## Exported Members

| Export | Kind | Description |
|--------|------|-------------|
| `AgentsPage` | Default function component | The page component rendered at `/agents`. |

## Component Props

`AgentsPage` accepts no props. `AgentsPageInner` also accepts no props (reads state from hooks and URL params).

## State Management

All state is local to `AgentsPageInner` via `useState`. Key state flows:

- **Agent data**: `useAgentProvider` hook manages WebSocket connection and returns reactive `agents`, `flows`, `stats`, `executorState`.
- **Selection**: `activeAgentId` and `selectedTaskId` drive sidebar highlighting and task inspector visibility.
- **Responsiveness**: `windowWidth` state drives `isMobile`/`isTablet`/`isDesktop` breakpoints.
- **Theme**: `colorScheme` toggles between dark/light token sets.
- **Demo lifecycle**: `demoActive` controls whether data flows are enabled.

## Side Effects

1. Window resize listener (adds/removes `resize` event).
2. Deep link parsing from URL `?agentId=` parameter.
3. Event batching via `setTimeout` (100ms debounce).
4. Page ready detection when first agent data arrives.
5. Keyboard shortcut registration via `useAgentKeyboardShortcuts`.

## Usage Examples

Navigated to directly:
```
https://example.com/agents
https://example.com/agents?agentId=agent-123
```

Linked from the World page:
```tsx
<Link href="/agents">Agents</Link>
```
