/**
 * MCP Server for Giza/blockchain data access.
 *
 * This server exposes the following resources to the AI:
 * - protocol_stats: Current stats for DeFi protocols ARMA interacts with (via DeFi Llama)
 * - recent_trades: Last N trades aggregated from active data providers
 * - agent_activity: Top AI agents from cookie.fun rankings
 * - proof_status: LuminAIR STARK proof verification results (local registry)
 *
 * All fetchers include 5-second timeouts, error handling, and type safety.
 */

import type { DataProviderEvent } from '@web3viz/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Parameters that can be passed to a resource's fetch call. */
export interface MCPResourceParams {
  /** Maximum number of items to return. */
  limit?: number;
  /** Filter by chain identifier. */
  chain?: string;
  /** Filter by category. */
  category?: string;
  /** Arbitrary extra params. */
  [key: string]: unknown;
}

/** A single MCP resource definition. */
export interface MCPResource {
  name: string;
  description: string;
  /** Fetch the resource data, optionally filtered by params. */
  fetch: (params?: MCPResourceParams) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// 1. Protocol Stats — DeFi Llama
// ---------------------------------------------------------------------------

/** Protocols that the ARMA agent interacts with for autonomous rebalancing. */
const ARMA_PROTOCOLS = ['aave', 'uniswap', 'compound-finance', 'makerdao', 'lido'];

/** Normalized protocol stats returned by the protocol_stats resource. */
export interface ProtocolStat {
  name: string;
  slug: string;
  tvl: number;
  change24h: number | null;
  chain: string;
  category: string;
}

/**
 * Fetch DeFi protocol TVL and stats from the DeFi Llama public API.
 * Filters for protocols that ARMA interacts with (Aave, Uniswap, Compound, MakerDAO, Lido).
 */
async function fetchProtocolStats(params?: MCPResourceParams): Promise<{
  protocols: ProtocolStat[];
  timestamp: number;
}> {
  try {
    const res = await fetch('https://api.llama.fi/protocols', {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`DeFi Llama API returned ${res.status}`);
    }

    const data: unknown = await res.json();

    if (!Array.isArray(data)) {
      throw new Error('Unexpected response format from DeFi Llama');
    }

    const limit = params?.limit ?? ARMA_PROTOCOLS.length;

    const protocols: ProtocolStat[] = [];
    for (const entry of data) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      const slug = String(record.slug ?? '').toLowerCase();

      if (!ARMA_PROTOCOLS.includes(slug)) continue;

      protocols.push({
        name: String(record.name ?? slug),
        slug,
        tvl: typeof record.tvl === 'number' ? record.tvl : 0,
        change24h: typeof record.change_1d === 'number' ? record.change_1d : null,
        chain: String(
          record.chain ?? (Array.isArray(record.chains) ? record.chains[0] : null) ?? 'Multi',
        ),
        category: String(record.category ?? 'DeFi'),
      });

      if (protocols.length >= limit) break;
    }

    return { protocols, timestamp: Date.now() };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      protocols: [],
      timestamp: Date.now(),
      ...({ error: `Failed to fetch protocol stats: ${message}` } as Record<string, unknown>),
    };
  }
}

// ---------------------------------------------------------------------------
// 2. Recent Trades — from active providers via callback
// ---------------------------------------------------------------------------

/** Callback signature that callers provide to supply recent events from active providers. */
export type GetRecentEventsCallback = () => DataProviderEvent[];

let _getRecentEvents: GetRecentEventsCallback | null = null;

/**
 * Register a callback that returns recent events from active data providers.
 * This must be called by the host application before the recent_trades resource
 * can return real data.
 *
 * @param callback - Function that returns the current set of recent DataProviderEvents
 */
export function registerRecentEventsSource(callback: GetRecentEventsCallback): void {
  _getRecentEvents = callback;
}

/** A normalized trade entry returned by the recent_trades resource. */
export interface RecentTrade {
  id: string;
  provider: string;
  category: string;
  chain: string;
  address: string;
  tokenAddress: string | undefined;
  label: string;
  amount: number | undefined;
  amountUsd: number | undefined;
  timestamp: number;
}

/**
 * Aggregate recent large DEX trades from the active data providers.
 * Uses the registered getRecentEvents callback to pull live event data.
 * Filters for trade-related categories and sorts by timestamp descending.
 */
async function fetchRecentTrades(params?: MCPResourceParams): Promise<{
  trades: RecentTrade[];
  count: number;
  timestamp: number;
}> {
  try {
    if (!_getRecentEvents) {
      return {
        trades: [],
        count: 0,
        timestamp: Date.now(),
      };
    }

    const events = _getRecentEvents();
    const limit = params?.limit ?? 50;
    const chainFilter = params?.chain;
    const categoryFilter = params?.category;

    const TRADE_CATEGORIES = ['swap', 'trade', 'buy', 'sell', 'dexTrades', 'largeTrades'];

    const trades: RecentTrade[] = events
      .filter((e) => {
        if (categoryFilter) {
          return e.category === categoryFilter;
        }
        return TRADE_CATEGORIES.some(
          (cat) => e.category.toLowerCase().includes(cat.toLowerCase()),
        );
      })
      .filter((e) => !chainFilter || e.chain === chainFilter)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map((e) => ({
        id: e.id,
        provider: e.providerId,
        category: e.category,
        chain: e.chain,
        address: e.address,
        tokenAddress: e.tokenAddress,
        label: e.label,
        amount: e.amount,
        amountUsd: e.amountUsd,
        timestamp: e.timestamp,
      }));

    return { trades, count: trades.length, timestamp: Date.now() };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      trades: [],
      count: 0,
      timestamp: Date.now(),
      ...({ error: `Failed to fetch recent trades: ${message}` } as Record<string, unknown>),
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Agent Activity — cookie.fun API
// ---------------------------------------------------------------------------

/** An AI agent entry from the cookie.fun rankings. */
export interface AgentActivityEntry {
  name: string;
  address: string;
  chain: string;
  mindshare: number | null;
  marketCap: number | null;
  holders: number | null;
  timestamp: number;
}

/**
 * Fetch top AI agent activity from the cookie.fun API.
 * Uses the same endpoint and parsing logic as the AgentTracker in
 * packages/providers/src/agents/tracker.ts.
 */
async function fetchAgentActivity(params?: MCPResourceParams): Promise<{
  agents: AgentActivityEntry[];
  lastUpdate: number;
}> {
  try {
    const pageSize = params?.limit ?? 10;
    const url = `https://api.cookie.fun/v2/agents/agentsPaged?interval=_7Days&page=1&pageSize=${pageSize}`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`cookie.fun API returned ${res.status}`);
    }

    const data: unknown = await res.json();

    if (!data || typeof data !== 'object') {
      throw new Error('Unexpected response format from cookie.fun');
    }

    const root = data as Record<string, unknown>;
    const okObj = root.ok;
    if (!okObj || typeof okObj !== 'object') {
      throw new Error('Missing ok field in cookie.fun response');
    }

    const okRecord = okObj as Record<string, unknown>;
    const agentsArr = okRecord.data;
    if (!Array.isArray(agentsArr)) {
      throw new Error('Missing data array in cookie.fun response');
    }

    const agents: AgentActivityEntry[] = [];
    for (const agent of agentsArr) {
      if (!agent || typeof agent !== 'object') continue;
      const a = agent as Record<string, unknown>;

      const name = typeof a.agentName === 'string' ? a.agentName : 'Unknown';
      const contracts = a.contracts;
      let address = `agent_${name}`;
      let chain = 'solana';

      if (Array.isArray(contracts) && contracts.length > 0) {
        const contract = contracts[0];
        if (contract && typeof contract === 'object') {
          const c = contract as Record<string, unknown>;
          if (typeof c.contractAddress === 'string') address = c.contractAddress;
          if (typeof c.chain === 'string') chain = c.chain;
        }
      }

      agents.push({
        name,
        address,
        chain,
        mindshare: typeof a.mindshare === 'number' ? a.mindshare : null,
        marketCap: typeof a.marketCap === 'number' ? a.marketCap : null,
        holders: typeof a.holdersCount === 'number' ? a.holdersCount : null,
        timestamp: Date.now(),
      });
    }

    return { agents, lastUpdate: Date.now() };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      agents: [],
      lastUpdate: Date.now(),
      ...({ error: `Failed to fetch agent activity: ${message}` } as Record<string, unknown>),
    };
  }
}

// ---------------------------------------------------------------------------
// 4. Proof Status — LuminAIR local verification registry
// ---------------------------------------------------------------------------

/** A single STARK proof verification result. */
export interface ProofResult {
  /** Unique proof identifier (e.g. transaction hash or proof hash). */
  proofId: string;
  /** Whether the proof was successfully verified. */
  verified: boolean;
  /** The program or circuit that was verified. */
  program: string;
  /** Verification timestamp. */
  timestamp: number;
  /** Time taken to verify in milliseconds. */
  verificationTimeMs: number;
  /** Optional error message if verification failed. */
  error?: string;
}

/** Internal registry of proof verification results (bounded to prevent memory leaks). */
const PROOF_REGISTRY_MAX = 500;
const proofRegistry: ProofResult[] = [];

/**
 * Add a proof verification result to the local registry.
 * Call this from the WASM verification layer when a LuminAIR proof
 * is verified client-side.
 *
 * @param result - The proof verification result to record
 */
export function addProofResult(result: ProofResult): void {
  proofRegistry.push(result);
  // Evict oldest entries if we exceed the limit
  if (proofRegistry.length > PROOF_REGISTRY_MAX) {
    proofRegistry.splice(0, proofRegistry.length - PROOF_REGISTRY_MAX);
  }
}

/**
 * Clear all proof results from the registry. Primarily useful for testing.
 */
export function clearProofRegistry(): void {
  proofRegistry.length = 0;
}

/**
 * Fetch the current proof verification status from the local registry.
 * Returns counts of verified and failed proofs plus the most recent entries.
 */
async function fetchProofStatus(params?: MCPResourceParams): Promise<{
  proofs: ProofResult[];
  verified: number;
  failed: number;
  total: number;
  avgVerificationTimeMs: number;
  timestamp: number;
}> {
  const limit = params?.limit ?? 20;

  const verified = proofRegistry.filter((p) => p.verified).length;
  const failed = proofRegistry.filter((p) => !p.verified).length;
  const total = proofRegistry.length;

  const avgVerificationTimeMs =
    total > 0
      ? proofRegistry.reduce((sum, p) => sum + p.verificationTimeMs, 0) / total
      : 0;

  // Return the most recent entries, newest first
  const recentProofs = proofRegistry
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);

  return {
    proofs: recentProofs,
    verified,
    failed,
    total,
    avgVerificationTimeMs: Math.round(avgVerificationTimeMs * 100) / 100,
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Resource definitions
// ---------------------------------------------------------------------------

export const gizaResources: MCPResource[] = [
  {
    name: 'protocol_stats',
    description:
      'Current TVL and stats for DeFi protocols ARMA interacts with (Aave, Uniswap, Compound, MakerDAO, Lido). Sourced from DeFi Llama.',
    fetch: fetchProtocolStats,
  },
  {
    name: 'recent_trades',
    description:
      'Most recent DEX trades aggregated from active data providers. Supports params: limit, chain, category.',
    fetch: fetchRecentTrades,
  },
  {
    name: 'agent_activity',
    description:
      'Top AI agent rankings and activity from cookie.fun. Supports params: limit.',
    fetch: fetchAgentActivity,
  },
  {
    name: 'proof_status',
    description:
      'LuminAIR STARK proof verification results. Shows verified/failed counts and recent proofs. Supports params: limit.',
    fetch: fetchProofStatus,
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch a single MCP resource by name, optionally passing filter parameters.
 *
 * @param name - The resource name (e.g. 'protocol_stats')
 * @param params - Optional parameters to filter/limit the results
 * @returns The resource data
 * @throws Error if the resource name is unknown
 */
export async function fetchResource(
  name: string,
  params?: MCPResourceParams,
): Promise<unknown> {
  const resource = gizaResources.find((r) => r.name === name);
  if (!resource) {
    throw new Error(`Unknown MCP resource: ${name}`);
  }
  return resource.fetch(params);
}

/**
 * List all available MCP resource names and descriptions.
 */
export function listResources(): Array<{ name: string; description: string }> {
  return gizaResources.map(({ name, description }) => ({ name, description }));
}
