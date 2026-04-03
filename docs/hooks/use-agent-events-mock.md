# useAgentEventsMock

## File Path

`/workspaces/visualize-web3-realtime/hooks/useAgentEventsMock.ts`

## Purpose

Custom React hook that generates simulated AI agent lifecycle events for development and demonstration purposes. Implements the same `UseAgentEventsReturn` interface as `useAgentEvents`, enabling seamless swapping between live WebSocket data and mock data without modifying consuming components. Uses a state-machine model to advance agents through idle, task, and tool-call phases.

---

## Module Dependencies (Imports)

### Line 1: Client Directive

```ts
'use client';
```

Next.js client component directive. Required because this hook uses React hooks and browser APIs (`setInterval`, `setTimeout`).

### Line 3: React Hooks

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
```

- **`useCallback`** -- Memoizes `emit`, `tick`, `connect`, and `disconnect` functions.
- **`useEffect`** -- Manages the tick interval timer and auto-start lifecycle.
- **`useRef`** -- Stores mutable state for agents, flows, agent phases, paused status, and tool call timestamps without triggering re-renders.
- **`useState`** -- Manages reactive state for connection status, agents map, flows map, recent events, stats, executor state, and paused flag.

### Line 4: Core Domain Types

```ts
import type { AgentEvent, AgentIdentity, AgentFlowTrace } from '@web3viz/core';
```

- **`AgentEvent`** -- Union type for all agent lifecycle events.
- **`AgentIdentity`** -- Agent descriptor with ID, name, role, parent, and timestamps.
- **`AgentFlowTrace`** -- Complete execution trace for an agent.

### Line 5: Shared Types from useAgentEvents

```ts
import type { AgentAggregateStats, UseAgentEventsReturn } from './useAgentEvents';
```

- **`AgentAggregateStats`** -- Aggregate metrics interface (totalAgents, activeTasks, etc.).
- **`UseAgentEventsReturn`** -- Return type interface ensuring mock and live hooks are interchangeable.

---

## Mock Data Constants

### `AGENT_PROFILES` (Lines 11-17)

```ts
const AGENT_PROFILES: Array<{ name: string; role: string }>
```

Array of 5 agent profile templates used to seed mock agents:

| Name | Role |
|---|---|
| `CodeReviewer` | `coder` |
| `Researcher` | `researcher` |
| `Planner` | `planner` |
| `TypeChecker` | `coder` |
| `DocWriter` | `researcher` |

### `TASK_DESCRIPTIONS` (Lines 19-30)

```ts
const TASK_DESCRIPTIONS: string[]
```

Array of 10 task description strings randomly assigned to mock tasks. Examples include "Review pull request #42", "Analyze API documentation", "Optimize database queries".

### `TOOL_CALLS` (Lines 32-43)

```ts
const TOOL_CALLS: Array<{ toolName: string; toolCategory: string; inputSummary: string }>
```

Array of 10 tool call templates with name, category, and input summary. Categories include `filesystem`, `search`, `terminal`, `network`, `code`, and `reasoning`.

### `REASONING_SNIPPETS` (Lines 45-51)

```ts
const REASONING_SNIPPETS: string[]
```

Array of 5 reasoning text snippets emitted as `reasoning:update` events. Examples: "The form component has a race condition in the submit handler."

---

## Helper Functions

### `uid()` (Lines 57-59)

```ts
function uid(): string
```

Generates a random 9-character alphanumeric string using `Math.random().toString(36)`. Used for generating unique event IDs, task IDs, call IDs, and agent IDs.

### `randomFrom<T>(arr: T[])` (Lines 61-63)

```ts
function randomFrom<T>(arr: T[]): T
```

Generic function that returns a random element from an array using `Math.floor(Math.random() * arr.length)`.

### `emptyFlow(agent: AgentIdentity)` (Lines 65-78)

```ts
function emptyFlow(agent: AgentIdentity): AgentFlowTrace
```

Creates an empty `AgentFlowTrace` for a given agent. Identical in structure to `emptyFlowTrace` in `useAgentEvents.ts`. Sets `status: 'active'` and initializes all arrays as empty.

---

## Exported Types

### `UseMockAgentEventsOptions` (Lines 84-88)

```ts
export interface UseMockAgentEventsOptions {
  agentCount?: number;
  eventsPerSecond?: number;
  autoStart?: boolean;
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `agentCount` | `number` | `3` | Number of initial agents to spawn |
| `eventsPerSecond` | `number` | `2` | Tick rate controlling how frequently agent state machines advance |
| `autoStart` | `boolean` | `true` | Whether to auto-connect and start generating events on mount |

---

## Hook: `useAgentEventsMock` (Lines 94-405)

### Signature

```ts
export function useAgentEventsMock(options: UseMockAgentEventsOptions = {}): UseAgentEventsReturn
```

### Parameter Destructuring (Line 95)

```ts
const { agentCount = 3, eventsPerSecond = 2, autoStart = true } = options;
```

### State Variables (Lines 97-111)

| Variable | Type | Initial Value | Description |
|---|---|---|---|
| `connected` | `boolean` | `false` | Simulated connection status |
| `paused` | `boolean` | `false` | Whether event generation is paused |
| `agents` | `Map<string, AgentIdentity>` | `new Map()` | Registry of mock agents |
| `flows` | `Map<string, AgentFlowTrace>` | `new Map()` | Execution traces per agent |
| `recentEvents` | `AgentEvent[]` | `[]` | Event history (newest first) |
| `stats` | `AgentAggregateStats` | zero-initialized object | Aggregate metrics |
| `executorState` | `null` | `null` | Always null in mock mode (no real executor) |

### Refs (Lines 112-120)

| Ref | Type | Description |
|---|---|---|
| `pausedRef` | `boolean` | Mutable mirror of paused state for use in callbacks |
| `agentsRef` | `Map<string, AgentIdentity>` | Mutable agent registry for use in tick callback |
| `flowsRef` | `Map<string, AgentFlowTrace>` | Mutable flow registry |
| `toolCallTimestampsRef` | `number[]` | Timestamps for tool calls per minute calculation |
| `agentPhaseRef` | `Map<string, { phase, taskId, callCount, taskCount }>` | State machine tracking for each agent |

### Agent Phase State Machine (Line 120)

Each agent has a phase object with:
- `phase` -- Either `'idle'` or `'in-task'`
- `taskId` -- Current task ID or `null`
- `callCount` -- Number of tool calls made in current task
- `taskCount` -- Total tasks completed by this agent

### `emit(event: AgentEvent)` (Lines 123-141)

```ts
const emit = useCallback((event: AgentEvent) => { ... }, []);
```

Emits a mock event by:
1. Checking `pausedRef` -- returns early if paused.
2. Prepending the event to `recentEvents` (capped at 500).
3. Appending the event to the corresponding agent's flow in the `flows` map.

### `tick()` (Lines 144-327)

```ts
const tick = useCallback(() => { ... }, [emit, agentCount]);
```

Core simulation loop that advances each agent's state machine on every tick. Called at `1000/eventsPerSecond` millisecond intervals.

**State Machine Logic per Agent:**

**Idle Phase (Lines 157-213):**
- 30% chance (`roll < 0.3`) to start a new task.
- Creates a `task:started` event with a random description and priority.
- 20% sub-chance (`roll < 0.06` and agent count under limit) to spawn a sub-agent:
  - Creates a new agent identity with `parentAgentId`.
  - Registers in `agentsRef`, `agentPhaseRef`, `flowsRef`.
  - Updates React state and emits a `subagent:spawn` event.

**In-Task Phase (Lines 214-293):**
- Determines max tool calls (3-8 random range).
- If under max calls and 50% chance: makes a tool call.
  - Emits `tool:started` event with random tool template.
  - Schedules a `tool:completed` or `tool:failed` event 200-1000ms later (90% success rate).
  - 10% chance to also emit a `reasoning:update` event.
- If max calls reached or 10% chance: completes the task.
  - 10% failure rate.
  - Emits `task:completed` or `task:failed`.
  - Resets phase to `idle`.

**Stats Update (Lines 297-326):**
- Prunes tool call timestamps to 60-second window.
- Reads current flows to compute `activeTasks`, `totalToolCalls`, `totalCompleted`, `totalFailed`.
- For `activeTasks`, uses the phase map directly (counting agents in `in-task` phase).
- Updates `stats` state with `toolCallsPerMinute` from the timestamp count.

### `connect()` (Lines 330-366)

```ts
const connect = useCallback(() => { ... }, [agentCount, emit]);
```

Spawns initial agents:
1. Creates `Math.min(agentCount, AGENT_PROFILES.length)` agents with IDs like `agent_000`, `agent_001`, etc.
2. Populates `agentsRef`, `flowsRef`, and `agentPhaseRef`.
3. Sets React state for `agents` and `flows`.
4. Staggers `agent:spawn` events with 200ms delays using `setTimeout`.
5. Sets `connected` to `true`.

### `disconnect()` (Lines 368-376)

```ts
const disconnect = useCallback(() => { ... }, []);
```

Resets all state: sets `connected` to `false`, clears all refs and React state maps.

### Tick Interval Effect (Lines 379-384)

```ts
useEffect(() => {
  if (!connected) return;
  const intervalMs = 1000 / eventsPerSecond;
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}, [connected, eventsPerSecond, tick]);
```

Starts a `setInterval` at the configured rate when connected. Clears the interval on disconnect or unmount.

### Auto-Start Effect (Lines 387-391)

```ts
useEffect(() => {
  if (autoStart) connect();
  return () => disconnect();
}, []);
```

Runs once on mount. Calls `connect()` if `autoStart` is true. Cleanup calls `disconnect()`.

### Return Value (Lines 393-404)

Returns `UseAgentEventsReturn` with the same shape as `useAgentEvents`, ensuring consumers cannot distinguish between mock and live data.

---

## Side Effects

1. **Interval timer** -- A `setInterval` runs the `tick` function at `1000/eventsPerSecond` ms intervals while connected.
2. **Staggered spawn timers** -- `setTimeout` calls emit `agent:spawn` events with 200ms delays per agent.
3. **Delayed tool completion** -- `setTimeout` (200-1000ms) simulates asynchronous tool call completion.

---

## State Management Details

The hook uses a dual-state pattern: mutable refs (`agentsRef`, `flowsRef`, `agentPhaseRef`) for performance-critical operations inside the `tick` callback, and React state (`agents`, `flows`, `recentEvents`, `stats`) for triggering UI re-renders. The refs are updated synchronously during tick processing, while React state is updated via state setters.

---

## Usage Example

```tsx
import { useAgentEventsMock } from '@/hooks/useAgentEventsMock';

function MockAgentDemo() {
  const { connected, agents, flows, stats, paused, setPaused } =
    useAgentEventsMock({
      agentCount: 5,
      eventsPerSecond: 4,
      autoStart: true,
    });

  return (
    <div>
      <p>Mock mode: {connected ? 'Running' : 'Stopped'}</p>
      <p>Agents: {agents.size}</p>
      <p>Tool calls/min: {stats.toolCallsPerMinute}</p>
      <button onClick={() => setPaused(!paused)}>
        {paused ? 'Resume' : 'Pause'}
      </button>
    </div>
  );
}
```
