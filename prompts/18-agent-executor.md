# Task 18: Agent Executor

## Goal
24/7 autonomous agent executor with health monitoring, task queue, state persistence, and WebSocket event broadcasting.

## Requirements
- ExecutorServer with REST API + WebSocket upgrade
- AgentManager with spawn/task lifecycle
- TaskQueue with priority, retry logic, timeout checking
- StateStore with SQLite persistence
- EventBroadcaster for real-time WebSocket streaming
- SperaxOSClient with mock fallback
- HealthMonitor with pass/warn/fail states
- Background auto-spawning loop for autonomous operation
- Graceful shutdown handling

## Files
- `packages/executor/src/ExecutorServer.ts`
- `packages/executor/src/AgentManager.ts`
- `packages/executor/src/TaskQueue.ts`
- `packages/executor/src/StateStore.ts`
- `packages/executor/src/EventBroadcaster.ts`
- `packages/executor/src/SperaxOSClient.ts`
- `packages/executor/src/HealthMonitor.ts`
- `packages/executor/src/index.ts`
