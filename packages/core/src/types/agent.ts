// ============================================================================
// @web3viz/core — Agent Types
//
// Type definitions for AI agent visualization (SperaxOS integration).
// Models agent tasks, tool calls, sub-agent spawns, and flow traces.
// ============================================================================

import type { GraphNode } from './index';

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
  | 'waiting'
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
  | 'agent:resume'
  // Task lifecycle
  | 'task:queued'
  | 'task:started'
  | 'task:progress'
  | 'task:completed'
  | 'task:failed'
  | 'task:cancelled'
  | 'task:retry'
  // Tool calls
  | 'tool:started'
  | 'tool:streaming'
  | 'tool:completed'
  | 'tool:failed'
  // Sub-agent delegation
  | 'subagent:spawn'
  | 'subagent:result'
  | 'subagent:failed'
  // Reasoning / thinking
  | 'reasoning:start'
  | 'reasoning:update'
  | 'reasoning:end'
  // System
  | 'heartbeat'
  | 'error'
  | 'executor:status';

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

// ---------------------------------------------------------------------------
// Agent-specific graph types
// ---------------------------------------------------------------------------

/** Extended node types for agent visualization */
export type AgentGraphNodeType =
  | 'agent-hub'
  | 'task'
  | 'tool'
  | 'subagent'
  | 'result';

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
