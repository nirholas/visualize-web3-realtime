# features/Agents

AI agent activity visualization. Shows autonomous agent tasks, tool calls, and inter-agent communication as a force-directed graph.

## Key Files

- **AgentForceGraph.tsx** — 3D graph of agent nodes (agents, tasks, tools, tokens)
- **AgentSidebar.tsx** — Agent details panel with live task/tool status
- **AgentStatsBar.tsx** — Agent metrics (active agents, tasks, tool calls)
- **AgentTimeline.tsx** — Temporal view of agent events
- **AgentLiveFeed.tsx** — Scrolling feed of agent events
- **TaskInspector.tsx** — Detailed task/tool call inspection
- **ExecutorBanner.tsx** — Connection status for executor backend
- **constants.ts** — Agent-specific colors, sizes, timing constants

## Data Flow

Agent events come from:
1. `packages/providers/src/agents/` — detection and mock providers
2. `packages/executor/` — real executor backend (via `/api/executor/` proxy)
3. `hooks/useAgentEvents.ts` / `useAgentEventsMock.ts`

## Types

All agent types are in `@web3viz/core` (`types/agent.ts`):
- `AgentEvent`, `AgentTask`, `AgentToolCall`, `AgentIdentity`
- `AgentGraphNode`, `AgentGraphNodeType`
