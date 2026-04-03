# Task 13: SperaxOS WebSocket Provider

## Context
After Task 12, we have a full agent type system. Now we need to connect to SperaxOS's agent API and feed real-time events into our visualization pipeline. This task creates:

1. A `useAgentEvents` React hook that manages the WebSocket connection to SperaxOS
2. An `AgentProvider` that implements the existing `DataProvider` interface from `packages/core/src/providers/index.ts`
3. Integration with `useDataProvider` so agent events merge into the unified stats pipeline

The existing data flow for crypto is:
```
usePumpFun (WebSocket) → useDataProvider → ForceGraph
```

We're adding a parallel stream:
```
useAgentEvents (WebSocket) → AgentProvider → useDataProvider → ForceGraph
```

## Reference: SperaxOS API

SperaxOS agents emit JSON events over WebSocket (or SSE as fallback). The connection endpoint and event format:

```
WebSocket: wss://api.speraxos.io/agents/v1/stream?apiKey={key}
SSE fallback: https://api.speraxos.io/agents/v1/events?apiKey={key}
```

Events arrive as JSON matching our `AgentEvent` type from Task 12. Example payloads:

```json
// Agent spawn
{
  "eventId": "evt_abc123",
  "type": "agent:spawn",
  "timestamp": 1712150400000,
  "agentId": "agent_001",
  "payload": {
    "name": "CodeReviewer",
    "role": "coder",
    "address": "0x1234...abcd"
  }
}

// Task started
{
  "eventId": "evt_abc124",
  "type": "task:started",
  "timestamp": 1712150401000,
  "agentId": "agent_001",
  "taskId": "task_001",
  "payload": {
    "description": "Review pull request #42",
    "priority": 1
  }
}

// Tool call
{
  "eventId": "evt_abc125",
  "type": "tool:started",
  "timestamp": 1712150402000,
  "agentId": "agent_001",
  "taskId": "task_001",
  "callId": "call_001",
  "payload": {
    "toolName": "read_file",
    "toolCategory": "filesystem",
    "inputSummary": "Reading src/index.ts"
  }
}

// Heartbeat (every 30s)
{
  "eventId": "evt_hb_001",
  "type": "heartbeat",
  "timestamp": 1712150430000,
  "agentId": "executor",
  "payload": {
    "activeAgents": 3,
    "uptime": 86400000,
    "totalTasksProcessed": 142
  }
}
```

## What to Build

### 1. WebSocket Hook (`hooks/useAgentEvents.ts` — NEW)

```typescript
interface UseAgentEventsOptions {
  /** SperaxOS API endpoint (WebSocket URL) */
  url: string;
  /** API key for authentication */
  apiKey?: string;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
  /** Reconnection delay in ms (default: 3000) */
  reconnectDelay?: number;
  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
}

interface UseAgentEventsReturn {
  /** Whether the WebSocket is connected */
  connected: boolean;
  /** Current executor state (from heartbeat events) */
  executorState: ExecutorState | null;
  /** Active agent identities */
  agents: Map<string, AgentIdentity>;
  /** Active flow traces (per-agent) */
  flows: Map<string, AgentFlowTrace>;
  /** Recent events (capped at 500) */
  recentEvents: AgentEvent[];
  /** Aggregate stats */
  stats: AgentAggregateStats;
  /** Connect to the WebSocket */
  connect: () => void;
  /** Disconnect */
  disconnect: () => void;
  /** Whether currently paused */
  paused: boolean;
  /** Toggle pause */
  setPaused: (paused: boolean) => void;
}
```

Key behaviors:
- Auto-reconnect with exponential backoff on disconnect
- Parse incoming JSON into `AgentEvent` objects
- Maintain agent registry (`Map<agentId, AgentIdentity>`) from `agent:spawn` events
- Build `AgentFlowTrace` objects incrementally as events stream in
- Track per-agent task/tool counts
- Aggregate stats: total agents, active tasks, tool calls/minute, completions, failures
- Cap `recentEvents` at 500 to prevent memory leak
- Heartbeat detection — mark executor as disconnected if no heartbeat for 60s

### 2. Mock Data Generator (`hooks/useAgentEventsMock.ts` — NEW)

For development/demo without a live SperaxOS connection, create a mock that generates realistic agent events:

```typescript
interface UseMockAgentEventsOptions {
  /** Number of simulated agents (default: 3) */
  agentCount?: number;
  /** Average events per second (default: 2) */
  eventsPerSecond?: number;
  /** Whether to auto-start */
  autoStart?: boolean;
}
```

The mock should:
- Simulate 2-5 agents with different roles (coder, researcher, planner, reviewer)
- Generate realistic task flows: spawn → plan → tool calls → sub-agent → complete
- Tool calls cycle through: read_file, grep_search, run_in_terminal, semantic_search, create_file
- Tasks have realistic durations (2-30 seconds)
- Sub-agents spawn occasionally (20% of tasks)
- ~10% of tasks fail with error messages
- Events arrive with slight random delays for realism

### 3. Agent Data Provider (`hooks/useAgentProvider.ts` — NEW)

Wraps `useAgentEvents` (or `useAgentEventsMock`) and implements the `DataProvider` interface from `packages/core/src/providers/index.ts`:

```typescript
function useAgentProvider(options: {
  mock?: boolean;
  url?: string;
  apiKey?: string;
}): {
  provider: DataProvider;
  /** Agent-specific data not available through generic DataProvider */
  agents: Map<string, AgentIdentity>;
  flows: Map<string, AgentFlowTrace>;
  executorState: ExecutorState | null;
}
```

Key mappings from agent events to DataProvider concepts:
- `agent:spawn` → `TopToken` (agent becomes a hub node with `mint = agentId`)
- `tool:started/completed` → `TraderEdge` (tool call = edge from tool to agent hub)
- `task:completed/failed` → `DataProviderEvent` with category `taskComplete`/`taskFailed`
- Agent stats → `DataProviderStats.counts`, `.totalAgents`, `.totalTransactions`

The provider should:
- Register itself via `registerProvider()` from core
- Use source ID `'agents'` (already defined in `SOURCE_CONFIGS`)
- Map agent activity to `TopToken[]` — each active agent is a "top token" (hub node)
  - `mint` = agentId
  - `symbol` = agent name
  - `trades` = total tool calls
  - `volumeSol` = total tasks completed (or use as a generic activity score)
- Map tool calls to `TraderEdge[]` — each tool call type is an edge
  - `trader` = `toolName` (e.g. "read_file", "grep_search")
  - `mint` = agentId (the agent hub it connects to)
  - `trades` = call count for this tool
- Convert events to `DataProviderEvent[]` for the live feed

### 4. Environment Configuration

Add environment variables for the SperaxOS connection:

```env
# .env.local (add to .env.example too)
NEXT_PUBLIC_SPERAXOS_WS_URL=wss://api.speraxos.io/agents/v1/stream
NEXT_PUBLIC_SPERAXOS_API_KEY=
NEXT_PUBLIC_AGENT_MOCK=true  # Use mock data when no API key
```

### 5. Integrate into useDataProvider

Update `hooks/useDataProvider.ts` to optionally consume agent provider stats alongside PumpFun:

```typescript
// In useDataProvider, add:
const agentProvider = useAgentProvider({
  mock: process.env.NEXT_PUBLIC_AGENT_MOCK === 'true',
  url: process.env.NEXT_PUBLIC_SPERAXOS_WS_URL,
  apiKey: process.env.NEXT_PUBLIC_SPERAXOS_API_KEY,
});

// Merge agent stats into the returned DataProviderStats
// - Concatenate topTokens (agent hubs + crypto hubs)
// - Concatenate traderEdges (tool edges + trade edges)
// - Merge counts, recentEvents
```

However, keep this merge **optional** — controlled by an `includeAgents` boolean prop or environment variable. The `/world` page should be able to toggle agents on/off. The `/agents` page uses agent data exclusively.

## Files to Create
- `hooks/useAgentEvents.ts` — **NEW** WebSocket hook for SperaxOS
- `hooks/useAgentEventsMock.ts` — **NEW** Mock agent event generator
- `hooks/useAgentProvider.ts` — **NEW** DataProvider wrapper

## Files to Modify
- `hooks/useDataProvider.ts` — Add optional agent provider integration
- `.env.example` — Add SperaxOS environment variables (create if doesn't exist)

## Acceptance Criteria
- [ ] `useAgentEventsMock` generates realistic events viewable in console
- [ ] Mock simulates 3+ agents with varying task flows
- [ ] `useAgentProvider` implements `DataProvider` interface correctly
- [ ] Agent events convert to `TopToken[]` and `TraderEdge[]` for graph consumption
- [ ] `useDataProvider` can merge agent + crypto stats when enabled
- [ ] WebSocket auto-reconnects on disconnect
- [ ] Heartbeat timeout marks connection as lost
- [ ] Events are capped to prevent memory leaks (500 recent events max)
- [ ] `npx next build` passes
- [ ] Mock mode works without any API keys configured
