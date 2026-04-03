# @web3viz/core - Agent Types

## File Path

```
packages/core/src/types/agent.ts
```

## Purpose

Type definitions for AI agent visualization, specifically designed for integration with SperaxOS. This module models the complete lifecycle of autonomous AI agents: their identity, tasks, tool calls, sub-agent spawns, flow traces, executor state, and agent-specific graph node types for visualization.

---

## Module Dependencies

| Import | Source | Description |
|---|---|---|
| `GraphNode` | `./index` | Type-only import of the base `GraphNode` interface. Used as a base for `AgentGraphNode` via `Omit<GraphNode, 'type'>` (line 212). |

No external (npm) dependencies. Pure TypeScript type definitions.

---

## Exported Members

### Agent Identity

#### `AgentIdentity` (interface, lines 14-27)

Describes the identity of an AI agent within the system.

| Property | Type | Required | Description |
|---|---|---|---|
| `agentId` | `string` | **Yes** | Unique agent ID assigned by SperaxOS |
| `name` | `string` | **Yes** | Human-readable agent name |
| `role` | `string` | **Yes** | Agent type/role (e.g., `'coder'`, `'researcher'`, `'planner'`) |
| `address` | `string` | No | Wallet or account address if applicable |
| `parentAgentId` | `string` | No | Parent agent ID if this is a sub-agent (establishes hierarchy) |
| `createdAt` | `number` | **Yes** | Timestamp (ms since epoch) when this agent was first seen |

---

### Task Lifecycle

#### `AgentTaskStatus` (type, lines 33-40)

```ts
export type AgentTaskStatus =
  | 'queued'
  | 'planning'
  | 'in-progress'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

A string literal union representing the lifecycle states of an agent task.

| Value | Description |
|---|---|
| `'queued'` | Task is waiting to be picked up |
| `'planning'` | Agent is planning how to execute the task |
| `'in-progress'` | Task is actively being executed |
| `'waiting'` | Task is blocked, waiting on external input or sub-task |
| `'completed'` | Task finished successfully |
| `'failed'` | Task encountered an error |
| `'cancelled'` | Task was cancelled before completion |

#### `AgentTask` (interface, lines 42-65)

A discrete unit of work assigned to an agent.

| Property | Type | Required | Description |
|---|---|---|---|
| `taskId` | `string` | **Yes** | Unique task identifier |
| `agentId` | `string` | **Yes** | ID of the agent executing this task |
| `description` | `string` | **Yes** | Human-readable task description |
| `status` | `AgentTaskStatus` | **Yes** | Current lifecycle status |
| `parentTaskId` | `string` | No | Parent task ID for sub-tasks (establishes task hierarchy) |
| `priority` | `number` | No | Task priority where `0` is highest priority |
| `createdAt` | `number` | **Yes** | When the task was created (ms since epoch) |
| `startedAt` | `number` | No | When the task started execution |
| `endedAt` | `number` | No | When the task completed or failed |
| `result` | `string` | No | Result summary on successful completion |
| `error` | `string` | No | Error message on failure |

---

### Tool Calls

#### `ToolCallStatus` (type, line 71)

```ts
export type ToolCallStatus = 'started' | 'streaming' | 'completed' | 'failed';
```

| Value | Description |
|---|---|
| `'started'` | Tool call has been initiated |
| `'streaming'` | Tool call is streaming intermediate results |
| `'completed'` | Tool call finished successfully |
| `'failed'` | Tool call encountered an error |

#### `AgentToolCall` (interface, lines 73-96)

Represents a single tool invocation made by an agent during task execution.

| Property | Type | Required | Description |
|---|---|---|---|
| `callId` | `string` | **Yes** | Unique tool call identifier |
| `taskId` | `string` | **Yes** | ID of the task this tool call belongs to |
| `agentId` | `string` | **Yes** | ID of the agent making the call |
| `toolName` | `string` | **Yes** | Tool name (e.g., `'read_file'`, `'grep_search'`, `'run_in_terminal'`) |
| `toolCategory` | `'filesystem' \| 'search' \| 'terminal' \| 'network' \| 'code' \| 'reasoning' \| 'other'` | **Yes** | Tool category for visual grouping in the UI |
| `status` | `ToolCallStatus` | **Yes** | Current call status |
| `inputSummary` | `string` | No | Summary of input parameters (not full content, for display purposes) |
| `outputSummary` | `string` | No | Summary of the output |
| `startedAt` | `number` | **Yes** | When the call started (ms since epoch) |
| `endedAt` | `number` | No | When the call completed |
| `duration` | `number` | No | Total duration in milliseconds |

---

### Agent Events

#### `AgentEventType` (type, lines 102-127)

```ts
export type AgentEventType =
  // Agent lifecycle
  | 'agent:spawn'
  | 'agent:idle'
  | 'agent:shutdown'
  // Task lifecycle
  | 'task:queued'
  | 'task:started'
  | 'task:progress'
  | 'task:completed'
  | 'task:failed'
  // Tool calls
  | 'tool:started'
  | 'tool:streaming'
  | 'tool:completed'
  | 'tool:failed'
  // Sub-agent delegation
  | 'subagent:spawn'
  | 'subagent:result'
  // Reasoning / thinking
  | 'reasoning:start'
  | 'reasoning:update'
  | 'reasoning:end'
  // System
  | 'heartbeat'
  | 'error';
```

A string literal union of all possible event types in the agent WebSocket event stream. Events are namespaced by domain using a colon separator.

| Namespace | Events | Description |
|---|---|---|
| `agent:*` | `spawn`, `idle`, `shutdown` | Agent lifecycle events |
| `task:*` | `queued`, `started`, `progress`, `completed`, `failed` | Task lifecycle events |
| `tool:*` | `started`, `streaming`, `completed`, `failed` | Tool call events |
| `subagent:*` | `spawn`, `result` | Sub-agent delegation events |
| `reasoning:*` | `start`, `update`, `end` | Reasoning/thinking step events |
| *(system)* | `heartbeat`, `error` | System-level events |

#### `AgentEvent` (interface, lines 129-144)

A single event emitted by an agent over the WebSocket stream.

| Property | Type | Required | Description |
|---|---|---|---|
| `eventId` | `string` | **Yes** | Unique event identifier |
| `type` | `AgentEventType` | **Yes** | Event type discriminant |
| `timestamp` | `number` | **Yes** | Timestamp (ms since epoch) |
| `agentId` | `string` | **Yes** | ID of the agent that emitted this event |
| `taskId` | `string` | No | Associated task ID (if the event relates to a task) |
| `callId` | `string` | No | Associated tool call ID (if the event relates to a tool call) |
| `payload` | `Record<string, unknown>` | **Yes** | Event-specific payload (structure varies by event type) |

---

### Agent Flow Trace

#### `AgentFlowTrace` (interface, lines 150-173)

An aggregated, chronological view of an agent's entire activity during a session. Combines identity, tasks, tool calls, events, and sub-agents into a single structure.

| Property | Type | Required | Description |
|---|---|---|---|
| `flowId` | `string` | **Yes** | Unique flow trace identifier |
| `agent` | `AgentIdentity` | **Yes** | The agent's identity |
| `tasks` | `AgentTask[]` | **Yes** | All tasks in this flow |
| `toolCalls` | `AgentToolCall[]` | **Yes** | All tool calls made |
| `events` | `AgentEvent[]` | **Yes** | All events in chronological order |
| `subAgents` | `AgentIdentity[]` | **Yes** | All sub-agents spawned during this flow |
| `status` | `'active' \| 'idle' \| 'completed' \| 'failed'` | **Yes** | Overall flow status |
| `startedAt` | `number` | **Yes** | When the flow started (ms since epoch) |
| `endedAt` | `number` | No | When the flow ended (if applicable) |
| `totalToolCalls` | `number` | **Yes** | Aggregate count of tool calls |
| `totalTasksCompleted` | `number` | **Yes** | Aggregate count of completed tasks |

---

### Executor State

#### `ExecutorStatus` (type, line 179)

```ts
export type ExecutorStatus = 'running' | 'paused' | 'stopped' | 'error';
```

| Value | Description |
|---|---|
| `'running'` | Executor is actively processing tasks |
| `'paused'` | Executor is temporarily paused |
| `'stopped'` | Executor has been shut down |
| `'error'` | Executor encountered a fatal error |

#### `ExecutorState` (interface, lines 181-198)

State of the 24/7 autonomous executor process that manages multiple agents.

| Property | Type | Required | Description |
|---|---|---|---|
| `executorId` | `string` | **Yes** | Unique executor identifier |
| `status` | `ExecutorStatus` | **Yes** | Current executor status |
| `activeAgents` | `AgentIdentity[]` | **Yes** | List of currently active agents |
| `uptime` | `number` | **Yes** | Uptime in milliseconds |
| `totalTasksProcessed` | `number` | **Yes** | Total tasks processed since start |
| `totalToolCalls` | `number` | **Yes** | Total tool calls since start |
| `lastHeartbeat` | `number` | **Yes** | Timestamp of last heartbeat (ms since epoch) |
| `error` | `string` | No | Error message if status is `'error'` |

---

### Agent-Specific Graph Types

#### `AgentGraphNodeType` (type, lines 205-210)

```ts
export type AgentGraphNodeType =
  | 'agent-hub'
  | 'task'
  | 'tool'
  | 'subagent'
  | 'result';
```

Extended node types for agent-specific graph visualization.

| Value | Description |
|---|---|
| `'agent-hub'` | Central node representing the agent itself |
| `'task'` | Node representing a task |
| `'tool'` | Node representing a tool call |
| `'subagent'` | Node representing a spawned sub-agent |
| `'result'` | Node representing a task result |

#### `AgentGraphNode` (interface, lines 212-222)

Extended graph node for agent visualization. Extends `GraphNode` (with the `type` property replaced by `AgentGraphNodeType`) and adds agent-specific fields.

```ts
export interface AgentGraphNode extends Omit<GraphNode, 'type'> {
  type: AgentGraphNodeType;
  agentId: string;
  taskId?: string;
  stage: 'idle' | 'active' | 'pulsing' | 'fading' | 'complete' | 'error';
  intensity: number;
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| *(inherits all `GraphNode` properties except `type`)* | | | |
| `type` | `AgentGraphNodeType` | **Yes** | Overrides `GraphNode.type` with agent-specific node types |
| `agentId` | `string` | **Yes** | ID of the agent that owns this node |
| `taskId` | `string` | No | Task ID if this is a task or tool node |
| `stage` | `'idle' \| 'active' \| 'pulsing' \| 'fading' \| 'complete' \| 'error'` | **Yes** | Visual animation stage for the node |
| `intensity` | `number` | **Yes** | Intensity for glow/pulse visual effects, range `0` to `1` |

---

## Usage Example

```ts
import type {
  AgentIdentity,
  AgentTask,
  AgentEvent,
  AgentFlowTrace,
  ExecutorState,
  AgentGraphNode,
} from '@web3viz/core';

// Define an agent identity
const agent: AgentIdentity = {
  agentId: 'agent-001',
  name: 'Research Bot',
  role: 'researcher',
  createdAt: Date.now(),
};

// Create a task
const task: AgentTask = {
  taskId: 'task-001',
  agentId: agent.agentId,
  description: 'Analyze token price trends',
  status: 'in-progress',
  createdAt: Date.now(),
  startedAt: Date.now(),
};

// Create a graph node for the agent
const node: AgentGraphNode = {
  id: 'node-agent-001',
  type: 'agent-hub',
  label: agent.name,
  radius: 1.5,
  color: '#f472b6',
  agentId: agent.agentId,
  stage: 'active',
  intensity: 0.8,
};
```
