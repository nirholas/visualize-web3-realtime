# features/Agents

AI agent activity visualization. Shows autonomous agent tasks, tool calls, and inter-agent communication as a force-directed graph.

## Key Files

- **AgentForceGraph.tsx** — 3D graph of agent nodes (agents, tasks, tools, tokens)
- **AgentSidebar.tsx** — Agent details panel with live task/tool status
- **AgentStatsBar.tsx** — Agent metrics (active agents, tasks, tool calls)
- **AgentTimeline.tsx** — Temporal view of agent events
- **AgentLiveFeed.tsx** — Scrolling feed of agent events (framer-motion AnimatePresence)
- **TaskInspector.tsx** — Detailed task/tool call inspection
- **ExecutorBanner.tsx** — Connection status for executor backend
- **constants.ts** — Agent-specific colors, sizes, timing constants

## Subdirectories

- `utils/` — Shared utilities: formatting, time helpers, accessibility. Re-exports common functions from World utils, adds agent-specific helpers. **Tested** — see `utils/__tests__/`

## Key Patterns

- Utility layer mirrors World's pattern (`utils/shared.ts`, `utils/accessibility.ts`)
- `usePrefersReducedMotion` and `FOCUS_RING` from shared accessibility module
- `useAnimatedValue` hook for smooth stat counter transitions
- `timeAgo(ts, now)` is hydration-safe (accepts explicit `now` param)
- Framer-motion `AnimatePresence` for live feed entry/exit animations
- Components use `agentThemeTokens[colorScheme]` for dark/light theme support

## Data Flow

Agent events come from:
1. `packages/providers/src/agents/` — detection and mock providers
2. `packages/executor/` — real executor backend (via `/api/executor/` proxy)
3. `hooks/useAgentEvents.ts` / `useAgentEventsMock.ts`

## Types

All agent types are in `@web3viz/core` (`types/agent.ts`):
- `AgentEvent`, `AgentTask`, `AgentToolCall`, `AgentIdentity`
- `AgentGraphNode`, `AgentGraphNodeType`

## Testing

```bash
npm test -- --run features/Agents
```
