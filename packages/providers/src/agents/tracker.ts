import type { DataProviderEvent } from '@web3viz/core';

export interface TrackerConfig {
  onEvent: (event: DataProviderEvent) => void;
}

interface TrackedAgent {
  address: string;
  name: string;
  lastSeen: number;
  interactions: number;
}

let _trackerId = 0;

/**
 * REST API polling tracker for agent data.
 *
 * Polls known agent registries and on-chain indexers for agent activity
 * that isn't available via WebSocket. When real API endpoints are
 * unavailable, generates synthetic discovery events from known agent
 * patterns to keep the visualization populated.
 */
export class AgentTracker {
  private config: TrackerConfig;
  private interval: ReturnType<typeof setInterval> | null = null;
  private knownAgents = new Map<string, TrackedAgent>();
  private pollCount = 0;

  constructor(config: TrackerConfig) {
    this.config = config;
  }

  start(): void {
    // Poll every 60 seconds for new agent data
    this.interval = setInterval(() => {
      this.poll();
    }, 60_000);

    this.poll();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  isRunning(): boolean {
    return this.interval !== null;
  }

  getKnownAgents(): Map<string, TrackedAgent> {
    return new Map(this.knownAgents);
  }

  private async poll(): Promise<void> {
    this.pollCount++;

    // Try real API endpoints first; fall back to synthetic discovery
    const fetched = await this.fetchAgentRegistries();
    if (!fetched) {
      this.emitSyntheticDiscovery();
    }
  }

  /**
   * Attempt to fetch agent data from known registries.
   * Returns true if any real data was fetched.
   */
  private async fetchAgentRegistries(): Promise<boolean> {
    // Try cookie.fun agent rankings API
    try {
      const res = await fetch('https://api.cookie.fun/v2/agents/agentsPaged?interval=_7Days&page=1&pageSize=5', {
        signal: AbortSignal.timeout(5000),
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json() as { ok?: { data?: Array<{ agentName?: string; contracts?: Array<{ contractAddress?: string; chain?: string }> }> } };
        const agents = data?.ok?.data;
        if (Array.isArray(agents) && agents.length > 0) {
          for (const agent of agents) {
            const name = agent.agentName ?? 'Unknown';
            const contract = agent.contracts?.[0];
            const address = contract?.contractAddress ?? `agent_${name}`;
            const chain = contract?.chain ?? 'solana';

            if (!this.knownAgents.has(address)) {
              this.knownAgents.set(address, { address, name, lastSeen: Date.now(), interactions: 0 });

              this.config.onEvent({
                id: `tracker-${++_trackerId}`,
                providerId: 'agents',
                category: 'agentDeploys',
                chain,
                timestamp: Date.now(),
                label: `${name}: discovered via registry`,
                address,
                meta: { source: 'cookie.fun', agentName: name },
              });
            } else {
              const existing = this.knownAgents.get(address)!;
              existing.lastSeen = Date.now();
              existing.interactions++;
            }
          }
          return true;
        }
      }
    } catch {
      // API unavailable — fall through to synthetic
    }

    return false;
  }

  /**
   * Emit synthetic agent discovery events to keep the visualization
   * populated when real API endpoints aren't available.
   */
  private emitSyntheticDiscovery(): void {
    // Only emit synthetic events occasionally (every 3rd poll)
    if (this.pollCount % 3 !== 1) return;

    const SYNTHETIC_AGENTS = [
      { name: 'AIXBT', chain: 'base', role: 'trader' },
      { name: 'Virtuals', chain: 'base', role: 'launcher' },
      { name: 'ai16z', chain: 'solana', role: 'researcher' },
      { name: 'ElizaOS', chain: 'solana', role: 'coder' },
      { name: 'DegenAI', chain: 'ethereum', role: 'trader' },
    ];

    const agent = SYNTHETIC_AGENTS[this.pollCount % SYNTHETIC_AGENTS.length];
    const address = `synthetic_${agent.name.toLowerCase()}`;

    if (!this.knownAgents.has(address)) {
      this.knownAgents.set(address, {
        address,
        name: agent.name,
        lastSeen: Date.now(),
        interactions: 1,
      });

      this.config.onEvent({
        id: `tracker-synth-${++_trackerId}`,
        providerId: 'agents',
        category: 'agentDeploys',
        chain: agent.chain,
        timestamp: Date.now(),
        label: `${agent.name}: agent discovered`,
        address,
        meta: { source: 'synthetic', role: agent.role },
      });
    }
  }
}
