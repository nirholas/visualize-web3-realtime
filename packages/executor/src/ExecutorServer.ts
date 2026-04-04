import { createServer } from 'http';
import { URL } from 'url';
import type { ExecutorConfig, AgentEvent } from './types.js';
import type { ExecutorState } from './types.js';
import type { TaskDefinition } from './types.js';
import { TaskQueue } from './TaskQueue.js';
import { AgentManager } from './AgentManager.js';
import { EventBroadcaster } from './EventBroadcaster.js';
import { HealthMonitor } from './HealthMonitor.js';
import { SperaxOSClient } from './SperaxOSClient.js';
import { StateStore } from './StateStore.js';

export const DEFAULT_AGENT_ROLES = ['coder', 'researcher', 'planner'];

export class ExecutorServer {
  private readonly queue: TaskQueue;
  private readonly agentManager: AgentManager;
  private readonly broadcaster: EventBroadcaster;
  private readonly health: HealthMonitor;
  private readonly speraxos: SperaxOSClient;
  private readonly stateStore: StateStore;

  private startedAt = 0;
  private running = false;
  private pollTimer?: ReturnType<typeof setInterval>;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private autoSpawnTimer?: ReturnType<typeof setInterval>;
  private httpServer?: ReturnType<typeof createServer>;
  private recentEvents: AgentEvent[] = [];

  constructor(private readonly config: ExecutorConfig) {
    this.speraxos = new SperaxOSClient(config.speraxosUrl, config.speraxosApiKey);
    this.queue = new TaskQueue();
    this.agentManager = new AgentManager(this.speraxos);
    this.broadcaster = new EventBroadcaster(config.port);
    this.health = new HealthMonitor();
    this.stateStore = new StateStore(config.statePath);

    // Forward agent events to broadcaster and state store
    this.agentManager.onEvent((event) => {
      this.recentEvents.push(event);
      if (this.recentEvents.length > 500) this.recentEvents = this.recentEvents.slice(-500);
      this.broadcaster.broadcast(event);
      this.stateStore.saveEvent(event);

      // Sync task completion/failure back to the queue
      if (event.type === 'task:completed' && event.taskId) {
        this.queue.complete(event.taskId, String(event.payload.result ?? ''));
        const tasks = this.queue.getAll();
        const task = tasks.find((t) => t.taskId === event.taskId);
        if (task) this.stateStore.saveTask(task);
      } else if (event.type === 'task:failed' && event.taskId) {
        this.queue.fail(event.taskId, String(event.payload.error ?? 'Unknown error'));
        const tasks = this.queue.getAll();
        const task = tasks.find((t) => t.taskId === event.taskId);
        if (task) this.stateStore.saveTask(task);
      }
    });

    this.setupHealthChecks();
  }

  private parseRequestBody(req: any): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk;
        if (body.length > 1024 * 1024) {
          resolve({});
          return;
        }
      });
      req.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const result: Record<string, unknown> = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
          resolve(result);
        } catch {
          resolve({});
        }
      });
      req.on('error', () => {
        resolve({});
      });
    });
  }

  private handleRESTRequest(req: any, res: any): void {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Route matching
    if (path === '/api/status' && method === 'GET') {
      const state = this.getStatus();
      const health = this.health.getHealth();
      res.writeHead(200);
      res.end(JSON.stringify({ state, health }));
    } else if (path === '/api/agents' && method === 'GET') {
      const agents = this.agentManager.getActiveAgents();
      res.writeHead(200);
      res.end(JSON.stringify(agents));
    } else if (path === '/api/tasks' && method === 'GET') {
      const tasks = this.queue.getAll();
      res.writeHead(200);
      res.end(JSON.stringify(tasks));
    } else if (path.match(/^\/api\/tasks\/[^/]+$/) && method === 'GET') {
      const taskId = path.split('/').pop();
      const tasks = this.queue.getAll();
      const task = tasks.find((t) => t.taskId === taskId);
      if (task) {
        res.writeHead(200);
        res.end(JSON.stringify(task));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Task not found' }));
      }
    } else if (path === '/api/tasks' && method === 'POST') {
      this.parseRequestBody(req)
        .then((body: Record<string, unknown>) => {
          const definition: TaskDefinition = {
            description: String(body.description || 'Unnamed task'),
            priority: typeof body.priority === 'number' ? body.priority : undefined,
            requiredRole: typeof body.requiredRole === 'string' ? body.requiredRole : undefined,
            timeout: typeof body.timeout === 'number' ? body.timeout : undefined,
            retryCount: typeof body.retryCount === 'number' ? body.retryCount : undefined,
            metadata: typeof body.metadata === 'object' && body.metadata !== null ? (body.metadata as Record<string, unknown>) : undefined,
          };
          const taskId = this.enqueueTask(definition);
          res.writeHead(201);
          res.end(JSON.stringify({ taskId }));
        })
        .catch(() => {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid request body' }));
        });
    } else if (path.match(/^\/api\/tasks\/[^/]+$/) && method === 'DELETE') {
      const taskId = path.split('/').pop()!;
      this.queue.fail(taskId, 'Cancelled by user');
      const tasks = this.queue.getAll();
      const task = tasks.find((t) => t.taskId === taskId);
      if (task) {
        this.stateStore.saveTask(task);
        this.broadcaster.broadcast({
          eventId: `evt_cancel_${taskId}`,
          type: 'task:cancelled',
          timestamp: Date.now(),
          agentId: task.agentId || 'executor',
          taskId,
          payload: { reason: 'Cancelled by user' },
        });
      }
      res.writeHead(200);
      res.end(JSON.stringify({ taskId, status: 'cancelled' }));
    } else if (path === '/api/agents/spawn' && method === 'POST') {
      this.parseRequestBody(req)
        .then((body: Record<string, unknown>) => {
          this.agentManager.spawnAgent({ role: String(body.role || 'coder'), name: String(body.name || '') })
            .then((agent) => {
              this.stateStore.saveAgent(agent);
              res.writeHead(201);
              res.end(JSON.stringify(agent));
            })
            .catch((err) => {
              res.writeHead(500);
              res.end(JSON.stringify({ error: String(err) }));
            });
        })
        .catch(() => {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid request body' }));
        });
    } else if (path.match(/^\/api\/agents\/[^/]+\/stop$/) && method === 'POST') {
      const agentId = path.split('/').slice(-2, -1)[0];
      this.agentManager.shutdownAgent(agentId)
        .then(() => {
          res.writeHead(200);
          res.end(JSON.stringify({ agentId, status: 'stopped' }));
        })
        .catch((err) => {
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(err) }));
        });
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
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

    this.health.addCheck('memory', () => {
      const usage = process.memoryUsage();
      const heapMB = Math.round(usage.heapUsed / 1024 / 1024);
      const threshold = 512; // MB
      return {
        name: 'memory',
        status: heapMB > threshold ? 'warn' : 'pass',
        message: `Heap: ${heapMB}MB`,
        timestamp: Date.now(),
      };
    });

    this.health.addCheck('event_rate', () => {
      const recentCount = this.recentEvents.length;
      const now = Date.now();
      // Check if events have flowed in the last 2 minutes (only warn if agents are active)
      const twoMinAgo = now - 120_000;
      const recentEventsInWindow = this.recentEvents.filter((e) => e.timestamp > twoMinAgo).length;
      const agentCount = this.agentManager.getAgentCount();
      const stuck = agentCount > 0 && recentEventsInWindow === 0 && this.running && (now - this.startedAt > 120_000);
      return {
        name: 'event_rate',
        status: stuck ? 'warn' : 'pass',
        message: `${recentEventsInWindow} events in last 2min (total buffered: ${recentCount})`,
        timestamp: now,
      };
    });
  }

  async start(): Promise<void> {
    this.startedAt = Date.now();
    this.running = true;

    console.log('[ExecutorServer] Starting...');

    // Initialize state store metadata
    this.stateStore.setMeta('start_time', String(this.startedAt));

    // Restore persisted tasks from previous run
    const restoredTasks = this.stateStore.loadActiveTasks();
    for (const task of restoredTasks) {
      // Re-enqueue tasks that were queued or in-progress (stalled) before crash
      this.queue.enqueue(
        { description: task.description, priority: task.priority, requiredRole: undefined },
        '',
      );
      console.log(`[ExecutorServer] Restored task: ${task.taskId} (${task.status})`);
    }

    // Load recent events for snapshot
    this.recentEvents = this.stateStore.loadRecentEvents(50);

    // Start HTTP server (shared by both REST API and WebSocket)
    this.httpServer = createServer((req, res) => {
      // Only handle REST API requests here (non-upgrade requests)
      if (!req.url || !req.url.startsWith('/')) {
        res.writeHead(404);
        res.end();
        return;
      }
      this.handleRESTRequest(req, res);
    });

    // Start WebSocket server on the same HTTP server
    this.broadcaster.start(
      () => ({
        agents: this.agentManager.getActiveAgents(),
        tasks: this.queue.getAll(),
        recentEvents: this.recentEvents.slice(-50),
      }),
      this.httpServer,
    );

    // Listen on the shared HTTP server
    this.httpServer.listen(this.config.port, () => {
      console.log(`[ExecutorServer] Ready on http://localhost:${this.config.port} (REST API + WebSocket)`);
    });

    // Spawn initial agents
    const agentCount = Math.min(this.config.maxAgents, DEFAULT_AGENT_ROLES.length);
    for (let i = 0; i < agentCount; i++) {
      const agent = await this.agentManager.spawnAgent({
        role: DEFAULT_AGENT_ROLES[i],
        name: `${DEFAULT_AGENT_ROLES[i].charAt(0).toUpperCase()}${DEFAULT_AGENT_ROLES[i].slice(1)}Agent`,
      });
      this.stateStore.saveAgent(agent);
    }

    // Start task processing loop
    this.pollTimer = setInterval(() => this.processTasks(), this.config.taskPollInterval);

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.config.heartbeatInterval);

    // Start health monitoring
    this.health.start();

    // Start autonomous task generation loop
    this.autoSpawnTimer = setInterval(() => this.autoGenerateTasks(), 10_000);

    console.log(`[ExecutorServer] Ready. WS port: ${this.config.port}`);
  }

  /**
   * Background autonomous task generation loop.
   * Ensures agents always have work to do by generating synthetic tasks
   * when the queue is empty and agents are idle.
   */
  private async autoGenerateTasks(): Promise<void> {
    if (!this.running) return;

    const queueLength = this.queue.getQueueLength();
    const inProgress = this.queue.getInProgressCount();
    const idleAgents = this.agentManager.getAgentCount() - this.agentManager.getBusyCount();

    // Only generate tasks when idle agents exist and queue is nearly empty
    if (queueLength > 2 || idleAgents === 0) return;

    const AUTONOMOUS_TASKS: TaskDefinition[] = [
      { description: 'Scan network for new token deployments', requiredRole: 'researcher', priority: 3 },
      { description: 'Analyze trending contract patterns', requiredRole: 'researcher', priority: 4 },
      { description: 'Review and optimize gas usage', requiredRole: 'coder', priority: 5 },
      { description: 'Monitor liquidity pool changes', requiredRole: 'researcher', priority: 2 },
      { description: 'Generate daily activity report', requiredRole: 'planner', priority: 6 },
      { description: 'Audit smart contract security', requiredRole: 'coder', priority: 1 },
      { description: 'Update risk assessment models', requiredRole: 'planner', priority: 4 },
      { description: 'Check for anomalous trading patterns', requiredRole: 'researcher', priority: 2 },
      { description: 'Refactor indexer query pipeline', requiredRole: 'coder', priority: 5 },
      { description: 'Plan next sprint objectives', requiredRole: 'planner', priority: 7 },
    ];

    // Pick a random task and enqueue it
    const task = AUTONOMOUS_TASKS[Math.floor(Math.random() * AUTONOMOUS_TASKS.length)];
    this.enqueueTask(task);
  }

  private async processTasks(): Promise<void> {
    if (!this.running) return;

    // Check stalled tasks
    this.queue.checkTimeouts();

    // Auto-scale agents
    const queueLength = this.queue.getQueueLength();
    await this.agentManager.autoScale(queueLength, this.config.maxAgents);

    // Assign queued tasks to available agents
    if (queueLength === 0) return;

    const agent = this.agentManager.getAvailableAgent();
    if (!agent) return;

    const task = this.queue.dequeue(agent.role);
    if (!task) return;

    task.agentId = agent.agentId;

    try {
      await this.agentManager.assignTask(task);
      // Persist task to state store after assignment
      this.stateStore.saveTask(task);
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
    const taskId = this.queue.enqueue(definition);
    const tasks = this.queue.getAll();
    const task = tasks.find((t) => t.taskId === taskId);
    if (task) {
      this.stateStore.saveTask(task);
    }
    return taskId;
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
    if (this.autoSpawnTimer) clearInterval(this.autoSpawnTimer);
    this.health.stop();
    this.broadcaster.stop();

    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
    }

    // Close state store
    this.stateStore.close();

    console.log('[ExecutorServer] Stopped.');
  }
}
