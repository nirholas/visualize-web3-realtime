# Social Media Templates

Copy-paste templates for social media posts. Replace bracketed placeholders with actual content.

---

## Twitter/X Templates

### The "Wow" Post

> [10-15 sec video or GIF of visualization]
>
> [NUMBER] nodes. 60fps. Real-time.
>
> Built with Three.js + React. Works with any WebSocket.
>
> npm install @web3viz/react-graph
>
> github.com/[REPO_URL]

### The "How It Works" Thread

> How do we render 5,000 particles at 60fps in the browser?
>
> A thread:
>
> 1/ The naive approach: one DOM element per node.
> Dies at ~200 nodes. Layout thrashing kills performance.
>
> 2/ Canvas 2D: one draw call per node.
> Better. Dies at ~2,000 nodes. Too many individual draw calls.
>
> 3/ Our approach: Three.js InstancedMesh.
> ONE draw call for ALL nodes. GPU handles the rest.
> [diagram or code screenshot]
>
> 4/ But rendering is only half the problem.
> Finding nearby nodes for edges is O(n^2) — too slow.
>
> 5/ Solution: SpatialHash. Divide 3D space into cells.
> Neighbor lookup becomes O(1).
> [code snippet screenshot]
>
> 6/ Result: 60fps sustained at 5,000+ nodes.
> [benchmark chart or screen recording]
>
> 7/ Try it yourself:
> npm install @web3viz/react-graph
>
> [playground link]
> [GitHub link]

### The "Side-by-Side" Comparison

> Same data. Same machine. Same browser.
>
> Left: swarming (60fps)
> Right: [ALTERNATIVE] ([X]fps)
>
> [split-screen video]
>
> The difference? Instanced rendering + spatial hashing.
>
> Open source: github.com/[REPO_URL]

### The "Use Case" Demo

> Your [SYSTEM], visualized in real-time.
>
> [EMOJI] [State 1]
> [EMOJI] [State 2]
> [EMOJI] [State 3]
>
> Every particle is a real [ENTITY]. Every cluster is a [GROUP].
>
> [NUMBER] lines of code:
>
> ```
> import { ForceGraph } from '@web3viz/react-graph'
> <ForceGraph source="wss://[ENDPOINT]" />
> ```
>
> [GIF or video]

### Star Milestone Celebration

> [NUMBER] stars!
>
> [TIME_PERIOD] ago this was a side project.
>
> Thank you to everyone who starred, shared, and contributed.
>
> What we shipped this week:
> - [FEATURE_1]
> - [FEATURE_2]
> - [FEATURE_3]
>
> What's next: [TEASER]
>
> github.com/[REPO_URL]

### Feature Release

> [PROJECT] v[VERSION] is out!
>
> What's new:
> - [FEATURE_1] [GIF or screenshot]
> - [FEATURE_2]
> - [FEATURE_3]
>
> Upgrade: npm install @web3viz/react-graph@latest
>
> Full changelog: [LINK]

### Engagement / Poll

> What should we visualize next?
>
> [Option A]
> [Option B]
> [Option C]
> [Option D]

### Technical Deep-Dive

> How [TECHNIQUE] works in [PROJECT]:
>
> Problem: [ONE_LINE_PROBLEM]
>
> [Diagram or code screenshot]
>
> The key insight: [INSIGHT]
>
> Result: [METRIC]
>
> Full writeup: [BLOG_LINK]

---

## Reddit Templates

### r/dataisbeautiful

**Title:** [OC] Real-time visualization of [DATA_SOURCE] — [NODE_COUNT] live data points

**Body:**

> Tool: Custom-built with Three.js + React (open source)
>
> Data source: [DESCRIPTION]
>
> What you're seeing: Each particle represents [ENTITY]. Colors indicate [MEANING]. Clusters form based on [LOGIC].
>
> The engine renders [NODE_COUNT] nodes at 60fps using instanced rendering and spatial hashing.
>
> Source code: [GITHUB_LINK]
> Live demo: [DEMO_LINK]

### r/javascript or r/reactjs

**Title:** I built a real-time 3D graph visualization engine — renders 5k+ nodes at 60fps

**Body:**

> After [TIME] of development, I'm open-sourcing [PROJECT] — a React component for real-time 3D data visualization.
>
> **What it does:**
> - Renders thousands of nodes at 60fps using Three.js InstancedMesh
> - Real-time data via WebSocket with automatic reconnection
> - Force-directed layout that runs on the main thread without jank
> - Works as a drop-in React component
>
> **Quick start:**
> ```bash
> npm install @web3viz/react-graph
> ```
> ```tsx
> import { ForceGraph } from '@web3viz/react-graph'
>
> <ForceGraph
>   nodes={nodes}
>   edges={edges}
> />
> ```
>
> **Technical highlights:**
> - SpatialHash for O(1) neighbor lookups (vs O(n^2) naive)
> - BoundedMap/BoundedSet for LRU-evicting caches
> - GPU-accelerated rendering via InstancedMesh
>
> GitHub: [LINK]
> Live demo: [LINK]
>
> Would love feedback on the API design and any use cases you'd want to see supported!

### r/devops or r/kubernetes

**Title:** Visualize your Kubernetes cluster in real-time 3D — open source

**Body:**

> Built an open-source tool that connects to your K8s API and renders every pod as a particle in 3D space.
>
> - Pods are colored by status (running/pending/error)
> - Namespaces form natural clusters
> - Real-time updates via WebSocket
> - Handles 5,000+ pods at 60fps
>
> [SCREENSHOT or GIF]
>
> Quick start: [INSTRUCTIONS]
>
> GitHub: [LINK]
>
> Built with Three.js + React. Feedback welcome!

---

## YouTube Templates

### Tutorial Video Description

> Learn how to build a real-time 3D data visualization with [PROJECT].
>
> In this video:
> - [TIMESTAMP] — Setup and installation
> - [TIMESTAMP] — Basic graph rendering
> - [TIMESTAMP] — Adding real-time data
> - [TIMESTAMP] — Customizing appearance
> - [TIMESTAMP] — Performance tuning
>
> Links:
> - GitHub: [LINK]
> - Documentation: [LINK]
> - npm: [LINK]
>
> #threejs #react #datavisualization #opensource

---

## LinkedIn Template

> Excited to share [PROJECT] — an open-source real-time data visualization engine.
>
> The problem: Visualizing thousands of live data points in 3D without dropping frames.
>
> Our approach:
> - Three.js InstancedMesh for GPU-accelerated rendering
> - Spatial hashing for O(1) neighbor lookups
> - React component API for easy integration
>
> Use cases we're exploring:
> - Infrastructure monitoring (Kubernetes, microservices)
> - Network traffic analysis
> - AI agent orchestration visualization
>
> Check it out: [GITHUB_LINK]
>
> #OpenSource #DataVisualization #WebDev #ThreeJS #React

---

## Hashtag Reference

**Primary:** #opensource #dataviz #threejs #react #webdev
**Technical:** #javascript #typescript #webgl #3d #realtime
**Domain:** #kubernetes #devops #monitoring #web3 #ai
**Growth:** #buildinpublic #indiehackers #devtools
