import type { ExecutorConfig, AgentEvent } from './types.js';
import type { ExecutorState } from './types.js';
import type { TaskDefinition } from './types.js';
import { TaskQueue } from './TaskQueue.js';
import { AgentManager } from './AgentManager.js';
import { EventBroadcaster } from './EventBroadcaster.js';
import { HealthMonitor } from './HealthMonitor.js';
import { SperaxOSClient } from './SperaxOSClient.js';

const DEFAULT_AGENT_ROLES = ['coder', 'researcher', 'planner'];

export class ExecutorServer {
  private readonly queue: TaskQueue;
  private readonly agentManager: AgentManager;
  private readonly broadcaster: EventBroadcaster;
  private readonly health: HealthMonitor;
  private readonly speraxos: SperaxOSClient;

  private startedAt = 0;
  private running = false;
  private pollTimer?: ReturnType<typeof setInterval>;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private recentEvents: AgentEvent[] = [];

  constructor(private readonly config: ExecutorConfig) {
    this.speraxos = new SperaxOSClient(config.speraxosUrl, config.speraxosApiKey);
    this.queue = new TaskQueue();
    this.agentManager = new AgentManager(this.speraxos);
    this.broadcaster = new EventBroadcaster(config.port);
    this.health = new HealthMonitor();

    // Forward agent events to broadcaster
    this.agentManager.onEvent((event) => {
      this.recentEvents.push(event);
      if (this.recentEvents.length > 500) this.recentEvents = this.recentEvents.slice(-500);
      this.broadcaster.broadcast(event);
    });

    this.setupHealthChecks();
  }

  private setupHealthChecks(): void {
    this.health.addCheck('speraxos', () => ({
      name: 'speraxos',
      status: 'pass' as const,
      message: 'SperaxOS connection OK (mock mode)',
      timestamp: Date.now(),
    }));

    this.health.addCheck('queue', () => {
      const stats = this.queue.getStats();
      const status = stats.queued > 100 ? 'warn' : 'pass';
      return {
        name: 'queue',
        status: status as 'pass' | 'warn',
        message: `Queue depth: ${stats.queued}`,
        timestamp: Date.now(),
      };
    });

    this.health.addCheck('agents', () => {
      const count = this.agentManager.getAgentCount();
      return {
        name: 'agents',
        status: count === 0 ? 'warn' : 'pass',
        message: `${count} active agents`,
        timestamp: Date.now(),
      };
    });
  }

  async start(): Promise<void> {
    this.startedAt = Date.now();
    this.running = true;

    console.log('[ExecutorServer] Starting...');

    // Start WebSocket server
    this.broadcaster.start(() => ({
      agents: this.agentManager.getActiveAgents(),
      tasks: this.queue.getAll(),
      recentEvents: this.recentEvents.slice(-50),
    }));

    // Spawn initial agents
    const agentCount = Math.min(this.config.maxAgents, DEFAULT_AGENT_ROLES.length);
    for (let i = 0; i < agentCount; i++) {
      await this.agentManager.spawnAgent({
        role: DEFAULT_AGENT_ROLES[i],
        name: `${DEFAULT_AGENT_ROLES[i].charAt(0).toUpperCase()}${DEFAULT_AGENT_ROLES[i].slice(1)}Agent`,
      });
    }

    // Start task processing loop
    this.pollTimer = setInterval(() => this.processTasks(), this.config.taskPollInterval);

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.config.heartbeatInterval);

    // Start health monitoring
    this.health.start();

    console.log(`[ExecutorServer] Ready. WS port: ${this.config.port}`);
  }

  private async processTasks(): Promise<void> {
    if (!this.running) return;

    // Check stalled tasks
    this.queue.checkTimeouts();

    // Assign queued tasks to available agents
    if (this.queue.getQueueLength() === 0) return;

    const agent = this.agentManager.getAvailableAgent();
    if (!agent) return;

    const task = this.queue.dequeue(agent.role);
    if (!task) return;

    task.agentId = agent.agentId;

    try {
      await this.agentManager.assignTask(task);
    } catch (err) {
      console.error('[ExecutorServer] Task assignment failed:', err);
      this.queue.fail(task.taskId, String(err));
    }
  }

  private sendHeartbeat(): void {
    const state: ExecutorState = {
      executorId: 'executor-01',
      status: 'running',
      activeAgents: this.agentManager.getActiveAgents(),
      uptime: Date.now() - this.startedAt,
      totalTasksProcessed: this.queue.getStats().completed + this.queue.getStats().failed,
      totalToolCalls: 0,
      lastHeartbeat: Date.now(),
    };

    this.broadcaster.broadcastState(state);

    // Also emit as AgentEvent for frontend hook compatibility
    const hbEvent: AgentEvent = {
      eventId: `hb_${Date.now()}`,
      type: 'heartbeat',
      timestamp: Date.now(),
      agentId: 'executor',
      payload: {
        activeAgents: this.agentManager.getAgentCount(),
        uptime: Date.now() - this.startedAt,
        totalTasksProcessed: this.queue.getStats().completed,
      },
    };
    this.broadcaster.broadcast(hbEvent);
  }

  enqueueTask(definition: TaskDefinition): string {
    return this.queue.enqueue(definition);
  }

  getStatus(): ExecutorState {
    return {
      executorId: 'executor-01',
      status: this.running ? 'running' : 'stopped',
      activeAgents: this.agentManager.getActiveAgents(),
      uptime: Date.now() - this.startedAt,
      totalTasksProcessed: this.queue.getStats().completed + this.queue.getStats().failed,
      totalToolCalls: 0,
      lastHeartbeat: Date.now(),
    };
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.health.stop();
    this.broadcaster.stop();
    console.log('[ExecutorServer] Stopped.');
  }
}
