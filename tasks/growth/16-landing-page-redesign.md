# Task 16: Landing Page Redesign — Convert Visitors to Stars

## Goal
Redesign the landing page to convert curious visitors into GitHub stars and npm installs. Every element should answer: "What is this? Is it for me? How do I start?"

## Context
The current landing page is technically impressive (the orb physics + text reflow engine is genuinely novel) but it prioritizes art over conversion. A visitor from HN has ~10 seconds of attention. They need to see: what it does, that it's fast, and how to start.

## Requirements

### 1. Above the Fold (first 10 seconds)
```
┌──────────────────────────────────────────────────┐
│  [Logo] swarming          [GitHub ⭐] [Docs] [Discord] │
├──────────────────────────────────────────────────┤
│                                                  │
│   Real-time data visualization                   │
│   at 60fps.                                      │
│                                                  │
│   GPU-accelerated 3D network graphs for any      │
│   streaming data source. React component.        │
│   3 lines of code.                               │
│                                                  │
│   [npm install swarming]  [Try Playground →]     │
│                                                  │
│   ┌──────────────────────────────────────┐       │
│   │                                      │       │
│   │   [Live embedded visualization]      │       │
│   │   (actual running demo, not a GIF)   │       │
│   │                                      │       │
│   └──────────────────────────────────────┘       │
│                                                  │
│   5,000+ nodes  ·  60fps  ·  48KB gzipped       │
└──────────────────────────────────────────────────┘
```

### 2. Code Preview Section
```
┌──────────────────────────────────────────────────┐
│  Get started in 30 seconds                       │
│                                                  │
│  ┌─ code ─────────────────┐  ┌─ result ────────┐│
│  │ import { Swarming }    │  │                  ││
│  │   from 'swarming'      │  │  [live preview]  ││
│  │                        │  │                  ││
│  │ <Swarming              │  │                  ││
│  │   source="wss://..."   │  │                  ││
│  │ />                     │  │                  ││
│  └────────────────────────┘  └──────────────────┘│
│                                                  │
│  [Copy Code]  [Open in Playground →]             │
└──────────────────────────────────────────────────┘
```

### 3. Use Cases Grid
```
┌──────────────────────────────────────────────────┐
│  Works with any streaming data                   │
│                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │Blockchain│ │Kubernetes│ │ Social  │            │
│  │ [thumb]  │ │ [thumb]  │ │ [thumb] │            │
│  │ Live →   │ │ Demo →   │ │ Demo →  │            │
│  └─────────┘ └─────────┘ └─────────┘            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │API      │ │AI Agents│ │  IoT    │            │
│  │Traffic  │ │ [thumb]  │ │ [thumb] │            │
│  │ [thumb]  │ │ Demo →   │ │ Demo →  │            │
│  │ Demo →   │ │          │ │         │            │
│  └─────────┘ └─────────┘ └─────────┘            │
└──────────────────────────────────────────────────┘
```

### 4. Performance Section
```
┌──────────────────────────────────────────────────┐
│  Built for performance                           │
│                                                  │
│  [Interactive benchmark chart]                   │
│  swarming vs d3 vs sigma vs cytoscape            │
│                                                  │
│  Instanced rendering · Spatial hashing ·         │
│  GPU bloom · Zero layout thrash                  │
│                                                  │
│  [Read the technical deep-dive →]                │
└──────────────────────────────────────────────────┘
```

### 5. Social Proof Section
```
┌──────────────────────────────────────────────────┐
│  [Star count] stars on GitHub                    │
│  [Download count] weekly npm downloads           │
│                                                  │
│  "Quote from notable developer" — @handle        │
│  "Quote from another dev" — @handle              │
│                                                  │
│  Used by: [logo] [logo] [logo]                   │
└──────────────────────────────────────────────────┘
```

### 6. CTA Footer
```
┌──────────────────────────────────────────────────┐
│  Ready to visualize your data?                   │
│                                                  │
│  npx create-swarming-app my-viz                  │
│                                                  │
│  [Documentation]  [GitHub]  [Discord]            │
│                                                  │
│  MIT License · Made with Three.js + React        │
└──────────────────────────────────────────────────┘
```

### 7. Keep the Orb Physics (as a feature, not the hero)
The text reflow + orb physics is genuinely impressive tech. Don't remove it — move it to:
- A "playground" section where users can drag orbs and see text reflow
- Or use it as the background/ambient animation behind the hero content
- Or make it a separate demo linked from the landing page

## Technical Notes
- The live embedded visualization must load fast (lazy-load Three.js after hero text renders)
- Use Intersection Observer to only start demos when scrolled into view
- Ensure the page works with JavaScript disabled (shows static content)
- GitHub star button should use the GitHub API to show real-time count
- Page must score 90+ on Lighthouse performance

## Files to Modify
- `app/page.tsx` or `app/landing/page.tsx`
- `features/Landing/` — components
- `public/` — new assets
