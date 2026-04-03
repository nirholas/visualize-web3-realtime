# Task 13: SperaxOS WebSocket Hook + DataProvider

## Goal
Complete the SperaxOS WebSocket connection and AgentProvider DataProvider implementation for real-time agent event streaming.

## Requirements
- `AgentProvider` implements `DataProvider` interface fully
- Real WebSocket connection to SperaxOS API when key is available
- Mock fallback mode for demo/development
- `AgentTracker` REST API polling for agent discovery
- Event detection heuristics for agent activity
- Proper reconnection logic with exponential backoff

## Files
- `packages/providers/src/agents/AgentProvider.ts`
- `packages/providers/src/agents/tracker.ts`
- `packages/providers/src/agents/detection.ts`
- `packages/providers/src/agents/categories.ts`
- `packages/executor/src/SperaxOSClient.ts`
