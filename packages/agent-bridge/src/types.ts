// ---------------------------------------------------------------------------
// Standalone types matching @web3viz/core AgentEvent types.
// Kept inline so the bridge has zero monorepo dependencies at runtime.
// ---------------------------------------------------------------------------

export type AgentEventType =
  | 'agent:spawn' | 'agent:idle' | 'agent:shutdown' | 'agent:resume'
  | 'task:queued' | 'task:started' | 'task:progress' | 'task:completed' | 'task:failed' | 'task:cancelled' | 'task:retry'
  | 'tool:started' | 'tool:streaming' | 'tool:completed' | 'tool:failed'
  | 'subagent:spawn' | 'subagent:result' | 'subagent:failed'
  | 'reasoning:start' | 'reasoning:update' | 'reasoning:end'
  | 'heartbeat' | 'error' | 'executor:status';

export type ToolCategory = 'filesystem' | 'search' | 'terminal' | 'network' | 'code' | 'reasoning' | 'other';

export interface AgentEvent {
  eventId: string;
  type: AgentEventType;
  timestamp: number;
  agentId: string;
  taskId?: string;
  callId?: string;
  payload: Record<string, unknown>;
}

/** Callback the adapter uses to push events into the bridge server. */
export type BroadcastFn = (event: AgentEvent) => void;

/** Options forwarded from the CLI to the adapter. */
export interface AdapterOptions {
  /** Push an event to all connected visualization clients. */
  broadcast: BroadcastFn;
  /** Extra CLI args after `--` (forwarded to the agent process). */
  args: string[];
  /** Read from stdin instead of spawning a process. */
  stdin: boolean;
}

/** An adapter is a function that starts reading agent events. */
export type AdapterFn = (options: AdapterOptions) => Promise<void>;
