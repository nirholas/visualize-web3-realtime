# Task 16: Agent World Overlay

## Goal
Toggle agent nodes into the existing `/world` crypto graph — agent activity visible alongside trading data.

## Requirements
- Toggle button in world view to show/hide agent overlay
- Agent nodes render as distinct visual type in ForceGraph
- Agent-to-hub edges when agents interact with tokens
- Agent activity indicators (pulse, glow) in world context
- Merged stats when overlay is active
- Agent nodes don't interfere with trading node layout
- Smooth transition when toggling overlay on/off

## Files
- `features/World/ForceGraph.tsx`
- `app/world/page.tsx`
- `features/World/ProtocolFilterSidebar.tsx`
