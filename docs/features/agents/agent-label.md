# AgentLabel.tsx

## File Path
`/workspaces/visualize-web3-realtime/features/Agents/AgentLabel.tsx`

## Purpose
Tooltip component displayed when hovering over an agent hub node in the 3D force graph. Renders an HTML overlay anchored to a 3D position using drei's `<Html>` component, showing the agent's name, role, active task count, and total tool calls in a dark pill-shaped container with a downward caret pointer.

---

## Module Dependencies (Imports Breakdown)

### Line 7 - Client Directive
```ts
'use client';
```
Next.js client-side component directive. Required because this component renders in the browser within a React Three Fiber canvas context.

### Line 9 - Drei Html
```ts
import { Html } from '@react-three/drei';
```
`Html` - drei utility component that projects HTML content into a 3D scene. Accepts a `position` prop for 3D anchoring, `center` for centering, and passes through CSS `style`. The HTML remains crisp at any zoom level (not rasterized into the WebGL canvas).

### Line 10 - React memo
```ts
import { memo } from 'react';
```
`memo` - Higher-order component for shallow prop comparison to prevent unnecessary re-renders. Important because this component is rendered per-frame during hover interactions.

---

## Type Definitions

### AgentLabelProps (Lines 12-25)
Interface defining the component's props.

| Prop | Type | Description |
|---|---|---|
| `name` | `string` | Agent display name. Rendered in bold uppercase. |
| `role` | `string` | Agent role/type (e.g., "coder", "researcher"). Shown in the subtitle line. |
| `activeTasks` | `number` | Count of currently active tasks. Pluralized with "task"/"tasks". |
| `toolCalls` | `number` | Total tool calls made by this agent. Displayed as a raw number. |
| `position` | `[number, number, number]` | 3D anchor point for the tooltip, typically above the hub sphere. |
| `visible` | `boolean` | Controls tooltip visibility. When `false`, the component returns `null`. |

---

## Exported Members

### AgentLabel (Lines 27-102)
Named export. Memoized functional component.

```ts
export const AgentLabel = memo<AgentLabelProps>(...)
```

**Display Name**: `'AgentLabel'` (set on line 102 for React DevTools).

---

## Component Logic

### Visibility Gate (Line 29)
```ts
if (!visible) return null;
```
Early return when `visible` is `false`. No DOM or Three.js elements are rendered.

### Html Container (Lines 32-39)
The `<Html>` component from drei:
- `position={position}` - Anchors to the provided 3D coordinate.
- `center` - Centers the HTML element on the anchor point.
- `style` - Sets `pointerEvents: 'none'` to prevent the tooltip from intercepting mouse events on the 3D scene. Transition: 150ms ease on opacity.

### Outer Wrapper (Lines 41-48)
A flex column container with `alignItems: 'center'` and `transform: 'translateY(-12px)'` to offset the tooltip slightly upward from the anchor point.

### Pill Background (Lines 50-59)
Dark pill container:
- Background: `#1a1a1a` (near-black).
- Text color: `#ffffff`.
- Padding: 8px vertical, 14px horizontal.
- Border radius: 20px (fully rounded pill shape).
- Font: IBM Plex Mono, monospace.
- `whiteSpace: 'nowrap'` - Prevents text wrapping.
- `userSelect: 'none'` - Prevents text selection.

### Agent Name (Lines 62-72)
Primary text element:
- Font size: 11px, weight 600 (semi-bold).
- Text transform: uppercase.
- Letter spacing: 0.08em.
- Bottom margin: 4px.
- Content: `{name}`.

### Role and Stats (Lines 74-83)
Secondary text element:
- Font size: 10px, weight 400 (regular).
- Letter spacing: 0.04em.
- Color: `#cccccc` (light gray).
- Content format: `{role} . {activeTasks} task(s) . {toolCalls}`.
- Pluralization: "task" when `activeTasks === 1`, "tasks" otherwise.

### Downward Caret (Lines 86-95)
CSS triangle pointing downward:
- Zero width/height element.
- Border technique: 6px transparent left/right borders, 6px solid `#1a1a1a` top border.
- `marginTop: -1` to overlap slightly with the pill for seamless appearance.

---

## State Management
This component is stateless. All data is received via props.

---

## Side Effects
None. This component is purely presentational.

---

## Usage Example

```tsx
import { AgentLabel } from './AgentLabel';

// Within a React Three Fiber scene:
<AgentLabel
  name="CodeBot"
  role="coder"
  activeTasks={3}
  toolCalls={47}
  position={[0, 5, 0]}
  visible={isHovered}
/>
```
