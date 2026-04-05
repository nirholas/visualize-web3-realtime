# Task 19: Community Showcase Gallery

## Goal
Build a "Built with Swarming" gallery page that displays community-created visualizations. This serves as social proof, inspiration, and a growth flywheel (people build things to get featured).

## Context
Three.js has threejs.org/examples, Excalidraw has their gallery, Tailwind has their showcase. A gallery creates a virtuous cycle: people see cool things → build their own → submit to gallery → others see it → repeat.

## Requirements

### 1. Gallery Page (`/showcase`)
- Grid layout of visualization cards
- Each card shows:
  - Animated thumbnail (GIF or short video)
  - Title
  - Author (with GitHub link)
  - Data source type (badge)
  - "View Live" + "View Source" buttons
- Filterable by category: Blockchain, DevOps, Social, IoT, AI, Other
- Searchable
- Sortable: Recent, Most Popular, Staff Picks

### 2. Submission Flow
- "Submit Your Visualization" button → opens GitHub Discussion (Show & Tell category)
- Or via PR to a `showcase.json` file:
```json
[
  {
    "title": "Solana DeFi Activity",
    "author": "alice",
    "github": "https://github.com/alice/solana-viz",
    "demo": "https://solana-viz.vercel.app",
    "thumbnail": "https://...",
    "category": "blockchain",
    "description": "Real-time visualization of Solana DeFi protocol activity",
    "featured": true
  }
]
```

### 3. Seed with Internal Demos
Pre-populate with the demos from Task 10:
- Blockchain (PumpFun)
- Kubernetes
- GitHub Activity
- Social Network
- AI Agents
- IoT Sensors

### 4. "Featured" Section
Hand-picked best visualizations at the top. Update weekly/monthly.

### 5. Stats
- Total showcases count
- "X visualizations built with Swarming"
- Category breakdown

## Files to Create
```
app/showcase/
├── page.tsx                # Gallery page
├── components/
│   ├── ShowcaseGrid.tsx
│   ├── ShowcaseCard.tsx
│   ├── CategoryFilter.tsx
│   └── SubmitButton.tsx
└── data/
    └── showcase.json       # Showcase entries
```
