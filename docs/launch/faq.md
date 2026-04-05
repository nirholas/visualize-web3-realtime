# Hacker News FAQ — Prepared Answers

Answers to questions that commonly come up on Show HN threads. Adapt tone to the specific question — be technical and honest.

---

## "How does this compare to X?"

**vs. Sigma.js / Cytoscape.js:**
Those are excellent 2D graph libraries. We use Three.js with instanced rendering for 3D, which gives us a fundamentally different performance profile — one draw call per node type instead of one per node. The trade-off is we require WebGL, while Sigma/Cytoscape work with Canvas2D.

**vs. D3 force layout:**
We actually use d3-force-3d under the hood for the physics simulation. The difference is the rendering layer — D3 typically renders to SVG or Canvas, which doesn't scale past ~1,000 nodes smoothly. We pipe the force simulation into Three.js instanced meshes.

**vs. Deck.gl:**
Deck.gl is map-centric and optimized for geospatial data. We're optimized for abstract network/graph data. Different tools for different problems.

---

## "Does it work with [data source]?"

Yes — the architecture is provider-based. You implement a simple interface that emits nodes and edges, and the visualization handles the rest. The repo includes providers for WebSocket streams, and you can write your own for any data source (REST polling, SSE, gRPC-web, etc.).

See the provider interface in `packages/providers/`.

---

## "What about accessibility?"

Honest answer: 3D WebGL visualizations are inherently challenging for accessibility. We have:
- Keyboard navigation for node selection
- Screen reader announcements for key events
- A stats panel that provides text-based summaries of the graph state

On the roadmap: a 2D fallback mode and ARIA live regions for real-time updates. We welcome contributions here.

---

## "Why not WebGPU?"

WebGPU support is still limited — as of early 2026, it's available in Chrome and Edge but not in Firefox or Safari by default. We want the demo to work for everyone visiting from HN without browser flags. WebGPU compute shaders for force simulation are on the roadmap once browser support is broader.

---

## "Can it handle X nodes?"

Current benchmarks on a mid-range laptop (M1 MacBook Air):
- 1,000 nodes: 60fps, no issues
- 5,000 nodes: 60fps with instanced rendering
- 10,000 nodes: 30-45fps depending on edge count
- 50,000+: requires LOD (level of detail) and viewport culling, which is on the roadmap

The bottleneck is usually the force simulation, not the rendering. We're exploring WebWorker-based simulation to unblock the main thread.

---

## "Show me the ugly parts of the code"

We're honest about the current state:
- The WebSocket reconnection logic has some edge cases around rapid disconnect/reconnect cycles
- TypeScript coverage isn't 100% — some internal utilities use `any`
- The force simulation runs on the main thread currently (WebWorker is planned)
- Test coverage could be better, especially for the 3D rendering layer

PRs welcome for any of these.

---

## "What's the business model?"

No commercial plan currently. It's MIT licensed, fully open source. Built this because we needed it and thought others might too. If it grows, we might explore hosted dashboards or enterprise support, but the core library will always be free and open source.

---

## "Why TypeScript and not Rust/WASM?"

The rendering layer (Three.js/WebGL) is already GPU-accelerated — the JS overhead is minimal there. The force simulation is the CPU-bound part, and a WASM port of d3-force would help. That's a potential future optimization. We chose TypeScript for the ecosystem — React integration, npm distribution, and developer familiarity.

---

## "Is this production-ready?"

It's at 0.x — we're being honest about that. The API may change. That said, the core rendering pipeline is stable and we're using it internally. If you're building something mission-critical, pin your version and watch the changelog.

---

## Response Guidelines

- Be technical and specific — HN readers can smell hand-waving
- Acknowledge limitations before the commenter points them out
- "Great question" and "Thanks for asking" are filler — skip them
- If you don't know, say so: "I haven't benchmarked that — will test and report back"
- Link to specific code when possible (file + line number)
- Don't be defensive about criticism — the best HN threads are honest technical discussions
