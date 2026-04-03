# AgentLoadingScreen.tsx

## File Path
`/workspaces/visualize-web3-realtime/features/Agents/AgentLoadingScreen.tsx`

## Purpose
Full-screen loading overlay displayed while the agent world connects to the executor. Shows a pulsing hexagon icon, title text, status message, and animated loading dots. Fades out smoothly over 600ms when the `ready` prop becomes `true`, then unmounts entirely.

---

## Module Dependencies (Imports Breakdown)

### Line 1 - Client Directive
```ts
'use client';
```
Next.js client-side component directive.

### Line 3 - React Hooks
```ts
import { memo, useEffect, useState } from 'react';
```
- `memo` - Memoizes the component to prevent unnecessary re-renders.
- `useEffect` - Manages the fade-out transition timing when `ready` changes.
- `useState` - Tracks visibility (`visible`) and fade-out animation state (`fadeOut`).

---

## Type Definitions

### AgentLoadingScreenProps (Lines 5-7)
```ts
interface AgentLoadingScreenProps {
  ready: boolean;
}
```

| Prop | Type | Description |
|---|---|---|
| `ready` | `boolean` | When `true`, triggers the fade-out animation and eventual unmount. |

---

## Exported Members

### AgentLoadingScreen (Lines 9-109)
Default export. Memoized functional component.

**Display Name**: `'AgentLoadingScreen'`

---

## State Management

| State Variable | Type | Initial | Purpose |
|---|---|---|---|
| `visible` | `boolean` | `true` | Controls whether the component renders at all. Set to `false` 600ms after fade begins. |
| `fadeOut` | `boolean` | `false` | Controls the CSS opacity transition. When `true`, opacity becomes 0 and pointer events are disabled. |

---

## Side Effects

### Fade-Out Transition (Lines 13-19)
```ts
useEffect(() => {
  if (ready && visible) {
    setFadeOut(true);
    const t = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(t);
  }
}, [ready, visible]);
```
- Triggers when `ready` changes to `true` while the component is still visible.
- Immediately sets `fadeOut` to `true`, starting the CSS opacity transition.
- After 600ms (matching the CSS transition duration), sets `visible` to `false`.
- Cleanup function clears the timeout if the component unmounts or dependencies change.

---

## Render Logic

### Early Return (Line 21)
```ts
if (!visible) return null;
```
Once the fade-out completes and `visible` is `false`, the component fully unmounts.

### Container (Lines 23-38)
Fixed-position overlay covering the entire viewport:
- `position: 'fixed'`, `inset: 0`.
- Background: `#0a0a0f` (near-black).
- z-index: 100 (above all other UI elements).
- Flex column layout, centered.
- Font: IBM Plex Mono, monospace.
- CSS transition: `opacity 600ms ease`.
- Opacity: 0 when `fadeOut` is true, 1 otherwise.
- `pointerEvents`: `'none'` when fading out, `'all'` otherwise.

### Hexagon Pulse Icon (Lines 40-50)
```
fontSize: 48, color: '#c084fc' (purple)
```
- Renders the Unicode hexagon character.
- Animated via CSS `hexPulse` keyframes: scales between 1.0 and 0.92 with opacity between 1.0 and 0.6, 2s period.
- Margin bottom: 24px.

### Title (Lines 52-62)
```
"Agent World"
```
- Font size: 13px, color: `#c084fc` (purple).
- Letter spacing: 0.15em, uppercase.
- Margin bottom: 8px.

### Status Message (Lines 64-74)
```
"Connecting to agent executor..."
```
- Font size: 10px, color: `#4b5563` (dim gray).
- Letter spacing: 0.1em, uppercase.

### Loading Dots (Lines 77-93)
Three animated circular dots:
- Mapped from array `[0, 1, 2]`.
- Each dot: 4px diameter, `#c084fc` background, fully rounded.
- Animated via CSS `loadDot` keyframes.
- Each dot has a staggered `animationDelay`: 0s, 0.2s, 0.4s.
- Gap: 6px between dots.
- Margin top: 24px.

### CSS Keyframe Animations (Lines 94-103)

**hexPulse** (2s ease-in-out infinite):
```css
0%, 100% { opacity: 1; transform: scale(1); }
50% { opacity: 0.6; transform: scale(0.92); }
```

**loadDot** (1.2s ease-in-out infinite):
```css
0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
40% { opacity: 1; transform: scale(1.2); }
```

---

## Usage Example

```tsx
import AgentLoadingScreen from '@/features/Agents/AgentLoadingScreen';

function AgentWorld() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    connectToExecutor().then(() => setIsReady(true));
  }, []);

  return (
    <>
      <AgentLoadingScreen ready={isReady} />
      <AgentForceGraph ... />
    </>
  );
}
```
