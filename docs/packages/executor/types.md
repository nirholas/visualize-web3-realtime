# types.ts - Type Definitions

**File Path:** `packages/executor/src/types.ts`

**Purpose:** Central type definition module for the executor package. Re-exports shared types from the `@web3viz/core` package and defines executor-specific interfaces for task definitions, agent spawning, health checks, configuration, and WebSocket broadcast messages.

---

## Module Dependencies

| Import | Source | Description |
|--------|--------|-------------|
| `AgentIdentity` | `@web3viz/core` | Type import for agent identity structure |
| `AgentTask` | `@web3viz/core` | Type import for agent task structure |
| `AgentEvent` | `@web3viz/core` | Type import for agent event structure |
| `ExecutorState` | `@web3viz/core` | Type import for executor state structure |

---

## Line-by-Line Documentation

### Lines 1-6: Core Type Imports

```typescript
import type {
  AgentIdentity,
  AgentTask,
  AgentEvent,
  ExecutorState,
} from '@web3viz/core';
```

Imports four type-only references from the shared `@web3viz/core` package. These are used as building blocks in the executor-specific types defined below.

### Lines 9-19: Re-Exports from Core

```typescript
export type {
  AgentIdentity,
  AgentTask,
  AgentTaskStatus,
  AgentToolCall,
  AgentEvent,
  AgentEventType,
  AgentFlowTrace,
  ExecutorState,
  ExecutorStatus,
} from '@web3viz/core';
```

Re-exports the following types so that consumers within the executor package can import from `./types.js` instead of referencing `@web3viz/core` directly:

| Type | Description |
|------|-------------|
| `AgentIdentity` | Agent identification (id, name, role, createdAt, address, parentAgentId) |
| `AgentTask` | Task structure (taskId, agentId, description, status, priority, timestamps, result, error) |
| `AgentTaskStatus` | Union type for task status values |
| `AgentToolCall` | Structure for tool invocation records |
| `AgentEvent` | Event payload (eventId, type, timestamp, agentId, taskId, callId, payload) |
| `AgentEventType` | Union type for event type strings |
| `AgentFlowTrace` | Trace data for agent flow visualization |
| `ExecutorState` | Full executor state snapshot |
| `ExecutorStatus` | Union type for executor status values |

### Lines 25-32: TaskDefinition Interface

```typescript
export interface TaskDefinition {
  description: string;
  priority?: number;
  requiredRole?: string;
  timeout?: number;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}
```

Defines the shape of a task submission before it becomes an `AgentTask`.

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `description` | `string` | Yes | - | Human-readable description of the task |
| `priority` | `number` | No | `5` (set in TaskQueue) | Priority level; lower numbers = higher priority |
| `requiredRole` | `string` | No | `undefined` | If set, only agents with this role can execute the task |
| `timeout` | `number` | No | `60000` (set in TaskQueue) | Maximum execution time in milliseconds before the task is considered stalled |
| `retryCount` | `number` | No | `1` (set in TaskQueue) | Maximum number of retry attempts on failure |
| `metadata` | `Record<string, unknown>` | No | `undefined` | Arbitrary key-value metadata attached to the task |

### Lines 34-37: AgentSpawnConfig Interface

```typescript
export interface AgentSpawnConfig {
  role: string;
  name?: string;
}
```

Configuration for spawning a new agent.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `role` | `string` | Yes | The agent's role (e.g., `'coder'`, `'researcher'`, `'planner'`) |
| `name` | `string` | No | Optional display name for the agent |

### Lines 39-44: HealthCheck Interface

```typescript
export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  timestamp: number;
}
```

Result of a single health check evaluation.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Identifier for the health check (e.g., `'speraxos'`, `'queue'`, `'agents'`) |
| `status` | `'pass' \| 'warn' \| 'fail'` | Check result status |
| `message` | `string` | Human-readable status message |
| `timestamp` | `number` | Unix epoch milliseconds when the check was performed |

### Lines 46-54: ExecutorConfig Interface

```typescript
export interface ExecutorConfig {
  port: number;
  speraxosUrl: string;
  speraxosApiKey: string;
  maxAgents: number;
  taskPollInterval: number;
  heartbeatInterval: number;
  statePath: string;
}
```

Full configuration object for the executor server.

| Property | Type | Description |
|----------|------|-------------|
| `port` | `number` | HTTP/WebSocket server listen port |
| `speraxosUrl` | `string` | Base URL for SperaxOS API |
| `speraxosApiKey` | `string` | API key for SperaxOS; empty string triggers mock mode |
| `maxAgents` | `number` | Maximum number of concurrent agents allowed |
| `taskPollInterval` | `number` | Milliseconds between task processing cycles |
| `heartbeatInterval` | `number` | Milliseconds between heartbeat broadcasts |
| `statePath` | `string` | File system path for the SQLite state database |

### Lines 56-63: SnapshotMessage Interface

```typescript
export interface SnapshotMessage {
  type: 'snapshot';
  data: {
    agents: AgentIdentity[];
    tasks: AgentTask[];
    recentEvents: AgentEvent[];
  };
}
```

WebSocket message sent to clients on initial connection, containing the full current state.

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'snapshot'` | Discriminant literal for message type |
| `data.agents` | `AgentIdentity[]` | All currently active agents |
| `data.tasks` | `AgentTask[]` | All tasks (queued, in-progress, recent completed/failed) |
| `data.recentEvents` | `AgentEvent[]` | Last 50 events for replay |

### Lines 65-68: EventMessage Interface

```typescript
export interface EventMessage {
  type: 'event';
  data: AgentEvent;
}
```

WebSocket message wrapping a single real-time agent event.

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'event'` | Discriminant literal |
| `data` | `AgentEvent` | The event payload |

### Lines 70-73: HeartbeatMessage Interface

```typescript
export interface HeartbeatMessage {
  type: 'heartbeat';
  data: ExecutorState;
}
```

WebSocket message containing periodic executor state snapshot.

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'heartbeat'` | Discriminant literal |
| `data` | `ExecutorState` | Full executor state including uptime, agent count, processed task count |

### Line 75: BroadcastMessage Union Type

```typescript
export type BroadcastMessage = SnapshotMessage | EventMessage | HeartbeatMessage;
```

Discriminated union of all possible WebSocket messages. Clients can switch on the `type` field to handle each message kind.

---

## Exported Members

| Export | Kind | Description |
|--------|------|-------------|
| `AgentIdentity` | Type (re-export) | Agent identity from core |
| `AgentTask` | Type (re-export) | Task structure from core |
| `AgentTaskStatus` | Type (re-export) | Task status union from core |
| `AgentToolCall` | Type (re-export) | Tool call record from core |
| `AgentEvent` | Type (re-export) | Event payload from core |
| `AgentEventType` | Type (re-export) | Event type union from core |
| `AgentFlowTrace` | Type (re-export) | Flow trace from core |
| `ExecutorState` | Type (re-export) | Executor state from core |
| `ExecutorStatus` | Type (re-export) | Executor status union from core |
| `TaskDefinition` | Interface | Task submission definition |
| `AgentSpawnConfig` | Interface | Agent spawn parameters |
| `HealthCheck` | Interface | Health check result |
| `ExecutorConfig` | Interface | Server configuration |
| `SnapshotMessage` | Interface | WebSocket snapshot message |
| `EventMessage` | Interface | WebSocket event message |
| `HeartbeatMessage` | Interface | WebSocket heartbeat message |
| `BroadcastMessage` | Type alias | Union of all WebSocket messages |

---

## Usage Example

```typescript
import type { ExecutorConfig, TaskDefinition, BroadcastMessage } from './types.js';

const config: ExecutorConfig = {
  port: 8765,
  speraxosUrl: 'https://api.speraxos.io',
  speraxosApiKey: '',
  maxAgents: 5,
  taskPollInterval: 1000,
  heartbeatInterval: 30000,
  statePath: './data/executor.db',
};

const task: TaskDefinition = {
  description: 'Analyze smart contract',
  priority: 1,
  requiredRole: 'coder',
  timeout: 120000,
  retryCount: 3,
};

// Handling WebSocket messages
function handleMessage(msg: BroadcastMessage) {
  switch (msg.type) {
    case 'snapshot': console.log('Agents:', msg.data.agents); break;
    case 'event': console.log('Event:', msg.data.type); break;
    case 'heartbeat': console.log('Uptime:', msg.data.uptime); break;
  }
}
```
