# AgentForceGraph.tsx

## File Path
`/workspaces/visualize-web3-realtime/features/Agents/AgentForceGraph.tsx`

## Purpose
Force-directed 3D visualization of AI agent activity rendered via React Three Fiber. Displays agent hubs as glowing spheres, orbiting task nodes, animated tool call particles, sub-agent parent-child edge connections, reasoning halos during thinking phases, and an executor heartbeat pulse indicator. Architecture mirrors the project's existing `ForceGraph.tsx` but is tailored specifically for agent events.

---

## Module Dependencies (Imports Breakdown)

### Line 14 - Client Directive
```ts
'use client';
```
Next.js directive marking this module as a client-side component. Required because the module uses browser-only APIs (WebGL, Canvas, requestAnimationFrame).

### Line 16 - React Core
```ts
import React, { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
```
- `React` - Namespace import for JSX transformation.
- `forwardRef` - Enables parent components to obtain a ref handle to the graph.
- `memo` - Performance optimization; prevents re-renders when props are unchanged.
- `useEffect` - Side effects: WebGL detection, hub/task/particle state updates, event processing, camera setup.
- `useImperativeHandle` - Exposes imperative methods (`focusAgent`, `getCanvasElement`, `getAgentCount`) to parent via ref.
- `useMemo` - Memoizes geometry, material, and temporary Three.js objects to avoid per-frame allocations.
- `useRef` - Persistent mutable references for DOM elements, Three.js objects, camera API, and animation state.
- `useState` - Local state for hubs, tasks, particles, sub-agent edges, WebGL support, and hover tracking.

### Line 17 - React Three Fiber
```ts
import { Canvas, useFrame, useThree } from '@react-three/fiber';
```
- `Canvas` - Root R3F component that sets up the WebGL renderer, scene, and camera.
- `useFrame` - Hook that runs a callback on every animation frame; used for breathing, pulsing, color lerping, orbital motion, particle interpolation, and edge animation.
- `useThree` - Provides access to the Three.js `scene` and `camera` objects within the fiber context.

### Line 18 - Drei Controls
```ts
import { MapControls } from '@react-three/drei';
```
`MapControls` - Orbit/pan controls configured for a top-down map-like camera interaction (rotation disabled, damping enabled).

### Line 19 - Three Stdlib Type
```ts
import type { MapControls as MapControlsImpl } from 'three-stdlib';
```
Type-only import for the underlying `MapControls` implementation class. Used to type the controls ref for programmatic `enabled` toggling and target updates.

### Line 20 - Three.js
```ts
import * as THREE from 'three';
```
Full Three.js namespace. Used for `Vector3`, `Color`, `Object3D`, `BufferGeometry`, `Float32BufferAttribute`, `SphereGeometry`, `MeshStandardMaterial`, `DynamicDrawUsage`, `BackSide`, and math utilities.

### Lines 22-30 - Core Domain Types
```ts
import type { TopToken, TraderEdge, AgentFlowTrace, ExecutorState, AgentEvent, AgentTask, AgentToolCall } from '@web3viz/core';
```
- `TopToken` - Agent data model (mint address, symbol, volume). Each agent maps to a hub node.
- `TraderEdge` - Tool call edges modeled as trader edges for compatibility with the existing graph infrastructure.
- `AgentFlowTrace` - Real-time flow data per agent: tasks, tool calls, sub-agents, reasoning state.
- `ExecutorState` - Global executor health: uptime, last heartbeat, active agents, total tasks processed.
- `AgentEvent` - Discrete events (tool:started, reasoning:start/end, task:started/completed/failed, agent:spawn, subagent:spawn, reasoning:update).
- `AgentTask` - Individual task metadata (taskId, description, status, createdAt).
- `AgentToolCall` - Tool call metadata (callId, toolName, status, inputSummary, startedAt, endedAt).

### Line 31 - Share Panel Types
```ts
import type { ShareColors } from '../World/SharePanel';
```
Color override interface used when exporting/sharing the visualization as an image. Provides `background` color.

### Line 33 - AgentLabel
```ts
import { AgentLabel } from './AgentLabel';
```
Tooltip component rendered via drei's `<Html>` when hovering over an agent hub node.

### Line 34 - TaskInspectorPanel
```ts
import { TaskInspectorPanel } from './TaskInspector';
```
Slide-out detail panel for inspecting individual tasks (imported but used by the parent orchestrator).

### Lines 35-42 - Constants
```ts
import { AGENT_COLOR_PALETTE, AGENT_COLORS, AGENT_GRAPH_CONFIG, TOOL_CLUSTER_POSITIONS, TOOL_CLUSTER_ICONS, TASK_STATUS_COLORS } from './constants';
```
- `AGENT_COLOR_PALETTE` - Array of 8 hex colors assigned cyclically to agent hubs.
- `AGENT_COLORS` - Named color constants for nodes, tasks, particles, heartbeat, edges.
- `AGENT_GRAPH_CONFIG` - Performance and animation tuning parameters (max nodes, speeds, radii, durations).
- `TOOL_CLUSTER_POSITIONS` - 2D coordinates for tool category clusters in the scene.
- `TOOL_CLUSTER_ICONS` - Emoji/text icons per tool category.
- `TASK_STATUS_COLORS` - Maps task status strings to hex colors.

---

## Type Definitions

### AgentHubState (Lines 48-60)
Internal state for each agent hub node in the 3D scene.

| Property | Type | Description |
|---|---|---|
| `id` | `string` | Unique agent identifier (mint address). |
| `name` | `string` | Display name of the agent. |
| `role` | `string` | Agent role (e.g., "coder", "researcher"). |
| `position` | `THREE.Vector3` | Current 3D position in the scene. |
| `radius` | `number` | Sphere radius, scaled by relative volume. |
| `color` | `string` | Hex color from the palette. |
| `activeTasks` | `number` | Count of non-completed, non-failed tasks. |
| `totalToolCalls` | `number` | Cumulative tool call count. |
| `isReasoning` | `boolean` | Whether the agent is currently in a reasoning/thinking phase. |
| `reasoningStartTime` | `number` (optional) | Timestamp when reasoning began, used for halo animation timing. |
| `pulseEvents` | `Array<{ timestamp: number; status: 'complete' \| 'failed' }>` | Recent pulse events for visual feedback rings. |

### TaskNodeState (Lines 62-72)
Internal state for each task node orbiting an agent hub.

| Property | Type | Description |
|---|---|---|
| `id` | `string` | Task identifier. |
| `agentId` | `string` | Parent agent identifier. |
| `description` | `string` | Task description text. |
| `status` | `string` | Current status (queued, in-progress, completed, failed, etc.). |
| `position` | `THREE.Vector3` | Base position (copied from parent hub). |
| `angle` | `number` | Orbital angle offset in radians. |
| `color` | `string` | Status-derived color. |
| `isNew` | `boolean` | True if created within the last 1000ms. |
| `createdAt` | `number` | Creation timestamp for fade-out calculations. |

### ToolParticleState (Lines 74-83)
Internal state for each animated tool call particle.

| Property | Type | Description |
|---|---|---|
| `id` | `string` | Event identifier. |
| `agentId` | `string` | Source agent identifier. |
| `toolCategory` | `string` | Tool category (filesystem, search, terminal, etc.). |
| `startPos` | `THREE.Vector3` | Origin position (agent hub location). |
| `targetPos` | `THREE.Vector3` | Destination position (tool cluster location). |
| `progress` | `number` | Animation progress from 0 to 1. |
| `path` | `THREE.Vector3[]` | Intermediate path points for bezier interpolation. |
| `createdAt` | `number` | Creation timestamp. |

### CameraAnimation (Lines 85-93)
State for smooth camera transitions.

| Property | Type | Description |
|---|---|---|
| `durationMs` | `number` | Total animation duration in milliseconds. |
| `fromPos` | `THREE.Vector3` | Starting camera position. |
| `toPos` | `THREE.Vector3` | Target camera position. |
| `fromLookAt` | `THREE.Vector3` | Starting look-at point. |
| `toLookAt` | `THREE.Vector3` | Target look-at point. |
| `startedAt` | `number` | `performance.now()` timestamp when animation began. |
| `onDone` | `() => void` (optional) | Callback invoked when animation completes. |

### CameraApi (Lines 95-98)
Imperative camera control interface.

| Method | Signature | Description |
|---|---|---|
| `animateTo` | `(pos: [number, number, number], lookAt: [number, number, number], durationMs: number) => Promise<void>` | Smoothly transitions the camera to a new position and look-at point. |
| `setOrbitEnabled` | `(enabled: boolean) => void` | Enables or disables user orbit controls. |

---

## Exported Members

### AgentForceGraphProps (Lines 104-127)
Props interface for the main component.

| Prop | Type | Default | Description |
|---|---|---|---|
| `agents` | `TopToken[]` | required | Array of agent data; each agent becomes a hub sphere. |
| `toolEdges` | `TraderEdge[]` | required | Tool call edges for visualization. |
| `flows` | `Map<string, AgentFlowTrace>` | required | Live flow traces keyed by agent ID. |
| `executorState` | `ExecutorState \| null` | required | Global executor health state. |
| `recentEvents` | `AgentEvent[]` | required | Recent agent events driving animations. |
| `activeAgentId` | `string \| null` | required | Currently selected agent ID. |
| `onAgentSelect` | `(agentId: string \| null) => void` | required | Callback when a hub is clicked. |
| `backgroundColor` | `string` | `'#ffffff'` | Canvas background color. |
| `shareColors` | `ShareColors` | `undefined` | Color overrides for sharing/export mode. |
| `height` | `string \| number` | `'100%'` | CSS height of the canvas container div. |
| `colorScheme` | `'dark' \| 'light'` | `undefined` | Theme-aware rendering mode. |

### AgentForceGraphHandle (Lines 129-133)
Imperative handle interface exposed via `forwardRef`.

| Method | Signature | Description |
|---|---|---|
| `getCanvasElement` | `() => HTMLCanvasElement \| null` | Returns the underlying `<canvas>` DOM element for screenshot/export. |
| `focusAgent` | `(agentId: string, durationMs?: number) => Promise<void>` | Smoothly animates the camera to focus on a specific agent hub. Default duration: 1200ms. |
| `getAgentCount` | `() => number` | Returns the current number of agent hubs. |

### Default Export (Line 997)
```ts
export default memo(AgentForceGraphInner);
```
The main component wrapped in `memo` for render optimization.

---

## Internal Components

### SceneBackground (Lines 139-146)
Memoized component that sets the Three.js scene background color.
- **Props**: `{ color: string }`.
- **Side Effect**: Updates `scene.background` via `useEffect` whenever `color` changes.
- **Renders**: Nothing (`null`).

### Ground (Lines 152-158)
Memoized ground plane mesh.
- Renders a 200x200 unit plane at y=-1, rotated to lie flat.
- Uses `meshStandardMaterial` with color `#f8f8fa`.
- Receives shadows.

### AgentHubNode (Lines 164-284)
Individual agent sphere with animations.

**Props** (`AgentHubNodeProps`):

| Prop | Type | Description |
|---|---|---|
| `hub` | `AgentHubState` | Hub state data. |
| `isActive` | `boolean` | Whether this hub is the currently selected agent. |
| `isDimmed` | `boolean` | Whether this hub should be dimmed (another agent is selected). |
| `isHovered` | `boolean` | Whether the mouse is over this hub. |
| `onPointerOver` | `() => void` | Hover enter callback. |
| `onPointerOut` | `() => void` | Hover exit callback. |
| `onClick` | `() => void` | Click callback. |

**Refs**:
- `groupRef` - THREE.Group for positioning.
- `meshRef` - Main sphere mesh for scale animations.
- `haloRef` - Reasoning halo sphere (rendered only when `isReasoning`).
- `materialRef` - Main mesh material for color/opacity lerping.
- `haloMaterialRef` - Halo material for opacity animation.
- `targetColor` - Mutable ref tracking the desired color for smooth lerping.
- `targetOpacity` - Mutable ref tracking the desired opacity.

**Animations (useFrame)**:
1. **Breathing**: Sinusoidal scale oscillation based on `breathingPeriod` and `breathingAmplitude`.
2. **Active Pulse**: Additional sinusoidal scale multiplier when `isActive`.
3. **Reasoning Halo**: Expanding/contracting halo sphere with fading opacity during reasoning phases.
4. **Color Lerp**: Exponential interpolation of material color and opacity toward target values using `delta`.

**JSX Structure**:
- `<group>` container positioned at hub.position.
  - `<mesh>` main sphere (32x32 segments, roughness 0.4, metalness 0.1, transparent).
  - `<mesh>` reasoning halo (conditional, `BackSide` rendering, semi-transparent purple).
  - `<AgentLabel>` hover tooltip (conditional on `isHovered`).

### TaskNodes (Lines 290-366)
InstancedMesh rendering all task nodes across all agents.

**Props** (`TaskNodesProps`):

| Prop | Type | Description |
|---|---|---|
| `tasks` | `Map<string, TaskNodeState[]>` | Tasks grouped by agent ID. |
| `selectedAgentId` | `string \| null` | Currently selected agent for potential filtering. |

**Memoized Objects**:
- `tempObj` - Reusable `THREE.Object3D` for matrix calculations.
- `tempColor` - Reusable `THREE.Color` for instance coloring.
- `geometry` - `SphereGeometry` with `taskNodeGeometrySegments` (8) segments.
- `material` - `MeshStandardMaterial` with roughness 0.6, metalness 0.2, transparent.

**Animation (useFrame)**:
- Iterates all tasks up to `maxTaskNodes` (200).
- Computes orbital position using `angle + orbitTime` at `taskOrbitRadius` (4 units).
- Adds vertical bobbing via `sin(angle * 2)`.
- Colors instances based on `TASK_STATUS_COLORS`.
- Pulses active tasks (`in-progress`) with sinusoidal color scaling.
- Fades completed/failed tasks over `pulseDuration` (1000ms).
- Updates instance matrices and colors each frame.

### ToolCallParticles (Lines 372-449)
InstancedMesh rendering animated particles for tool invocations.

**Props** (`ToolCallParticlesProps`):

| Prop | Type | Description |
|---|---|---|
| `particles` | `ToolParticleState[]` | Active particle states. |

**Memoized Objects**:
- `tempObj` - Reusable Object3D.
- `tempColor` - Reusable Color.
- `geometry` - Low-poly sphere (6x6 segments) for performance.
- `material` - Metallic (0.7) material with emissive color matching `toolParticle`.

**Animation (useFrame)**:
- Iterates particles up to `maxToolParticles` (200).
- Applies cubic ease-in-out easing to progress value.
- If path has 2+ points: cubic bezier interpolation between start and target positions.
- Otherwise: linear interpolation.
- Scales particles at 0.1 units.
- Colors with fade based on eased progress.

### SubAgentEdges (Lines 455-526)
LineSegments rendering parent-to-child agent connections.

**Props** (`SubAgentEdgesProps`):

| Prop | Type | Description |
|---|---|---|
| `edges` | `Array<{ parentId, childId, parentPos, childPos }>` | Edge definitions with positions. |

**Setup (useEffect)**:
- Creates a `BufferGeometry` with pre-allocated `Float32Array` buffers for positions and colors (500 edges max, 6 floats per edge).
- Sets `DynamicDrawUsage` on both attributes for GPU optimization.
- Initializes draw range to 0.

**Animation (useFrame)**:
- Updates position buffer with current parent/child positions.
- Applies pulsing color via sinusoidal oscillation at `edgePulseSpeed` Hz.
- Color channels are slightly different (green channel at 0.7x) for a purple-green tint.
- Sets draw range to `count * 2` vertices.

### ExecutorHeartbeat (Lines 532-587)
Global pulse indicator showing executor health.

**Props** (`ExecutorHeartbeatProps`):

| Prop | Type | Description |
|---|---|---|
| `executorState` | `ExecutorState \| null` | Current executor state. |

**Health Logic** (`getHealthColor`):
- No executor state: `heartbeatDead` (red).
- Last heartbeat > 60s ago: `heartbeatDead`.
- Last heartbeat > 30s ago: `heartbeatWarning` (amber).
- Otherwise: `heartbeatHealthy` (green).

**Animation (useFrame)**:
- Torus ring pulsing at frequency 2 (scale oscillation 1.0 +/- 0.3).
- Color and emissive updated to match health status.

**JSX**: Positioned at y=-5, renders a torus geometry (radius 2, tube 0.1).

### CameraSetup (Lines 593-666)
Camera initialization and animation controller.

**Props**: `{ apiRef: React.MutableRefObject<CameraApi | null> }`.

**Initialization (useEffect)**:
- Sets camera to position (0, 40, 20) looking at origin.
- Populates `apiRef.current` with `animateTo` and `setOrbitEnabled` methods.

**animateTo Implementation**:
- Returns a Promise that resolves when animation completes.
- Captures current camera position and forward direction.
- Stores animation state in `animRef`.

**Animation (useFrame)**:
- Applies cubic ease-in-out interpolation to camera position and look-at target.
- Updates `MapControls` target to match the look-at point.
- Clears animation and calls `onDone` when t >= 1.

**MapControls Configuration**:
- `enableRotate={false}` - No rotation, map-like panning only.
- `enableDamping` with `dampingFactor={0.15}`.
- Distance range: 10-150 units.
- `screenSpacePanning` - Panning moves in screen space.

### NetworkScene (Lines 672-736)
Composition component assembling all 3D scene elements.

**Props** (`NetworkSceneProps`): Hubs, tasks, particles, subAgentEdges, executorState, activeAgentId, onSelectAgent, shareColors.

**State**: `hoveredAgent` - tracks which agent hub the mouse is over.

**JSX Structure**:
1. `SceneBackground` (conditional on `shareColors`).
2. `ambientLight` (intensity 0.7).
3. `directionalLight` at (20, 40, 20) with intensity 0.6.
4. `AgentHubNode` mapped from hubs array with active/dimmed/hover logic.
5. `TaskNodes` instanced mesh.
6. `ToolCallParticles` instanced mesh.
7. `SubAgentEdges` line segments.
8. `ExecutorHeartbeat` torus indicator.
9. `Ground` plane.

---

## Main Component: AgentForceGraphInner (Lines 742-997)

### State Management

| State Variable | Type | Purpose |
|---|---|---|
| `hubs` | `AgentHubState[]` | Computed hub states from agents + flows. |
| `tasks` | `Map<string, TaskNodeState[]>` | Task nodes grouped by agent ID. |
| `particles` | `ToolParticleState[]` | Active tool call particles. |
| `subAgentEdges` | `Array<...>` | Parent-child agent connections. |
| `webglSupported` | `boolean` | Whether the browser supports WebGL. |

### Side Effects

1. **Hub Update** (Line 768): Recomputes `hubs` from `agents` and `flows`. Positions agents in a circle (radius 15). Scales radius by relative volume. Assigns colors cyclically from `AGENT_COLOR_PALETTE`.

2. **Task Update** (Line 796): Rebuilds task map from `flows`. Slices to `maxTaskNodes`. Distributes orbital angles evenly. Marks tasks newer than 1s as `isNew`.

3. **Event Processing** (Line 824): Processes `recentEvents`:
   - `reasoning:start` - Sets `isReasoning=true` on the hub.
   - `reasoning:end` - Sets `isReasoning=false`.
   - `tool:started` - Spawns a new `ToolParticleState` from agent position to the appropriate tool cluster.

4. **Particle Progress** (Line 866): 60fps interval timer advancing particle progress by `toolParticleSpeed` (0.02/frame) and removing completed particles (progress >= 1).

5. **Sub-Agent Edges** (Line 882): Rebuilds edge list from flows' `subAgents` arrays, matching to hub positions.

6. **WebGL Detection** (Line 922): Tests for `webgl2` or `webgl` context support on mount.

### Imperative Handle (Line 905)

Exposed via `useImperativeHandle`:
- `getCanvasElement()` - Queries the container div for its canvas child.
- `focusAgent(agentId, durationMs)` - Finds the hub, animates camera above it at y=30 looking down.
- `getAgentCount()` - Returns `hubs.length`.

### WebGL Fallback (Lines 932-969)

When WebGL is not supported, renders a centered fallback message with IBM Plex Mono font, displaying "WebGL Not Supported" with a subtitle.

### Canvas Render (Lines 972-993)

- Container div with relative positioning.
- `<Canvas>` with FOV 45, near 0.1, far 500, initial position (0, 40, 20).
- Antialiasing enabled, alpha disabled, `preserveDrawingBuffer` true (for screenshots).
- DPR capped at [1, 1.5] for performance.
- Contains `CameraSetup` and `NetworkScene`.

---

## Usage Example

```tsx
import AgentForceGraph, { AgentForceGraphHandle } from '@/features/Agents/AgentForceGraph';

function AgentWorldView() {
  const graphRef = useRef<AgentForceGraphHandle>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  const handleSelectAgent = (id: string | null) => {
    setActiveAgent(id);
    if (id) graphRef.current?.focusAgent(id);
  };

  return (
    <AgentForceGraph
      ref={graphRef}
      agents={topAgents}
      toolEdges={toolEdges}
      flows={agentFlows}
      executorState={executor}
      recentEvents={events}
      activeAgentId={activeAgent}
      onAgentSelect={handleSelectAgent}
      height="100vh"
      colorScheme="dark"
    />
  );
}
```
