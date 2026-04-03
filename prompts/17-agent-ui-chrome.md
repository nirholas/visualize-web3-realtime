# Task 17: Agent UI Chrome

## Goal
Agent-specific timeline, task inspector panel, and status indicators for both /agents and /world views.

## Requirements
- Timeline scrubber showing task activity over configurable window
- Task inspector panel with tool calls, sub-agents, reasoning text
- Status indicators (active/idle/error/shutdown) with pulse animations
- Agent labels in 3D view on hover
- Executor health banner
- Loading screen while first data arrives

## Files
- `features/Agents/AgentTimeline.tsx`
- `features/Agents/TaskInspector.tsx`
- `features/Agents/AgentStatusIndicator.tsx`
- `features/Agents/AgentLabel.tsx`
- `features/Agents/ExecutorBanner.tsx`
- `features/Agents/AgentLoadingScreen.tsx`
