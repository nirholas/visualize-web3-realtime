import type { AgentIdentity, AgentTask, AgentEvent } from './types.js';
import type { AgentSpawnConfig } from './types.js';
import { ClaudeAgentClient } from './ClaudeAgentClient.js';

const DEFAULT_AGENT_ROLES = ['coder', 'researcher', 'planner'];

interface AgentState {
  identity: AgentIdentity;
  status: 'idle' | 'busy';
  currentTaskId: string | null;
  idleSince: number | null;
}

export class AgentManager {
  private agents = new Map<string, AgentState>();
  private eventListeners = new Set<(event: AgentEvent) => void>();

  constructor(private readonly client: ClaudeAgentClient) {}

  onEvent(callback: (event: AgentEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  private emit(event: AgentEvent): void {
    for (const fn of this.eventListeners) fn(event);
  }

  async spawnAgent(config: AgentSpawnConfig): Promise<AgentIdentity> {
    const identity = await this.client.spawnAgent(config);
    this.agents.set(identity.agentId, { identity, status: 'idle', currentTaskId: null, idleSince: Date.now() });

    this.emit({
      eventId: `evt_spawn_${identity.agentId}`,
      type: 'agent:spawn',
      timestamp: Date.now(),
      agentId: identity.agentId,
      payload: { name: identity.name, role: identity.role },
    });

    console.log(`[AgentManager] Spawned agent: ${identity.name} (${identity.role})`);
    return identity;
  }

  async assignTask(task: AgentTask): Promise<void> {
    const agent = this.agents.get(task.agentId);
    if (!agent) {
      console.warn(`[AgentManager] Agent not found: ${task.agentId}`);
      return;
    }

    agent.status = 'busy';
    agent.currentTaskId = task.taskId;
    agent.idleSince = null;

    this.emit({
      eventId: `evt_task_start_${task.taskId}`,
      type: 'task:started',
      timestamp: Date.now(),
      agentId: task.agentId,
      taskId: task.taskId,
      payload: { description: task.description, priority: task.priority },
    });

    // Execute the task using Claude (or mock if no API key)
    this.executeTaskWithClaude(task, agent);
  }

  private async executeTaskWithClaude(task: AgentTask, agent: AgentState): Promise<void> {
    try {
      const result = await this.client.executeTask(task.agentId, task);

      if (result.success) {
        this.emit({
          eventId: `evt_task_done_${task.taskId}`,
          type: 'task:completed',
          timestamp: Date.now(),
          agentId: task.agentId,
          taskId: task.taskId,
          payload: {
            result: result.result,
            toolCallCount: result.toolCalls.length,
          },
        });
      } else {
        this.emit({
          eventId: `evt_task_fail_${task.taskId}`,
          type: 'task:failed',
          timestamp: Date.now(),
          agentId: task.agentId,
          taskId: task.taskId,
          payload: { error: result.result },
        });
      }
    } catch (err) {
      this.emit({
        eventId: `evt_task_fail_${task.taskId}`,
        type: 'task:failed',
        timestamp: Date.now(),
        agentId: task.agentId,
        taskId: task.taskId,
        payload: { error: err instanceof Error ? err.message : 'Unknown error' },
      });
    }

    agent.status = 'idle';
    agent.currentTaskId = null;
    agent.idleSince = Date.now();
  }

  getAvailableAgent(role?: string): AgentIdentity | null {
    for (const [, state] of this.agents) {
      if (state.status === 'idle') {
        if (!role || state.identity.role === role) return state.identity;
      }
    }
    return null;
  }

  async shutdownAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    this.agents.delete(agentId);

    this.emit({
      eventId: `evt_shutdown_${agentId}`,
      type: 'agent:shutdown',
      timestamp: Date.now(),
      agentId,
      payload: {},
    });
  }

  getActiveAgents(): AgentIdentity[] {
    return Array.from(this.agents.values()).map((s) => s.identity);
  }

  getAgentCount(): number { return this.agents.size; }
  getBusyCount(): number { return Array.from(this.agents.values()).filter((a) => a.status === 'busy').length; }

  async autoScale(queueDepth: number, maxAgents: number, roleSequence: string[] = DEFAULT_AGENT_ROLES): Promise<void> {
    // Spawn new agents if queue is growing and all agents are busy
    if (queueDepth > 0) {
      const busyCount = this.getBusyCount();
      const totalCount = this.agents.size;

      if (busyCount === totalCount && totalCount < maxAgents) {
        // All agents busy and we can spawn more
        const nextRole = roleSequence[totalCount % roleSequence.length];
        await this.spawnAgent({
          role: nextRole,
          name: `${nextRole.charAt(0).toUpperCase()}${nextRole.slice(1)}Agent${totalCount + 1}`,
        });
      }
    }

    // Retire agents that have been idle for too long (but keep at least 1)
    const now = Date.now();
    const idleThreshold = 5 * 60_000; // 5 minutes
    const agentsToRetire: string[] = [];

    for (const [agentId, state] of this.agents) {
      if (state.status === 'idle' && state.idleSince && now - state.idleSince > idleThreshold) {
        if (this.agents.size > 1) {
          agentsToRetire.push(agentId);
        }
      }
    }

    for (const agentId of agentsToRetire) {
      await this.shutdownAgent(agentId);
    }
  }
}
