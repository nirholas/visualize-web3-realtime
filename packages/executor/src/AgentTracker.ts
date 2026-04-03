import type { AgentIdentity, AgentEvent } from './types.js';

export type AgentStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting' | 'cancelled';
export type AgentOutputType = 'text' | 'tool_call' | 'tool_result';

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

export interface AgentOutputEntry {
  outputType: AgentOutputType;
  content: string;
  toolName?: string;
  toolUseId?: string;
  timestamp: number;
}

export interface AgentTreeState {
  rootAgentId: string;
  agents: Map<string, AgentNode>;
}

/**
 * Tracks the hierarchy and state of agents in the executor.
 * Emits events via callback for integration with EventBroadcaster.
 */
export class AgentTracker {
  private state: AgentTreeState;
  private eventListeners = new Set<(event: AgentEvent) => void>();
  private executorId: string;

  constructor(executorId: string) {
    this.executorId = executorId;
    this.state = {
      rootAgentId: 'root',
      agents: new Map(),
    };

    // Create root node
    this.state.agents.set('root', {
      agentId: 'root',
      parentId: '',
      agentType: 'root',
      description: 'Executor root',
      status: 'running',
      tools: [],
      role: 'executor',
      startedAt: Date.now(),
      children: [],
      totalToolUses: 0,
    });
  }

  onEvent(callback: (event: AgentEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  private emit(event: AgentEvent): void {
    for (const fn of this.eventListeners) fn(event);
  }

  /** Compute the depth of an agent in the tree (root = 0). */
  getDepth(agentId: string): number {
    let depth = 0;
    let current = this.state.agents.get(agentId);
    while (current && current.parentId && current.parentId !== '') {
      depth++;
      current = this.state.agents.get(current.parentId);
    }
    return depth;
  }

  /** Register a new agent spawn. */
  spawnAgent(params: {
    agentId: string;
    parentId?: string;
    agentType: string;
    description: string;
    tools?: string[];
    role: string;
  }): void {
    const { agentId, parentId = 'root', agentType, description, tools = [], role } = params;

    const node: AgentNode = {
      agentId,
      parentId,
      agentType,
      description,
      status: 'idle',
      tools,
      role,
      startedAt: Date.now(),
      children: [],
      totalToolUses: 0,
    };

    this.state.agents.set(agentId, node);

    const parent = this.state.agents.get(parentId);
    if (parent) {
      parent.children.push(agentId);
    }

    this.emit({
      eventId: `evt_spawn_${agentId}`,
      type: 'agent:spawn',
      timestamp: Date.now(),
      agentId,
      payload: { name: description, role, parentId },
    });
  }

  /** Mark an agent as completed. */
  completeAgent(agentId: string, params: { status: 'success' | 'error' | 'cancelled'; result?: string; error?: string }): void {
    const agent = this.state.agents.get(agentId);
    if (!agent) return;

    const now = Date.now();
    agent.status = params.status;
    agent.completedAt = now;
    agent.durationMs = now - agent.startedAt;
    agent.result = params.result;
    agent.error = params.error;

    this.emit({
      eventId: `evt_complete_${agentId}`,
      type: 'agent:idle',
      timestamp: now,
      agentId,
      payload: { status: params.status, result: params.result, error: params.error, durationMs: agent.durationMs },
    });
  }

  /** Cancel an agent and its descendants. */
  cancelAgent(agentId: string): string[] {
    const cancelled: string[] = [];
    const queue = [agentId];

    while (queue.length > 0) {
      const id = queue.shift()!;
      const agent = this.state.agents.get(id);
      if (!agent || agent.status === 'cancelled') continue;

      this.completeAgent(id, { status: 'cancelled', result: 'Cancelled by executor' });
      cancelled.push(id);
      queue.push(...agent.children);
    }

    return cancelled;
  }

  /** Get an agent node by ID. */
  getAgent(agentId: string): AgentNode | undefined {
    return this.state.agents.get(agentId);
  }

  /** Get all running agents. */
  getRunningAgents(): AgentNode[] {
    const running: AgentNode[] = [];
    for (const agent of this.state.agents.values()) {
      if (agent.status === 'running' || agent.status === 'waiting') {
        running.push(agent);
      }
    }
    return running;
  }

  /** Get a serializable snapshot of the full agent tree. */
  getTreeSnapshot() {
    const agents: Record<string, AgentNode> = {};
    let running = 0;
    let completed = 0;
    let errored = 0;
    let cancelled = 0;

    for (const [id, node] of this.state.agents) {
      agents[id] = node;
      if (node.status === 'running' || node.status === 'waiting') {
        running++;
      } else if (node.status === 'success') {
        completed++;
      } else if (node.status === 'error') {
        errored++;
      } else if (node.status === 'cancelled') {
        cancelled++;
      }
    }

    return {
      rootAgentId: this.state.rootAgentId,
      agents,
      summary: { total: this.state.agents.size, running, completed, errored, cancelled },
    };
  }
}
