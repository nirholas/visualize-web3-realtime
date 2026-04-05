# Hacker News First Comment

Post this immediately after submitting the Show HN link.

---

## Comment Template

Hi HN, I built this because I was frustrated with how slow existing graph visualization libraries get beyond a few hundred nodes.

The key insight: use Three.js instanced meshes (one draw call per node type) instead of individual DOM elements or canvas draw calls. Combined with a spatial hash for O(1) neighbor lookups and d3-force-3d for physics, it sustains 60fps at 5,000+ nodes.

It's a React component you can drop in with a few lines of code:

```
npm install swarming

import { Swarming } from 'swarming'
<Swarming source="wss://your-data-stream" />
```

Works with any WebSocket data source. The live demo connects to Solana blockchain data, but there are templates for Kubernetes, GitHub events, social networks, and more.

GitHub: [REPO_URL]
Docs: [DOCS_URL]
npm: [NPM_URL]

Built with Three.js, React Three Fiber, d3-force-3d, and TypeScript. MIT licensed.

Happy to answer any questions about the rendering pipeline or architecture.

---

## Notes

- Replace `[REPO_URL]`, `[DOCS_URL]`, `[NPM_URL]` with actual links before posting
- Keep the tone: technical, humble, conversational
- Do NOT include marketing language or superlatives
- The submission URL should be the **live demo**, not the GitHub repo
- This comment is where you put the GitHub link
- Post within 60 seconds of submission — the first comment sets the tone for the thread
