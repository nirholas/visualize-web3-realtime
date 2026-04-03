import type {
  DataProvider,
  DataProviderEvent,
  DataProviderStats,
  ConnectionState,
  CategoryConfig,
  SourceConfig,
  RawEvent,
  TopToken,
  TraderEdge,
} from '@web3viz/core';
import { getCategoriesForSource, SOURCE_CONFIG_MAP } from '@web3viz/core';

// ============================================================================
// Agent Data Provider — generates mock AI agent activity data
// ============================================================================

export interface AgentProviderOptions {
  /** Tick interval in milliseconds (default 600) */
  intervalMs?: number;
}

// ---------------------------------------------------------------------------
// Mock agent data
// ---------------------------------------------------------------------------

const AGENT_PROFILES: Array<{ id: string; name: string; role: string }> = [
  { id: 'agent-codereview', name: 'CodeReviewer', role: 'coder' },
  { id: 'agent-researcher', name: 'Researcher', role: 'researcher' },
  { id: 'agent-planner', name: 'Planner', role: 'planner' },
  { id: 'agent-typecheck', name: 'TypeChecker', role: 'coder' },
  { id: 'agent-docwriter', name: 'DocWriter', role: 'researcher' },
];

const TOOL_CALLS: Array<{ toolName: string; toolCategory: string; inputSummary: string }> = [
  { toolName: 'read_file', toolCategory: 'filesystem', inputSummary: 'Reading src/index.ts' },
  { toolName: 'grep_search', toolCategory: 'search', inputSummary: 'Searching for "handleSubmit"' },
  { toolName: 'run_in_terminal', toolCategory: 'terminal', inputSummary: 'npx tsc --noEmit' },
  { toolName: 'semantic_search', toolCategory: 'search', inputSummary: 'Finding auth patterns' },
  { toolName: 'create_file', toolCategory: 'filesystem', inputSummary: 'Creating src/utils/auth.ts' },
  { toolName: 'fetch_url', toolCategory: 'network', inputSummary: 'GET https://api.example.com' },
  { toolName: 'run_tests', toolCategory: 'terminal', inputSummary: 'npm test -- --coverage' },
  { toolName: 'analyze_code', toolCategory: 'code', inputSummary: 'Analyzing complexity' },
];

const TASK_DESCRIPTIONS = [
  'Review pull request #42',
  'Analyze API documentation',
  'Plan sprint backlog',
  'Refactor auth module',
  'Generate test coverage',
  'Audit security vulnerabilities',
];

function randomEl<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let idCounter = 0;

// ============================================================================
// Provider
// ============================================================================

export class AgentProvider implements DataProvider {
  readonly id = 'agents';
  readonly name = 'AI Agents';
  readonly sourceConfig: SourceConfig;
  readonly categories: CategoryConfig[];

  private eventListeners = new Set<(event: DataProviderEvent) => void>();
  private rawListeners = new Set<(event: RawEvent) => void>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private intervalMs: number;
  private _paused = false;
  private _enabled = true;

  // Aggregate counters
  private agentSpawns = 0;
  private taskCount = 0;
  private toolCallCount = 0;
  private tasksCompleted = 0;
  private tasksFailed = 0;

  // Per-agent tracking for topTokens
  private agentAcc = new Map<string, { name: string; role: string; toolCalls: number; tasksCompleted: number }>();
  // Tool-call edges (tool → agent)
  private toolEdges: Array<{ trader: string; mint: string; trades: number; volumeSol: number }> = [];

  constructor(options: AgentProviderOptions = {}) {
    this.intervalMs = options.intervalMs ?? 600;
    this.sourceConfig = SOURCE_CONFIG_MAP['agents'] ?? {
      id: 'agents',
      label: 'AI Agents',
      color: '#f472b6',
      icon: '\u2B23',
      description: 'Autonomous AI agent activity',
    };
    this.categories = getCategoriesForSource('agents');
  }

  connect(): void {
    if (this.intervalId) return;
    // Seed initial agents so hubs appear immediately
    for (const profile of AGENT_PROFILES) {
      this.spawnAgent(profile);
    }
    this.intervalId = setInterval(() => this.tick(), this.intervalMs);
  }

  disconnect(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setPaused(paused: boolean): void {
    this._paused = paused;
  }

  isPaused(): boolean {
    return this._paused;
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  getStats(): DataProviderStats {
    const topTokens: TopToken[] = Array.from(this.agentAcc.entries()).map(([agentId, data]) => ({
      mint: agentId,
      tokenAddress: agentId,
      symbol: data.name,
      name: `${data.name} (${data.role})`,
      chain: 'agents',
      trades: data.toolCalls,
      volumeSol: data.tasksCompleted,
      volume: data.tasksCompleted,
      nativeSymbol: 'TASKS',
      source: 'agents',
    }));

    // Sort by activity (tool calls) descending
    topTokens.sort((a, b) => b.trades - a.trades);

    const traderEdges: TraderEdge[] = this.toolEdges.map((e) => ({
      trader: e.trader,
      mint: e.mint,
      tokenAddress: e.mint,
      chain: 'agents',
      trades: e.trades,
      volumeSol: e.trades,
      volume: e.trades,
      source: 'agents',
    }));

    return {
      counts: {
        agentSpawn: this.agentSpawns,
        agentTask: this.taskCount,
        toolCall: this.toolCallCount,
        taskComplete: this.tasksCompleted,
        taskFailed: this.tasksFailed,
      },
      totalVolumeSol: this.tasksCompleted,
      totalTransactions: this.toolCallCount,
      totalAgents: this.agentSpawns,
      recentEvents: [],
      topTokens,
      traderEdges,
      rawEvents: [],
    };
  }

  getConnections(): ConnectionState[] {
    return [{ name: 'Agent Mock Stream', connected: this.intervalId !== null }];
  }

  onEvent(listener: (event: DataProviderEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => { this.eventListeners.delete(listener); };
  }

  onRawEvent(listener: (event: RawEvent) => void): () => void {
    this.rawListeners.add(listener);
    return () => { this.rawListeners.delete(listener); };
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private emit(event: DataProviderEvent): void {
    for (const listener of this.eventListeners) listener(event);
  }

  private spawnAgent(profile: { id: string; name: string; role: string }): void {
    this.agentSpawns++;
    if (!this.agentAcc.has(profile.id)) {
      this.agentAcc.set(profile.id, { name: profile.name, role: profile.role, toolCalls: 0, tasksCompleted: 0 });
    }
    this.emit({
      id: `agent-evt-${++idCounter}`,
      category: 'agentSpawn',
      source: 'agents',
      providerId: 'agents',
      chain: 'agents',
      timestamp: Date.now(),
      label: `${profile.name} spawned`,
      address: profile.id,
    });
  }

  private tick(): void {
    if (this._paused || !this._enabled) return;

    const rand = Math.random();
    const agent = randomEl(AGENT_PROFILES);
    const agentData = this.agentAcc.get(agent.id);

    if (rand < 0.05) {
      // Rare: new agent spawn (re-use profile, bump counter)
      this.spawnAgent(agent);
    } else if (rand < 0.15) {
      // Task started
      this.taskCount++;
      const desc = randomEl(TASK_DESCRIPTIONS);
      this.emit({
        id: `agent-evt-${++idCounter}`,
        category: 'agentTask',
        source: 'agents',
        providerId: 'agents',
        chain: 'agents',
        timestamp: Date.now(),
        label: `${agent.name}: ${desc}`,
        address: agent.id,
      });
    } else if (rand < 0.7) {
      // Tool call (most frequent)
      this.toolCallCount++;
      if (agentData) agentData.toolCalls++;

      const tool = randomEl(TOOL_CALLS);

      // Track edge
      const edgeKey = `${tool.toolName}:${agent.id}`;
      const existing = this.toolEdges.find((e) => `${e.trader}:${e.mint}` === edgeKey);
      if (existing) {
        existing.trades++;
        existing.volumeSol++;
      } else {
        this.toolEdges.push({ trader: tool.toolName, mint: agent.id, trades: 1, volumeSol: 1 });
      }

      this.emit({
        id: `agent-evt-${++idCounter}`,
        category: 'toolCall',
        source: 'agents',
        providerId: 'agents',
        chain: 'agents',
        timestamp: Date.now(),
        label: `${agent.name}: ${tool.toolName} — ${tool.inputSummary}`,
        address: agent.id,
      });
    } else if (rand < 0.85) {
      // Task completed
      this.tasksCompleted++;
      if (agentData) agentData.tasksCompleted++;
      this.emit({
        id: `agent-evt-${++idCounter}`,
        category: 'taskComplete',
        source: 'agents',
        providerId: 'agents',
        chain: 'agents',
        timestamp: Date.now(),
        label: `${agent.name}: task completed`,
        address: agent.id,
      });
    } else if (rand < 0.90) {
      // Task failed
      this.tasksFailed++;
      this.emit({
        id: `agent-evt-${++idCounter}`,
        category: 'taskFailed',
        source: 'agents',
        providerId: 'agents',
        chain: 'agents',
        timestamp: Date.now(),
        label: `${agent.name}: task failed`,
        address: agent.id,
      });
    } else if (rand < 0.95) {
      // Sub-agent spawn
      this.emit({
        id: `agent-evt-${++idCounter}`,
        category: 'subagentSpawn',
        source: 'agents',
        providerId: 'agents',
        chain: 'agents',
        timestamp: Date.now(),
        label: `${agent.name} spawned sub-agent`,
        address: agent.id,
      });
    } else {
      // Reasoning
      this.emit({
        id: `agent-evt-${++idCounter}`,
        category: 'reasoning',
        source: 'agents',
        providerId: 'agents',
        chain: 'agents',
        timestamp: Date.now(),
        label: `${agent.name} thinking...`,
        address: agent.id,
      });
    }
  }
}
