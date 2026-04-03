# Task 12: Agent Event Type System

## Context
We're extending the Web3 visualization to show real-time AI agent activity from SperaxOS. Before connecting to the API or building visuals, we need a comprehensive type system that models agent tasks, tool calls, sub-agent spawns, and flow traces. This builds on the existing `@web3viz/core` type system which already has `GraphNode`, `GraphEdge`, `DataProviderEvent`, and the `RawEvent` union.

The existing X402Flow types in `features/X402Flow/types.ts` model a simpler payment-oriented agent flow. The new system must model general-purpose autonomous agents that:
- Receive prompts and plan tasks
- Call tools (search, read files, write files, run commands, call APIs)
- Spawn sub-agents for delegated work
- Produce results and iterate
- Run continuously (24/7 executor)

## What to Build

### 1. Core Agent Types (`packages/core/src/types/agent.ts` — NEW)

```typescript
// ---------------------------------------------------------------------------
// Agent identity
// ---------------------------------------------------------------------------

export interface AgentIdentity {
  /** Unique agent ID (from SperaxOS) */
  agentId: string;
  /** Human-readable agent name */
  name: string;
  /** Agent type/role (e.g. 'coder', 'researcher', 'planner') */
  role: string;
  /** Wallet/account address if applicable */
  address?: string;
  /** Parent agent ID if this is a sub-agent */
  parentAgentId?: string;
  /** When this agent was first seen */
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Task lifecycle
// ---------------------------------------------------------------------------

export type AgentTaskStatus =
  | 'queued'
  | 'planning'
  | 'in-progress'
  | 'waiting'      // waiting for sub-agent or external input
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentTask {
  /** Unique task ID */
  taskId: string;
  /** Agent executing this task */
  agentId: string;
  /** Human-readable task description */
  description: string;
  /** Current status */
  status: AgentTaskStatus;
  /** Parent task ID (for sub-tasks) */
  parentTaskId?: string;
  /** Task priority (0 = highest) */
  priority?: number;
  /** When the task was created */
  createdAt: number;
  /** When the task started execution */
  startedAt?: number;
  /** When the task completed/failed */
  endedAt?: number;
  /** Result summary (on completion) */
  result?: string;
  /** Error message (on failure) */
  error?: string;
}

// ---------------------------------------------------------------------------
// Tool calls
// ---------------------------------------------------------------------------

export type ToolCallStatus = 'started' | 'streaming' | 'completed' | 'failed';

export interface AgentToolCall {
  /** Unique tool call ID */
  callId: string;
  /** Task this tool call belongs to */
  taskId: string;
  /** Agent making the call */
  agentId: string;
  /** Tool name (e.g. 'read_file', 'grep_search', 'run_in_terminal') */
  toolName: string;
  /** Tool category for visual grouping */
  toolCategory: 'filesystem' | 'search' | 'terminal' | 'network' | 'code' | 'reasoning' | 'other';
  /** Call status */
  status: ToolCallStatus;
  /** Input parameters (summary, not full content) */
  inputSummary?: string;
  /** Output summary */
  outputSummary?: string;
  /** When the call started */
  startedAt: number;
  /** When the call completed */
  endedAt?: number;
  /** Duration in ms */
  duration?: number;
}

// ---------------------------------------------------------------------------
// Agent events (the WebSocket event stream)
// ---------------------------------------------------------------------------

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

export interface AgentEvent {
  /** Unique event ID */
  eventId: string;
  /** Event type */
  type: AgentEventType;
  /** Timestamp (ms since epoch) */
  timestamp: number;
  /** Which agent emitted this event */
  agentId: string;
  /** Associated task ID (if applicable) */
  taskId?: string;
  /** Associated tool call ID (if applicable) */
  callId?: string;
  /** Event-specific payload */
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Agent flow trace (aggregated view of an agent's activity)
// ---------------------------------------------------------------------------

export interface AgentFlowTrace {
  /** Flow trace ID */
  flowId: string;
  /** The agent's identity */
  agent: AgentIdentity;
  /** All tasks in this flow */
  tasks: AgentTask[];
  /** All tool calls made */
  toolCalls: AgentToolCall[];
  /** All events in chronological order */
  events: AgentEvent[];
  /** All sub-agents spawned */
  subAgents: AgentIdentity[];
  /** Flow status */
  status: 'active' | 'idle' | 'completed' | 'failed';
  /** When the flow started */
  startedAt: number;
  /** When the flow ended (if applicable) */
  endedAt?: number;
  /** Total tool calls made */
  totalToolCalls: number;
  /** Total tasks completed */
  totalTasksCompleted: number;
}

// ---------------------------------------------------------------------------
// Executor state (for the 24/7 autonomous executor)
// ---------------------------------------------------------------------------

export type ExecutorStatus = 'running' | 'paused' | 'stopped' | 'error';

export interface ExecutorState {
  /** Executor ID */
  executorId: string;
  /** Current status */
  status: ExecutorStatus;
  /** List of active agents */
  activeAgents: AgentIdentity[];
  /** Uptime in ms */
  uptime: number;
  /** Total tasks processed since start */
  totalTasksProcessed: number;
  /** Total tool calls since start */
  totalToolCalls: number;
  /** Last heartbeat timestamp */
  lastHeartbeat: number;
  /** Error message if status is 'error' */
  error?: string;
}
```

### 2. Agent-Specific Graph Types

Add to the existing `GraphNode` type system to support agent visualization nodes:

```typescript
// In packages/core/src/types/agent.ts or extend types/index.ts

/** Extended node types for agent visualization */
export type AgentGraphNodeType =
  | 'agent-hub'     // The agent itself (large node)
  | 'task'          // A task being executed
  | 'tool'          // A tool call node
  | 'subagent'      // A spawned sub-agent
  | 'result';       // A completed result

export interface AgentGraphNode extends Omit<GraphNode, 'type'> {
  type: AgentGraphNodeType;
  /** Agent ID that owns this node */
  agentId: string;
  /** Task ID if this is a task/tool node */
  taskId?: string;
  /** Visual stage for animation */
  stage: 'idle' | 'active' | 'pulsing' | 'fading' | 'complete' | 'error';
  /** Intensity for glow/pulse effects (0-1) */
  intensity: number;
}
```

### 3. Agent Categories

Add new categories to `packages/core/src/categories/index.ts`:

```typescript
// New agent categories to add to CATEGORY_CONFIGS
{ id: 'agentSpawn', label: 'Agent Spawns', icon: '⬡', color: '#c084fc', sourceId: 'agents' },
{ id: 'agentTask', label: 'Tasks', icon: '▶', color: '#a78bfa', sourceId: 'agents' },
{ id: 'toolCall', label: 'Tool Calls', icon: '⚡', color: '#60a5fa', sourceId: 'agents' },
{ id: 'subagentSpawn', label: 'Sub-agents', icon: '◆', color: '#f472b6', sourceId: 'agents' },
{ id: 'reasoning', label: 'Reasoning', icon: '◎', color: '#fbbf24', sourceId: 'agents' },
{ id: 'taskComplete', label: 'Completions', icon: '✓', color: '#34d399', sourceId: 'agents' },
{ id: 'taskFailed', label: 'Failures', icon: '✗', color: '#f87171', sourceId: 'agents' },
```

### 4. Extend RawEvent Union

Add agent events to the `RawEvent` discriminated union in `packages/core/src/types/index.ts`:

```typescript
export type RawEvent =
  | { type: 'tokenCreate'; data: Token }
  | { type: 'trade'; data: Trade }
  | { type: 'claim'; data: Claim }
  | { type: 'agentEvent'; data: AgentEvent };  // NEW
```

### 5. Re-export from Package Index

Update `packages/core/src/index.ts` to export the new agent types:

```typescript
export * from './types/agent';
```

## Files to Create
- `packages/core/src/types/agent.ts` — **NEW** All agent type definitions

## Files to Modify
- `packages/core/src/types/index.ts` — Add `agentEvent` to `RawEvent` union
- `packages/core/src/categories/index.ts` — Add agent categories to `CATEGORY_CONFIGS` and to `CATEGORIES` array
- `packages/core/src/index.ts` — Re-export agent types

## Acceptance Criteria
- [ ] All agent types compile without errors
- [ ] `AgentEvent` type covers all event types from SperaxOS
- [ ] `AgentFlowTrace` can represent a full agent execution history
- [ ] `AgentGraphNode` extends the visual system for agent-specific rendering
- [ ] New agent categories appear in the category config map
- [ ] `RawEvent` union includes agent events
- [ ] All types are exported from `@web3viz/core`
- [ ] `npx next build` passes without type errors
