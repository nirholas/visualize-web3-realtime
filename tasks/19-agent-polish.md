# Task 19: Agent Visualization — Polish & Performance

## Context
This is the final task for the agent visualization feature set. All the functional pieces are in place:
- Agent types and data pipeline (Tasks 12-13)
- Agent force graph renderer (Task 14)
- Agent page with UI chrome (Tasks 15, 17)
- World overlay (Task 16)
- 24/7 executor (Task 18)

Now we polish the visual experience, tune performance, and align the agent views with the existing world theme system (light/dark).

## What to Build

### 1. Visual Animations & Transitions

#### Agent Spawn Animation
When a new agent appears in the graph:
- Start at scale 0, expand to full size over 500ms with elastic ease
- Brief bright flash (white→brand color→default) during expansion
- Small particle burst (8-12 particles) outward from spawn point

#### Task Completion Celebration
When a task completes successfully:
- Green ring pulse expands from the agent hub (radius expands 3x, fades over 800ms)
- The task node shrinks and fades (300ms)
- A small "+1" text particle floats upward from the hub (like a score popup)

#### Tool Call Trail
When a tool particle travels from agent to tool cluster:
- Leave a fading trail (3 ghost positions, opacity 0.8→0.4→0.1)
- Trail follows a quadratic bezier curve (not straight line)
- On tool completion, particle returns via a different curve (slight randomness)

#### Error Shake
When a task fails:
- Agent hub does a quick horizontal shake (±2px, 3 cycles, 300ms)
- Red flash overlay on the hub sphere
- The failed task node turns red and floats downward before fading

#### Idle Breathing
When an agent is idle (no active tasks):
- Subtle scale oscillation: 1.0 → 1.05 → 1.0 over 3 seconds (sine wave)
- Slight color pulse: default → slightly lighter → default

### 2. Theme Support

Extend the existing theme system from `packages/ui/src/theme/` to support agent views:

#### Dark Theme (default for `/agents`)
- Background: `#0a0a0f`
- Agent hubs: `#1a1a2e` default, brand colors when active
- Edges: `rgba(255,255,255,0.06)`
- Text: `#e0e0e0`
- Sidebar: `rgba(10,10,15,0.9)` with backdrop blur

#### Light Theme
- Background: `#f8f9fa`
- Agent hubs: `#e0e0e0` default, brand colors when active
- Edges: `rgba(0,0,0,0.08)`
- Text: `#1a1a1a`
- Sidebar: `rgba(255,255,255,0.95)` with backdrop blur

Add theme tokens for agent-specific colors:
```typescript
// In packages/ui/src/tokens/colors.ts or a new agent-colors.ts
export const agentThemeTokens = {
  dark: {
    agentHub: '#1a1a2e',
    agentHubActive: '#c084fc',
    taskActive: '#60a5fa',
    taskComplete: '#34d399',
    taskFailed: '#f87171',
    toolParticle: '#818cf8',
    reasoning: '#c084fc40',
    edge: 'rgba(255,255,255,0.06)',
    background: '#0a0a0f',
  },
  light: {
    agentHub: '#e0e0e0',
    agentHubActive: '#9333ea',
    taskActive: '#3b82f6',
    taskComplete: '#16a34a',
    taskFailed: '#dc2626',
    toolParticle: '#6366f1',
    reasoning: '#9333ea40',
    edge: 'rgba(0,0,0,0.08)',
    background: '#f8f9fa',
  },
};
```

### 3. Performance Tuning

#### InstancedMesh Optimization
- Task nodes: single `InstancedMesh` (max 200 instances)
- Tool particles: single `InstancedMesh` (max 200 instances, pool-allocated)
- Update per-instance transforms and colors via typed arrays (no object allocation per frame)

#### Event Batching
- Batch UI updates: collect events over 100ms, then update state once
- The force simulation tick should run at a fixed rate (60Hz) independent of render framerate

#### Memory Management
- Cap stored events at 500 per agent, 2000 total
- Remove completed task nodes after 5s fade-out
- Recycle tool particles from a fixed pool
- Clean up agent flow traces when agent shuts down

#### GPU Optimization
- All text labels use `<Html>` from drei (rendered by browser, not GPU)
- Limit active labels to 5 at once (hovered/selected only)
- Use `frustumCulled={true}` on all meshes
- Ground plane: simple single-color `<mesh>` (no texture)

### 4. Responsive Layout

#### Desktop (>1024px)
- Full sidebar + 3D graph + live feed (three-column)
- Task inspector as slide-out panel

#### Tablet (768-1024px)
- Sidebar collapses to icon-only mode
- Live feed becomes a horizontal ticker at the bottom
- Task inspector as a bottom sheet (half-height)

#### Mobile (<768px)
- No sidebar (agents shown in a bottom tab bar)
- 3D graph takes full screen
- Swipe up for live feed overlay
- Task inspector as full-screen modal
- Disable MapControls pan (use touch gestures only)

### 5. Accessibility

- All interactive elements have `aria-label`
- Status indicators have `aria-live="polite"` for screen readers
- Agent sidebar is keyboard-navigable (Tab, Enter, Space)
- Color contrast meets WCAG 2.1 AA for all text
- Focus ring visible on all interactive elements
- Reduced motion: respect `prefers-reduced-motion` — disable breathing, particles, and pulse animations

### 6. Share/Screenshot for Agent View

Extend the existing share system to support the agent view:
- "Share Agent World" button generates a screenshot of the agent 3D graph
- Share URL: `/agents?agentId=X` deep-links to a specific agent
- OG image generation: include agent stats in the metadata image

### 7. Loading State

Create a loading screen for the agent page (similar to `LoadingScreen.tsx` in the World feature):
- Show while connecting to executor WebSocket
- Animated agent icon (hexagon morphing/pulsing)
- "Connecting to agent executor..." text
- Once connected and first snapshot received, fade to the graph

### 8. Error States

Handle error scenarios gracefully:
- **Executor offline**: Show a banner + retry connection every 5s
- **All agents idle**: Show a centered message "All agents idle. No active tasks."
- **No events**: Live feed shows "Waiting for agent activity..."
- **WebSocket disconnect**: Yellow banner "Reconnecting..." with countdown

## Files to Create
- `features/Agents/AgentLoadingScreen.tsx` — **NEW** Loading/connecting screen
- `packages/ui/src/tokens/agent-colors.ts` — **NEW** Agent theme tokens (if separate file preferred)

## Files to Modify
- `features/Agents/AgentForceGraph.tsx` — Add animations, particle trails, error shake, breathing
- `features/Agents/constants.ts` — Add animation timing constants
- `features/Agents/AgentSidebar.tsx` — Responsive collapse, accessibility
- `features/Agents/AgentStatsBar.tsx` — Responsive layout
- `features/Agents/AgentLiveFeed.tsx` — Responsive layout, error states
- `features/Agents/AgentTimeline.tsx` — Responsive layout
- `features/Agents/TaskInspector.tsx` — Responsive bottom sheet on mobile
- `features/Agents/ExecutorBanner.tsx` — Error/reconnecting states
- `app/agents/page.tsx` — Loading state, error handling, responsive layout
- `packages/ui/src/theme/themes.ts` — Add agent theme tokens
- `packages/ui/src/tokens/colors.ts` — Add agent color tokens

## Acceptance Criteria
- [ ] Agent spawn animation plays on new agent
- [ ] Task completion pulse ring animation works
- [ ] Tool call particles have bezier curve trails
- [ ] Error shake animation on task failure
- [ ] Idle breathing animation on inactive agents
- [ ] Dark and light themes both work on `/agents`
- [ ] Theme toggle switches agent colors correctly
- [ ] 60fps maintained with 10 agents + 200 tasks + 200 particles
- [ ] Event batching prevents UI jank on burst events
- [ ] Memory stays stable over 1 hour of continuous events
- [ ] Layout responsive at desktop/tablet/mobile breakpoints
- [ ] Sidebar collapses correctly on tablet
- [ ] All interactive elements keyboard accessible
- [ ] `prefers-reduced-motion` disables animations
- [ ] Loading screen shows while connecting
- [ ] Error states display correctly (offline, no events, disconnect)
- [ ] Share/screenshot works for agent view
- [ ] `npx next build` passes
