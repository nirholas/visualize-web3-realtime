# useAgentEvents

## File Path

`/workspaces/visualize-web3-realtime/hooks/useAgentEvents.ts`

## Purpose

Custom React hook that establishes a WebSocket connection to the SperaxOS agent API, processes incoming real-time agent lifecycle events, and maintains stateful representations of agents, task flows, tool calls, and aggregate statistics. This is the primary production hook for consuming live AI agent telemetry data.

---

## Module Dependencies (Imports)

### Line 1: Client Directive

```ts
'use client';
```

Next.js client component directive. This file uses browser-only APIs (`WebSocket`, `setTimeout`) and React hooks that require client-side execution.

### Line 3: React Hooks

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
```

- **`useCallback`** -- Memoizes the `connect`, `disconnect`, `processEvent`, and `resetHeartbeatTimer` functions to prevent unnecessary re-renders and stale closures in the WebSocket lifecycle.
- **`useEffect`** -- Manages auto-connection on mount, cleanup on unmount, and stat recomputation when flows change.
- **`useRef`** -- Stores mutable references to the WebSocket instance, reconnect timers, heartbeat timers, paused state, and tool call timestamps without triggering re-renders.
- **`useState`** -- Manages reactive state for connection status, executor state, agents map, flows map, recent events array, aggregate stats, and paused flag.

### Lines 4-11: Core Domain Types

```ts
import type {
  AgentEvent,
  AgentIdentity,
  AgentFlowTrace,
  AgentTask,
  AgentToolCall,
  ExecutorState,
} from '@web3viz/core';
```

- **`AgentEvent`** -- Discriminated union type representing all possible agent lifecycle events (spawn, task, tool, heartbeat, etc.).
- **`AgentIdentity`** -- Describes an agent's identity: ID, name, role, optional address, optional parent agent, and creation timestamp.
- **`AgentFlowTrace`** -- Complete trace of an agent's execution flow: tasks, tool calls, events, sub-agents, and status.
- **`AgentTask`** -- Represents a single task assigned to an agent with status, priority, timestamps, result, and error fields.
- **`AgentToolCall`** -- Represents a single tool invocation by an agent with call ID, tool name, category, status, and timing.
- **`ExecutorState`** -- Top-level orchestrator state containing executor ID, status, active agents, uptime, and counters.

---

## Exported Types

### `AgentAggregateStats` (Lines 17-24)

```ts
export interface AgentAggregateStats {
  totalAgents: number;
  activeTasks: number;
  totalToolCalls: number;
  totalTasksCompleted: number;
  totalTasksFailed: number;
  toolCallsPerMinute: number;
}
```

Aggregate metrics computed from all agent flows. Used by dashboard components and the agent provider layer.

| Field | Type | Description |
|---|---|---|
| `totalAgents` | `number` | Count of all registered agents (including sub-agents) |
| `activeTasks` | `number` | Count of tasks currently in `in-progress` or `queued` status |
| `totalToolCalls` | `number` | Cumulative count of all tool invocations across all agents |
| `totalTasksCompleted` | `number` | Cumulative count of tasks with `completed` status |
| `totalTasksFailed` | `number` | Cumulative count of tasks with `failed` status |
| `toolCallsPerMinute` | `number` | Sliding-window count of tool calls within the last 60 seconds |

### `UseAgentEventsOptions` (Lines 26-37)

```ts
export interface UseAgentEventsOptions {
  url: string;
  apiKey?: string;
  autoConnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}
```

Configuration object for the `useAgentEvents` hook.

| Field | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | (required) | SperaxOS WebSocket endpoint URL |
| `apiKey` | `string` | `undefined` | Optional API key appended as query parameter |
| `autoConnect` | `boolean` | `true` | Whether to connect automatically on component mount |
| `reconnectDelay` | `number` | `3000` | Base delay in milliseconds before reconnect attempt |
| `maxReconnectAttempts` | `number` | `10` | Maximum number of reconnection attempts before giving up |

### `UseAgentEventsReturn` (Lines 39-50)

```ts
export interface UseAgentEventsReturn {
  connected: boolean;
  executorState: ExecutorState | null;
  agents: Map<string, AgentIdentity>;
  flows: Map<string, AgentFlowTrace>;
  recentEvents: AgentEvent[];
  stats: AgentAggregateStats;
  connect: () => void;
  disconnect: () => void;
  paused: boolean;
  setPaused: (paused: boolean) => void;
}
```

Return value of the hook, providing all state and control methods.

| Field | Type | Description |
|---|---|---|
| `connected` | `boolean` | Whether the WebSocket is currently open |
| `executorState` | `ExecutorState \| null` | Top-level executor/orchestrator state, populated from heartbeat events |
| `agents` | `Map<string, AgentIdentity>` | Map of agent ID to agent identity for all known agents |
| `flows` | `Map<string, AgentFlowTrace>` | Map of agent ID to full execution trace |
| `recentEvents` | `AgentEvent[]` | Most recent events (newest first), capped at 500 |
| `stats` | `AgentAggregateStats` | Computed aggregate statistics |
| `connect` | `() => void` | Manually initiate WebSocket connection |
| `disconnect` | `() => void` | Manually close WebSocket and stop reconnection |
| `paused` | `boolean` | Whether event processing is paused |
| `setPaused` | `(paused: boolean) => void` | Toggle pause state |

---

## Constants (Lines 56-58)

```ts
const MAX_RECENT_EVENTS = 500;
const HEARTBEAT_TIMEOUT_MS = 60_000;
const TOOL_CALLS_WINDOW_MS = 60_000;
```

| Constant | Value | Description |
|---|---|---|
| `MAX_RECENT_EVENTS` | `500` | Maximum number of recent events retained in state |
| `HEARTBEAT_TIMEOUT_MS` | `60000` | If no heartbeat is received within 60 seconds, connection is considered dead |
| `TOOL_CALLS_WINDOW_MS` | `60000` | Sliding window (60 seconds) for computing `toolCallsPerMinute` |

---

## Helper Functions

### `emptyStats()` (Lines 64-73)

```ts
function emptyStats(): AgentAggregateStats
```

Returns a zero-initialized `AgentAggregateStats` object. Used as the initial value for the stats state.

### `emptyFlowTrace(agent: AgentIdentity)` (Lines 75-88)

```ts
function emptyFlowTrace(agent: AgentIdentity): AgentFlowTrace
```

Creates a new, empty `AgentFlowTrace` for a given agent. The `flowId` is derived from the agent's ID. The trace starts with `status: 'active'` and empty arrays for tasks, tool calls, events, and sub-agents.

---

## Hook: `useAgentEvents` (Lines 94-492)

### Signature

```ts
export function useAgentEvents(options: UseAgentEventsOptions): UseAgentEventsReturn
```

### Parameter Destructuring (Lines 95-101)

Destructures `options` with defaults:
- `url` -- Required WebSocket URL
- `apiKey` -- Optional authentication key
- `autoConnect` -- Defaults to `true`
- `reconnectDelay` -- Defaults to `3000` ms
- `maxReconnectAttempts` -- Defaults to `10`

### State Variables (Lines 103-109)

| Variable | Type | Initial Value | Description |
|---|---|---|---|
| `connected` | `boolean` | `false` | WebSocket connection status |
| `paused` | `boolean` | `false` | Whether event processing is paused |
| `executorState` | `ExecutorState \| null` | `null` | Orchestrator state from heartbeats |
| `agents` | `Map<string, AgentIdentity>` | `new Map()` | Registry of all known agents |
| `flows` | `Map<string, AgentFlowTrace>` | `new Map()` | Execution traces per agent |
| `recentEvents` | `AgentEvent[]` | `[]` | Capped event history |
| `stats` | `AgentAggregateStats` | `emptyStats()` | Computed aggregate metrics |

### Refs (Lines 111-116)

| Ref | Type | Description |
|---|---|---|
| `wsRef` | `WebSocket \| null` | Current WebSocket instance |
| `reconnectAttemptsRef` | `number` | Counter for reconnection attempts |
| `reconnectTimerRef` | `ReturnType<typeof setTimeout> \| null` | Timer ID for scheduled reconnect |
| `heartbeatTimerRef` | `ReturnType<typeof setTimeout> \| null` | Timer ID for heartbeat timeout |
| `pausedRef` | `boolean` | Mutable mirror of `paused` state for use inside callbacks |
| `toolCallTimestampsRef` | `number[]` | Timestamps of recent tool:started events for rate calculation |

### Line 118: Paused Ref Sync

```ts
pausedRef.current = paused;
```

Synchronizes the `pausedRef` with the latest `paused` state on every render so that callbacks always have the current pause status without needing to be recreated.

### `resetHeartbeatTimer()` (Lines 121-129)

```ts
const resetHeartbeatTimer = useCallback(() => { ... }, []);
```

Clears any existing heartbeat timer and sets a new one. If `HEARTBEAT_TIMEOUT_MS` (60 seconds) elapses without being reset, the executor state is updated to `status: 'error'` with a `'Heartbeat timeout'` message, and `connected` is set to `false`.

### `processEvent(event: AgentEvent)` (Lines 132-378)

```ts
const processEvent = useCallback((event: AgentEvent) => { ... }, [resetHeartbeatTimer]);
```

Central event processing function. Handles all agent event types via a `switch` statement:

**Line 134:** Early return if `pausedRef.current` is true.

**Lines 137-139:** Prepends the event to `recentEvents` and caps at `MAX_RECENT_EVENTS`.

**Event Type Handlers:**

1. **`heartbeat`** (Lines 143-155): Resets the heartbeat timer, extracts `uptime` and `totalTasksProcessed` from the payload, and updates executor state with `status: 'running'`.

2. **`agent:spawn`** (Lines 158-179): Creates a new `AgentIdentity` from the payload, adds it to the `agents` map, and initializes an empty `AgentFlowTrace` in the `flows` map.

3. **`subagent:spawn`** (Lines 182-210): Creates a sub-agent identity with `parentAgentId` set to the emitting agent. Adds the sub-agent to the parent's flow `subAgents` array, registers the sub-agent in the `agents` map, and creates a new flow for the sub-agent.

4. **`task:queued` / `task:started` / `task:progress`** (Lines 214-253): Resolves the task ID from `event.taskId` or the payload. Maps event type to task status (`queued`, `in-progress`). If the task already exists in the flow, updates its status and `startedAt`. Otherwise, creates a new `AgentTask` and appends it to the flow.

5. **`task:completed` / `task:failed`** (Lines 256-285): Updates the matching task's status to `completed` or `failed`, sets `endedAt`, and stores the result or error from the payload. Recomputes `totalTasksCompleted` on the flow.

6. **`tool:started` / `tool:streaming` / `tool:completed` / `tool:failed`** (Lines 288-345): On `tool:started`, pushes the timestamp to `toolCallTimestampsRef` for rate calculation. If the tool call already exists (matched by `callId`), updates its status, timing, and output. Otherwise, creates a new `AgentToolCall` and appends it.

7. **`agent:idle` / `agent:shutdown`** (Lines 348-362): Updates the flow status to `idle` or `completed` and optionally sets `endedAt`.

8. **default** (Lines 365-374): For unhandled event types (e.g., `reasoning`, `error`), appends the event to the agent's flow events array.

### Stats Recomputation Effect (Lines 381-406)

```ts
useEffect(() => { ... }, [flows, agents]);
```

Triggered whenever `flows` or `agents` change. Performs the following:
1. Prunes `toolCallTimestampsRef` to only include timestamps within the last 60 seconds.
2. Iterates over all flows to sum `activeTasks`, `totalToolCalls`, `totalCompleted`, and `totalFailed`.
3. Computes `toolCallsPerMinute` from the count of remaining timestamps.
4. Updates the `stats` state.

### `connect()` (Lines 409-450)

```ts
const connect = useCallback(() => { ... }, [url, apiKey, reconnectDelay, maxReconnectAttempts, processEvent, resetHeartbeatTimer]);
```

1. Guards against double-connection if WebSocket is already open.
2. Constructs the WebSocket URL, appending `apiKey` as a query parameter if provided.
3. Creates a new `WebSocket` instance and stores it in `wsRef`.
4. **`onopen`**: Sets `connected` to `true`, resets reconnect attempts to 0, starts the heartbeat timer.
5. **`onmessage`**: Parses incoming JSON as `AgentEvent`. Validates that `eventId`, `type`, and `timestamp` exist before calling `processEvent`.
6. **`onclose`**: Sets `connected` to `false`, nulls the WebSocket ref, and schedules auto-reconnect with exponential backoff (`reconnectDelay * 2^attempts`) if under `maxReconnectAttempts`.
7. **`onerror`**: Closes the WebSocket (which triggers `onclose`).

### `disconnect()` (Lines 452-467)

```ts
const disconnect = useCallback(() => { ... }, [maxReconnectAttempts]);
```

1. Clears reconnect and heartbeat timers.
2. Sets `reconnectAttemptsRef` to `maxReconnectAttempts` to prevent auto-reconnect.
3. Closes the WebSocket and sets `connected` to `false`.

### Auto-Connect Effect (Lines 470-478)

```ts
useEffect(() => {
  if (autoConnect) connect();
  return () => disconnect();
}, []);
```

Runs once on mount. If `autoConnect` is true, initiates the WebSocket connection. Cleanup function calls `disconnect()` on unmount.

### Return Value (Lines 480-491)

Returns the `UseAgentEventsReturn` object containing all state variables and control methods.

---

## Side Effects

1. **WebSocket connection** -- Opens a persistent WebSocket to the SperaxOS API with automatic reconnection using exponential backoff.
2. **Heartbeat monitoring** -- Sets a 60-second timeout timer that resets on each heartbeat event; marks the executor as errored if no heartbeat is received.
3. **Event listener registration** -- Processes incoming WebSocket messages and updates multiple state maps.
4. **Timer management** -- Creates and cleans up `setTimeout` and `setInterval` timers for reconnection and heartbeat.

---

## Usage Example

```tsx
import { useAgentEvents } from '@/hooks/useAgentEvents';

function AgentDashboard() {
  const {
    connected,
    agents,
    flows,
    stats,
    paused,
    setPaused,
    disconnect,
  } = useAgentEvents({
    url: 'wss://api.speraxos.io/agents/v1/stream',
    apiKey: process.env.NEXT_PUBLIC_SPERAXOS_API_KEY,
    autoConnect: true,
    reconnectDelay: 3000,
    maxReconnectAttempts: 10,
  });

  return (
    <div>
      <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
      <p>Agents: {stats.totalAgents}</p>
      <p>Active Tasks: {stats.activeTasks}</p>
      <p>Tool Calls/min: {stats.toolCallsPerMinute}</p>
      <button onClick={() => setPaused(!paused)}>
        {paused ? 'Resume' : 'Pause'}
      </button>
    </div>
  );
}
```
