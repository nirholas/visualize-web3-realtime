# Task 19: Agent Visual Polish

## Goal
Visual polish, animations, performance tuning, dark/light theme support for the agent visualization system.

## Requirements
- Smooth spawn/despawn transitions
- Particle system optimization (instancing, culling)
- Theme-aware colors for all agent UI
- Reduced motion support (prefers-reduced-motion)
- Performance budget: 60fps with 200+ agent nodes
- Memory cleanup on unmount
- Loading states and empty states
- Consistent styling with IBM Plex Mono font family

## Files
- `features/Agents/AgentForceGraph.tsx`
- `features/Agents/constants.ts`
- `packages/ui/src/tokens/agent-colors.ts`
- All features/Agents/*.tsx components
