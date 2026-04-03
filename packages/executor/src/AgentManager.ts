import type { AgentIdentity, AgentTask, AgentEvent } from './types.js';
import type { AgentSpawnConfig } from './types.js';
import { SperaxOSClient } from './SperaxOSClient.js';

const MOCK_TOOL_NAMES = ['read_file', 'grep_search', 'run_in_terminal', 'semantic_search', 'create_file'];
const MOCK_CATEGORIES = ['filesystem', 'search', 'terminal', 'search', 'filesystem'] as const;

let _callId = 0;
function uid(): string { return `call_${Date.now()}_${++_callId}`; }

function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

interface AgentState {
  identity: AgentIdentity;
  status: 'idle' | 'busy';
  currentTaskId: string | null;
  idleSince: number | null;
}

export class AgentManager {
  private agents = new Map<string, AgentState>();
  private eventListeners = new Set<(event: AgentEvent) => void>();

  constructor(private readonly client: SperaxOSClient) {}

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

    // In mock mode, simulate the task execution
    this.simulateTaskExecution(task, agent);
  }

  private async simulateTaskExecution(task: AgentTask, agent: AgentState): Promise<void> {
    const toolCallCount = 2 + Math.floor(Math.random() * 5);
    const failed = Math.random() < 0.1;

    // Simulate tool calls
    for (let i = 0; i < toolCallCount; i++) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));
      const toolIdx = Math.floor(Math.random() * MOCK_TOOL_NAMES.length);
      const callId = uid();

      this.emit({
        eventId: `evt_tool_${callId}`,
        type: 'tool:started',
        timestamp: Date.now(),
        agentId: task.agentId,
        taskId: task.taskId,
        callId,
        payload: {
          callId,
          toolName: MOCK_TOOL_NAMES[toolIdx],
          toolCategory: MOCK_CATEGORIES[toolIdx],
          inputSummary: `Executing ${MOCK_TOOL_NAMES[toolIdx]}`,
        },
      });

      await new Promise((r) => setTimeout(r, 100 + Math.random() * 400));

      this.emit({
        eventId: `evt_tool_done_${callId}`,
        type: 'tool:completed',
        timestamp: Date.now(),
        agentId: task.agentId,
        taskId: task.taskId,
        callId,
        payload: { callId, outputSummary: 'Done.' },
      });
    }

    await new Promise((r) => setTimeout(r, 200));

    // Complete or fail the task
    if (failed) {
      this.emit({
        eventId: `evt_task_fail_${task.taskId}`,
        type: 'task:failed',
        timestamp: Date.now(),
        agentId: task.agentId,
        taskId: task.taskId,
        payload: { error: 'Simulated task failure' },
      });
    } else {
      this.emit({
        eventId: `evt_task_done_${task.taskId}`,
        type: 'task:completed',
        timestamp: Date.now(),
        agentId: task.agentId,
        taskId: task.taskId,
        payload: { result: 'Task completed successfully' },
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
