# Task 14: Dedicated Agent ForceGraph Renderer

## Goal
Enhance the AgentForceGraph component with task-aware visuals — agent hubs, task orbits, tool particles, completion pulses, reasoning halos.

## Requirements
- Three-tier node system: agent hubs → task orbit nodes → tool particles
- InstancedMesh optimization for performance
- Agent hub spawn flash animation
- Task orbit animation around agent hubs
- Tool particles flying from agents to tool clusters
- Completion pulse rings
- Reasoning halo with sine-wave oscillation
- Error shake animation
- Camera focus on agent selection
- WebGL fallback

## Files
- `features/Agents/AgentForceGraph.tsx`
- `features/Agents/constants.ts`
