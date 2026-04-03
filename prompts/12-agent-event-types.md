# Task 12: Agent Event Type System

## Goal
Define the complete agent event type system for SperaxOS AI agent visualization — task/tool/flow models that drive all downstream rendering.

## Requirements
- `AgentIdentity`: agent ID, name, role, address, parentAgentId, createdAt
- `AgentTask`: description, status (queued/planning/in-progress/waiting/completed/failed/cancelled), priority, result/error, timestamps
- `AgentToolCall`: tool name, category (filesystem/search/terminal/network/code/reasoning), status, duration, input/output
- `AgentEvent`: 26+ event types covering spawn, task lifecycle, tool calls, sub-agent delegation, reasoning phases
- `AgentFlowTrace`: aggregated agent activity — tasks, tool calls, events, sub-agents
- `ExecutorState`: executor health (status, active agents, uptime, heartbeat)
- `AgentGraphNode`: visual stage (idle/active/pulsing/fading/complete/error) with intensity for animations

## Files
- `packages/core/src/types/agent.ts`
