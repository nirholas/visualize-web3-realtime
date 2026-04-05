# Agent Visualization — Task Execution Order

Run these tasks sequentially in new Claude Code chats. Each task builds on the previous. These tasks extend the existing Web3 visualization to support real-time AI agent activity from SperaxOS.

## What We're Building

A real-time 3D visualization of autonomous AI agents completing tasks — tool calls, sub-agent spawns, reasoning chains, and task completions rendered as an interactive force-directed graph. Agents from SperaxOS stream JSON events via WebSocket; each event becomes a visual element (node, edge, pulse, particle) in the same engine that powers the crypto world view.

Two views:
- **`/agents`** — Dedicated agent visualization page
- **World overlay** — Agent nodes mixed into the existing `/world` crypto graph (toggleable)

## Architecture

```
SperaxOS API (WebSocket/SSE)
    │
    ▼
useAgentProvider hook ──→ AgentProvider (implements DataProvider)
    │                          │
    ▼                          ▼
AgentForceGraph.tsx      useDataProvider (merged stats)
(dedicated /agents page)       │
                               ▼
                         ForceGraph.tsx (overlay mode in /world)
```

## Phase 1: Data Layer
1. `12-agent-event-types.md` — Agent event type system, task/tool/flow models
2. `13-speraxos-provider.md` — SperaxOS WebSocket hook + DataProvider implementation

## Phase 2: Visualization
3. `14-agent-force-graph.md` — Dedicated agent ForceGraph renderer with task-aware visuals
4. `15-agent-page.md` — `/agents` page assembly with sidebar, stats, live feed

## Phase 3: Integration
5. `16-agent-world-overlay.md` — Toggle agent nodes into the existing `/world` graph
6. `17-agent-ui-chrome.md` — Agent-specific timeline, task inspector panel, status indicators

## Phase 4: Executor & Polish
7. `18-agent-executor.md` — 24/7 autonomous agent executor with health monitoring
8. `19-agent-polish.md` — Visual polish, animations, performance tuning, dark/light theme
