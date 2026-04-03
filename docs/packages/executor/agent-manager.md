# AgentManager.ts - Agent Lifecycle and Task Execution Manager

**File Path:** `packages/executor/src/AgentManager.ts`

**Purpose:** Manages the full lifecycle of agents -- spawning, task assignment, simulated task execution (with tool calls), shutdown, and auto-scaling. Emits `AgentEvent` objects via a listener pattern for downstream consumption by the `EventBroadcaster` and `StateStore`.

---

## Module Dependencies

| Import | Source | Type | Description |
|--------|--------|------|-------------|
| `AgentIdentity` | `./types.js` | Type | Agent identity structure |
| `AgentTask` | `./types.js` | Type | Task structure |
| `AgentEvent` | `./types.js` | Type | Event payload structure |
| `AgentSpawnConfig` | `./types.js` | Type | Spawn configuration |
| `SperaxOSClient` | `./SperaxOSClient.js` | Class | Client for SperaxOS API (or mock) |

---

## Line-by-Line Documentation

### Lines 5-7: Mock Constants

```typescript
const MOCK_TOOL_NAMES = ['read_file', 'grep_search', 'run_in_terminal', 'semantic_search', 'create_file'];
const MOCK_CATEGORIES = ['filesystem', 'search', 'terminal', 'search', 'filesystem'] as const;
const DEFAULT_AGENT_ROLES = ['coder', 'researcher', 'planner'];
```

| Constant | Type | Description |
|----------|------|-------------|
| `MOCK_TOOL_NAMES` | `string[]` | Tool names used in simulated task execution. Each corresponds positionally to `MOCK_CATEGORIES`. |
| `MOCK_CATEGORIES` | `readonly ['filesystem', 'search', 'terminal', 'search', 'filesystem']` | Tool categories for mock tool calls, indexed same as `MOCK_TOOL_NAMES`. |
| `DEFAULT_AGENT_ROLES` | `string[]` | Default role rotation sequence for auto-scaling. |

### Lines 9-10: Utility Functions

```typescript
let _callId = 0;
function uid(): string { return `call_${Date.now()}_${++_callId}`; }
```

`_callId`: Module-scoped counter for generating unique call IDs. Monotonically incremented.

`uid()`: Generates a unique identifier string in the format `call_{timestamp}_{counter}`. Used for tool call event IDs.

### Line 12: randomFrom Helper

```typescript
function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
```

Generic utility that returns a random element from an array. Note: defined but currently unused in the module.

### Lines 14-19: AgentState Interface (Private)

```typescript
interface AgentState {
  identity: AgentIdentity;
  status: 'idle' | 'busy';
  currentTaskId: string | null;
  idleSince: number | null;
}
```

Internal state tracker for each managed agent. Not exported.

| Property | Type | Description |
|----------|------|-------------|
| `identity` | `AgentIdentity` | The agent's identity (id, name, role, etc.) |
| `status` | `'idle' \| 'busy'` | Current activity state |
| `currentTaskId` | `string \| null` | ID of the task currently being executed, or null |
| `idleSince` | `number \| null` | Timestamp when the agent became idle; used for auto-scaling retirement |

---

## Class: AgentManager

```typescript
export class AgentManager
```

### Properties

| Property | Visibility | Type | Description |
|----------|-----------|------|-------------|
| `agents` | `private` | `Map<string, AgentState>` | Maps agent IDs to their internal state |
| `eventListeners` | `private` | `Set<(event: AgentEvent) => void>` | Set of registered event callback functions |
| `client` | `private readonly` | `SperaxOSClient` | Injected SperaxOS client (constructor parameter) |

### Constructor

```typescript
constructor(private readonly client: SperaxOSClient)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `client` | `SperaxOSClient` | The SperaxOS API client used for agent spawning |

### Method: onEvent

```typescript
onEvent(callback: (event: AgentEvent) => void): () => void
```

Registers an event listener callback. Returns an unsubscribe function that removes the listener when called.

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `(event: AgentEvent) => void` | Function to call when an event is emitted |

**Returns:** `() => void` -- Unsubscribe function.

### Method: emit (private)

```typescript
private emit(event: AgentEvent): void
```

Iterates over all registered event listeners and invokes each with the given event.

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `AgentEvent` | The event to broadcast to listeners |

### Method: spawnAgent

```typescript
async spawnAgent(config: AgentSpawnConfig): Promise<AgentIdentity>
```

Spawns a new agent via the SperaxOS client. Registers the agent internally with `idle` status and emits an `agent:spawn` event.

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `AgentSpawnConfig` | Role and optional name for the new agent |

**Returns:** `Promise<AgentIdentity>` -- The identity of the newly spawned agent.

**Emits:** `agent:spawn` event with payload `{ name, role }`.

### Method: assignTask

```typescript
async assignTask(task: AgentTask): Promise<void>
```

Assigns a task to the agent specified by `task.agentId`. Sets the agent status to `busy`, emits a `task:started` event, and begins simulated task execution.

| Parameter | Type | Description |
|-----------|------|-------------|
| `task` | `AgentTask` | The task to assign, must have `agentId` set |

**Emits:** `task:started` event with payload `{ description, priority }`.

**Side Effects:** Calls `simulateTaskExecution()` which runs asynchronously.

### Method: simulateTaskExecution (private)

```typescript
private async simulateTaskExecution(task: AgentTask, agent: AgentState): Promise<void>
```

Simulates the full lifecycle of a task execution with random tool calls. This is the mock execution engine.

**Execution Flow:**
1. Determines random tool call count (2-6 calls)
2. Determines if the task will fail (10% chance)
3. For each tool call:
   - Waits 500-2000ms (simulated execution time)
   - Emits `tool:started` event with tool name, category, and input summary
   - Waits 100-500ms (simulated tool execution)
   - Emits `tool:completed` event with output summary
4. Waits 200ms
5. Emits either `task:failed` (10% chance) or `task:completed`
6. Resets agent status to `idle`

**Events Emitted (per execution):**
- `tool:started` -- For each simulated tool call
- `tool:completed` -- For each simulated tool call
- `task:completed` or `task:failed` -- Final task outcome

### Method: getAvailableAgent

```typescript
getAvailableAgent(role?: string): AgentIdentity | null
```

Finds the first idle agent, optionally filtered by role.

| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | `string \| undefined` | If provided, only match agents with this role |

**Returns:** `AgentIdentity | null` -- The identity of an available agent, or null if none found.

### Method: shutdownAgent

```typescript
async shutdownAgent(agentId: string): Promise<void>
```

Removes an agent from the internal registry and emits an `agent:shutdown` event.

| Parameter | Type | Description |
|-----------|------|-------------|
| `agentId` | `string` | ID of the agent to shut down |

**Emits:** `agent:shutdown` event.

### Method: getActiveAgents

```typescript
getActiveAgents(): AgentIdentity[]
```

**Returns:** `AgentIdentity[]` -- Array of all currently registered agent identities.

### Method: getAgentCount

```typescript
getAgentCount(): number
```

**Returns:** `number` -- Total number of registered agents (idle + busy).

### Method: getBusyCount

```typescript
getBusyCount(): number
```

**Returns:** `number` -- Number of agents currently in `busy` status.

### Method: autoScale

```typescript
async autoScale(queueDepth: number, maxAgents: number, roleSequence?: string[]): Promise<void>
```

Automatically scales the agent pool based on queue demand:

**Scale Up Logic:**
- If `queueDepth > 0` AND all agents are busy AND total agents < `maxAgents`, spawn a new agent
- The new agent's role is selected by cycling through `roleSequence` using modulo indexing

**Scale Down Logic:**
- Agents idle for more than 5 minutes (`5 * 60_000` ms) are retired
- At least 1 agent is always kept alive

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `queueDepth` | `number` | - | Number of tasks currently queued |
| `maxAgents` | `number` | - | Maximum allowed agent count |
| `roleSequence` | `string[]` | `DEFAULT_AGENT_ROLES` | Roles to cycle through when spawning |

---

## Exported Members

| Export | Kind | Description |
|--------|------|-------------|
| `AgentManager` | Class | Agent lifecycle and task execution manager |

---

## Usage Example

```typescript
import { AgentManager } from './AgentManager.js';
import { SperaxOSClient } from './SperaxOSClient.js';

const client = new SperaxOSClient('https://api.speraxos.io', '');
const manager = new AgentManager(client);

// Listen for events
const unsub = manager.onEvent((event) => {
  console.log('Event:', event.type, event.agentId);
});

// Spawn an agent
const agent = await manager.spawnAgent({ role: 'coder', name: 'CoderAgent' });

// Assign a task
await manager.assignTask({
  taskId: 'task_1',
  agentId: agent.agentId,
  description: 'Analyze contract',
  status: 'in-progress',
  priority: 1,
  createdAt: Date.now(),
});

// Auto-scale
await manager.autoScale(5, 10);

// Cleanup
unsub();
```
