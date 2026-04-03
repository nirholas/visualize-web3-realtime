# AgentTracker.ts - Agent Hierarchy and State Tracker

**File Path:** `packages/executor/src/AgentTracker.ts`

**Purpose:** Tracks the hierarchical tree structure of agents within the executor, maintaining parent-child relationships, lifecycle states, tool usage counts, and timing data. Provides serializable snapshots of the entire agent tree for visualization and monitoring. Emits `AgentEvent` objects via a listener pattern for integration with `EventBroadcaster`.

---

## Module Dependencies

| Import | Source | Type | Description |
|--------|--------|------|-------------|
| `AgentIdentity` | `./types.js` | Type | Agent identity structure (imported but used for type context) |
| `AgentEvent` | `./types.js` | Type | Event payload structure |

---

## Line-by-Line Documentation

### Line 3: AgentStatus Type

```typescript
export type AgentStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting' | 'cancelled';
```

Union type representing all possible states for an agent node in the tree.

| Value | Description |
|-------|-------------|
| `'idle'` | Agent is registered but not actively processing |
| `'running'` | Agent is actively executing a task |
| `'success'` | Agent completed its task successfully |
| `'error'` | Agent encountered an error during execution |
| `'waiting'` | Agent is waiting for external input or a child agent |
| `'cancelled'` | Agent was cancelled by the executor |

### Line 4: AgentOutputType Type

```typescript
export type AgentOutputType = 'text' | 'tool_call' | 'tool_result';
```

Union type for classifying agent output entries.

| Value | Description |
|-------|-------------|
| `'text'` | Plain text output from the agent |
| `'tool_call'` | A tool invocation initiated by the agent |
| `'tool_result'` | The result returned from a tool call |

### Lines 6-21: AgentNode Interface

```typescript
export interface AgentNode {
  agentId: string;
  parentId: string;
  agentType: string;
  description: string;
  status: AgentStatus;
  tools: string[];
  role: string;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  result?: string;
  error?: string;
  children: string[];
  totalToolUses: number;
}
```

Represents a single node in the agent hierarchy tree.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `agentId` | `string` | Yes | Unique identifier for this agent |
| `parentId` | `string` | Yes | ID of the parent agent; empty string for root |
| `agentType` | `string` | Yes | Classification of the agent (e.g., `'root'`, `'worker'`) |
| `description` | `string` | Yes | Human-readable description of the agent's purpose |
| `status` | `AgentStatus` | Yes | Current lifecycle state |
| `tools` | `string[]` | Yes | List of tool names available to this agent |
| `role` | `string` | Yes | Agent's role (e.g., `'executor'`, `'coder'`) |
| `startedAt` | `number` | Yes | Unix epoch milliseconds when the agent was spawned |
| `completedAt` | `number` | No | Unix epoch milliseconds when the agent completed |
| `durationMs` | `number` | No | Total execution duration in milliseconds |
| `result` | `string` | No | Result string on successful completion |
| `error` | `string` | No | Error message on failure |
| `children` | `string[]` | Yes | Array of child agent IDs |
| `totalToolUses` | `number` | Yes | Counter for total tool invocations by this agent |

### Lines 23-29: AgentOutputEntry Interface

```typescript
export interface AgentOutputEntry {
  outputType: AgentOutputType;
  content: string;
  toolName?: string;
  toolUseId?: string;
  timestamp: number;
}
```

Represents a single output record from an agent.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `outputType` | `AgentOutputType` | Yes | Classification of the output |
| `content` | `string` | Yes | The output content text |
| `toolName` | `string` | No | Name of the tool (for `tool_call` and `tool_result` types) |
| `toolUseId` | `string` | No | Unique ID linking a tool call to its result |
| `timestamp` | `number` | Yes | Unix epoch milliseconds when the output was generated |

### Lines 31-34: AgentTreeState Interface

```typescript
export interface AgentTreeState {
  rootAgentId: string;
  agents: Map<string, AgentNode>;
}
```

Internal state structure for the entire agent tree.

| Property | Type | Description |
|----------|------|-------------|
| `rootAgentId` | `string` | ID of the root agent node (always `'root'`) |
| `agents` | `Map<string, AgentNode>` | Map of all agent nodes keyed by agent ID |

---

## Class: AgentTracker

```typescript
export class AgentTracker
```

### Properties

| Property | Visibility | Type | Description |
|----------|-----------|------|-------------|
| `state` | `private` | `AgentTreeState` | Internal tree state containing all agent nodes |
| `eventListeners` | `private` | `Set<(event: AgentEvent) => void>` | Registered event listener callbacks |
| `executorId` | `private` | `string` | ID of the executor this tracker belongs to |

### Constructor

```typescript
constructor(executorId: string)
```

Initializes the tracker with a root node. The root node represents the executor itself.

| Parameter | Type | Description |
|-----------|------|-------------|
| `executorId` | `string` | Identifier for the executor instance |

**Root Node Properties:**
- `agentId`: `'root'`
- `parentId`: `''` (empty string)
- `agentType`: `'root'`
- `description`: `'Executor root'`
- `status`: `'running'`
- `tools`: `[]`
- `role`: `'executor'`
- `startedAt`: `Date.now()`
- `children`: `[]`
- `totalToolUses`: `0`

### Method: onEvent

```typescript
onEvent(callback: (event: AgentEvent) => void): () => void
```

Registers an event listener. Returns an unsubscribe function.

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `(event: AgentEvent) => void` | Listener function |

**Returns:** `() => void` -- Unsubscribe function.

### Method: emit (private)

```typescript
private emit(event: AgentEvent): void
```

Dispatches an event to all registered listeners.

### Method: getDepth

```typescript
getDepth(agentId: string): number
```

Computes the depth of an agent in the tree by traversing parent links upward. The root node has depth 0.

| Parameter | Type | Description |
|-----------|------|-------------|
| `agentId` | `string` | ID of the agent to measure depth for |

**Returns:** `number` -- Depth level (root = 0, direct children = 1, etc.)

### Method: spawnAgent

```typescript
spawnAgent(params: {
  agentId: string;
  parentId?: string;
  agentType: string;
  description: string;
  tools?: string[];
  role: string;
}): void
```

Registers a new agent node in the tree. Creates the node, adds it to the state map, and updates the parent's `children` array.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `params.agentId` | `string` | - | Unique ID for the new agent |
| `params.parentId` | `string` | `'root'` | ID of the parent agent |
| `params.agentType` | `string` | - | Agent type classification |
| `params.description` | `string` | - | Human-readable description |
| `params.tools` | `string[]` | `[]` | Available tools |
| `params.role` | `string` | - | Agent role |

**Emits:** `agent:spawn` event with payload `{ name, role, parentId }`.

### Method: completeAgent

```typescript
completeAgent(agentId: string, params: {
  status: 'success' | 'error' | 'cancelled';
  result?: string;
  error?: string;
}): void
```

Marks an agent as completed, recording the completion timestamp, duration, result/error, and new status.

| Parameter | Type | Description |
|-----------|------|-------------|
| `agentId` | `string` | ID of the agent to complete |
| `params.status` | `'success' \| 'error' \| 'cancelled'` | Final status |
| `params.result` | `string` | Optional success result |
| `params.error` | `string` | Optional error message |

**Emits:** `agent:idle` event with payload `{ status, result, error, durationMs }`.

### Method: cancelAgent

```typescript
cancelAgent(agentId: string): string[]
```

Cancels an agent and all of its descendants using BFS traversal. Each cancelled agent receives a `completeAgent` call with status `'cancelled'`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `agentId` | `string` | ID of the agent (and subtree) to cancel |

**Returns:** `string[]` -- Array of all cancelled agent IDs.

**Algorithm:** Breadth-first search starting from the given agent, skipping agents already in `cancelled` status.

### Method: getAgent

```typescript
getAgent(agentId: string): AgentNode | undefined
```

Retrieves an agent node by ID.

**Returns:** `AgentNode | undefined`

### Method: getRunningAgents

```typescript
getRunningAgents(): AgentNode[]
```

Returns all agents with status `'running'` or `'waiting'`.

**Returns:** `AgentNode[]`

### Method: getTreeSnapshot

```typescript
getTreeSnapshot(): {
  rootAgentId: string;
  agents: Record<string, AgentNode>;
  summary: { total: number; running: number; completed: number; errored: number; cancelled: number };
}
```

Produces a serializable (JSON-safe) snapshot of the entire agent tree with summary statistics.

**Returns:** Object containing:

| Property | Type | Description |
|----------|------|-------------|
| `rootAgentId` | `string` | ID of the root node |
| `agents` | `Record<string, AgentNode>` | All nodes as a plain object (not Map) |
| `summary.total` | `number` | Total number of agent nodes |
| `summary.running` | `number` | Agents in `running` or `waiting` status |
| `summary.completed` | `number` | Agents in `success` status |
| `summary.errored` | `number` | Agents in `error` status |
| `summary.cancelled` | `number` | Agents in `cancelled` status |

---

## Exported Members

| Export | Kind | Description |
|--------|------|-------------|
| `AgentStatus` | Type alias | Agent lifecycle status union |
| `AgentOutputType` | Type alias | Output classification union |
| `AgentNode` | Interface | Tree node structure |
| `AgentOutputEntry` | Interface | Output entry structure |
| `AgentTreeState` | Interface | Full tree state |
| `AgentTracker` | Class | Agent hierarchy tracker |

---

## Usage Example

```typescript
import { AgentTracker } from './AgentTracker.js';

const tracker = new AgentTracker('executor-01');

// Listen for events
tracker.onEvent((event) => console.log(event.type, event.agentId));

// Spawn child agents under root
tracker.spawnAgent({
  agentId: 'agent-1',
  agentType: 'worker',
  description: 'Code analysis agent',
  tools: ['read_file', 'grep_search'],
  role: 'coder',
});

tracker.spawnAgent({
  agentId: 'agent-2',
  parentId: 'agent-1',
  agentType: 'worker',
  description: 'Sub-task agent',
  tools: ['run_in_terminal'],
  role: 'researcher',
});

// Check depth
console.log(tracker.getDepth('agent-2')); // 2

// Complete an agent
tracker.completeAgent('agent-2', { status: 'success', result: 'Done' });

// Cancel a subtree
const cancelled = tracker.cancelAgent('agent-1');

// Get full snapshot
const snapshot = tracker.getTreeSnapshot();
console.log(snapshot.summary);
```
