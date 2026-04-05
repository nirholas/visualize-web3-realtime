# Task 07: Documentation Site

## Goal
Build a world-class documentation site that makes the SDK easy to learn and serves as a top-of-funnel for organic search traffic.

## Context
Great docs are a competitive moat. Three.js has threejs.org, D3 has observablehq.com, Framer Motion has framer.com/motion. Our docs should be on par. Docs also rank highly in Google for technical queries, driving sustained organic traffic.

## Requirements

### 1. Platform
Use **Fumadocs** or **Nextra** (Next.js-based doc frameworks) — they integrate naturally with our monorepo and support MDX, search, and code playgrounds.

Alternatively, a `/docs` route within the existing Next.js app (simpler, single deploy).

### 2. Site Structure
```
/docs
├── Getting Started
│   ├── Installation
│   ├── Quick Start (30-second tutorial)
│   ├── Your First Visualization
│   └── Frameworks (Next.js, Vite, Remix, Vanilla)
├── Guide
│   ├── Data Sources
│   │   ├── WebSocket Streams
│   │   ├── Static Data
│   │   ├── Custom Providers
│   │   └── Built-in Providers (Solana, Ethereum, K8s)
│   ├── Customization
│   │   ├── Themes
│   │   ├── Node Rendering
│   │   ├── Edge Rendering
│   │   ├── Physics Tuning
│   │   └── Camera Control
│   ├── Interactivity
│   │   ├── Mouse Interaction
│   │   ├── Click & Hover Events
│   │   ├── Node Selection
│   │   └── Keyboard Shortcuts
│   └── Advanced
│       ├── Performance Optimization
│       ├── Headless Mode
│       ├── Server-Side Rendering
│       ├── Custom Shaders
│       └── Plugin Development
├── API Reference
│   ├── <Swarming /> Component
│   ├── useSwarmingEngine() Hook
│   ├── createProvider() Factory
│   ├── Theme Configuration
│   ├── Physics Configuration
│   └── Event Types
├── Examples
│   ├── Live Demos (embedded)
│   ├── CodeSandbox Links
│   └── Use Case Galleries
└── Community
    ├── Contributing
    ├── Changelog
    ├── Roadmap
    └── Showcase
```

### 3. Interactive Code Playgrounds
Every code example should have a live preview. Use one of:
- **Sandpack** (CodeSandbox's embeddable editor)
- **Shiki + custom preview pane** (lighter weight)

The user should be able to edit code and see the visualization update in real-time.

### 4. Search
- Full-text search across all docs (Algolia DocSearch or Fumadocs built-in search)
- API reference should be auto-generated from TypeScript types + JSDoc

### 5. SEO Strategy
Each page targets a long-tail keyword:
- "real-time data visualization react" → Getting Started
- "3d force graph javascript" → Guide > Physics
- "websocket visualization library" → Guide > Data Sources
- "d3 force graph alternative" → Performance comparison page
- "three.js network graph" → Guide > Custom Shaders

### 6. Design
- Match the main site's dark theme
- Sidebar navigation with section collapsing
- "Edit on GitHub" links on every page
- Version selector (for future major versions)
- Mobile-responsive with hamburger nav

## Files to Create
```
app/docs/
├── layout.tsx
├── page.tsx
├── [[...slug]]/page.tsx
├── content/              # MDX files
│   ├── getting-started/
│   ├── guide/
│   ├── api/
│   └── examples/
└── components/
    ├── LivePreview.tsx
    ├── CodeBlock.tsx
    └── APITable.tsx
```
