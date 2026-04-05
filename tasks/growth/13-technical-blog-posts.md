# Task 13: Technical Blog Posts

## Goal
Write 4-5 deep technical blog posts that establish authority, drive organic traffic, and give people a reason to share the project. Technical content is the most durable growth channel for developer tools.

## Context
Every 100k-star project has "that blog post" that went viral. Vercel has "Why We Moved to Rust," Bun has the benchmarks post, Excalidraw has the architecture deep-dive. Technical posts rank in Google forever and get shared on HN/Reddit/Twitter repeatedly.

## Blog Posts to Write

### Post 1: "Rendering 5,000 Particles at 60fps in the Browser"
**Target**: Hacker News front page, r/javascript, r/webdev
**Angle**: Deep technical walkthrough of the rendering pipeline
**Outline**:
1. The problem: force-directed graphs are slow at scale
2. Why SVG dies at 500 nodes (DOM overhead)
3. Why Canvas 2D dies at 2,000 nodes (draw call overhead)
4. The instanced mesh approach (one draw call per node type)
5. SpatialHash for O(1) neighbor lookups (code walkthrough)
6. d3-force-3d tuning for smooth physics
7. Bloom post-processing without killing FPS
8. Benchmark results vs alternatives
9. Try it yourself (playground link)

**Length**: 2,000-3,000 words with code snippets and diagrams

### Post 2: "Building a Real-Time Data Visualization Engine from Scratch"
**Target**: Dev.to, Medium, company engineering blogs
**Angle**: Architecture deep-dive, design decisions, trade-offs
**Outline**:
1. The vision: make any streaming data beautiful
2. Architecture: Provider -> Engine -> Renderer pipeline
3. The DataProvider interface (why it's just 3 methods)
4. Physics simulation: why d3-force-3d over custom physics
5. State management: why React refs over Redux/Zustand
6. The hub-and-spoke model (how we visualize hierarchy)
7. Mouse repulsion: the math behind it
8. Lessons learned (what we'd do differently)

**Length**: 2,500-3,500 words

### Post 3: "Zero DOM Reads: How We Built a 60fps Text Layout Engine"
**Target**: Performance-focused engineers, HN
**Angle**: The landing page text reflow engine is genuinely novel
**Outline**:
1. The goal: text that reflows around draggable obstacles in real-time
2. Why CSS flow can't do this (reflow = layout thrash)
3. Off-DOM text measurement with a hidden canvas
4. Binary search for responsive font sizing
5. Span pooling (reuse DOM nodes instead of creating new ones)
6. The physics engine for draggable orbs
7. Achieving zero `getBoundingClientRect()` calls per frame
8. Performance comparison: before and after

**Length**: 1,500-2,000 words

### Post 4: "WebSocket → 3D: Visualizing Any Data Stream in 10 Lines of Code"
**Target**: Tutorial-seekers, beginners, broad audience
**Angle**: Practical tutorial, copy-paste friendly
**Outline**:
1. What we're building (screenshot)
2. Install swarming (`npm install swarming`)
3. Connect to a WebSocket (5 lines)
4. Customize the visualization (5 more lines)
5. Add interactivity (click, hover)
6. Deploy (Vercel one-click)
7. Next steps (link to docs, playground, Discord)

**Length**: 1,000-1,500 words

### Post 5: "Swarming vs D3 vs Sigma.js vs Cytoscape: Real-Time Graph Visualization Compared"
**Target**: Developers evaluating tools, Google searches for "d3 alternative"
**Angle**: Honest, fair comparison with benchmarks
**Outline**:
1. When you need a real-time graph visualization library
2. Feature comparison table
3. Performance benchmarks (reference Task 11)
4. DX comparison (code snippets for same visualization in each)
5. When to use each library (be fair — recommend competitors when appropriate)
6. Conclusion: where swarming shines

**Length**: 2,000-2,500 words

## Publishing Strategy
1. Host on the docs site (`/blog` route)
2. Cross-post to Dev.to (with canonical URL pointing to our site)
3. Submit Post 1 to Hacker News
4. Share Posts 4 and 5 on Reddit (r/javascript, r/reactjs, r/dataisbeautiful)
5. Thread versions of Posts 1 and 2 on Twitter/X

## Technical Implementation
```
app/blog/
├── page.tsx                     # Blog index
├── [slug]/page.tsx              # Individual post
├── content/
│   ├── rendering-5000-particles.mdx
│   ├── building-realtime-viz-engine.mdx
│   ├── zero-dom-reads.mdx
│   ├── websocket-to-3d.mdx
│   └── swarming-vs-alternatives.mdx
└── components/
    ├── BlogLayout.tsx
    ├── CodePlayground.tsx       # Inline runnable code
    └── BenchmarkChart.tsx       # Embedded benchmark visuals
```

## SEO Targets
- "real-time data visualization javascript"
- "force directed graph performance"
- "threejs network graph"
- "d3 force graph alternative"
- "websocket visualization"
- "webgl particle system browser"
