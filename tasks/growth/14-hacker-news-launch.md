# Task 14: Hacker News Launch Strategy

## Goal
Get to the front page of Hacker News, which is the single highest-leverage event for a new open-source project. A successful HN launch can generate 1,000-5,000 stars in 48 hours.

## Context
HN front page projects share common traits: technically impressive, solves a real problem, easy to try, has great visuals, and the submission title is intriguing without being clickbait. We need to optimize for all of these.

## Pre-Launch Checklist (before submitting)

### 1. The Demo Must Be Live and Fast
- [ ] Live demo loads in <3 seconds
- [ ] Works on mobile (HN readers browse on phones)
- [ ] No API keys or auth required to try
- [ ] Can handle HN traffic spike (10,000+ concurrent visitors)
- [ ] Fallback to mock data if WebSocket source is overwhelmed

### 2. The README Must Be Perfect
- [ ] Hero GIF loads instantly (optimized, <5MB)
- [ ] "Get started in 30 seconds" section is copy-pasteable
- [ ] All links work
- [ ] No broken images
- [ ] MIT license clearly stated

### 3. The Repo Must Look Active and Serious
- [ ] >10 meaningful commits in the last week
- [ ] Issue templates configured
- [ ] CI passing (green badge)
- [ ] At least a few existing stars (ask friends/colleagues to star before launch)

### 4. Infrastructure
- [ ] Deploy to Vercel/Cloudflare (handles traffic spikes automatically)
- [ ] Set up monitoring (Vercel Analytics or similar)
- [ ] Ensure WebSocket provider can handle 10k+ connections or gracefully degrade
- [ ] Test with throttled connection (many HN readers are on slow connections)

## Submission Strategy

### Title Options (pick the most intriguing)
- "Show HN: Real-time network visualization at 60fps with 5,000+ nodes"
- "Show HN: I built a GPU-accelerated data visualization engine for the browser"
- "Show HN: Swarming – visualize any WebSocket stream as a 3D force graph"
- "Show HN: Rendering 5,000 particles at 60fps in the browser"

**Rules**:
- Use "Show HN:" prefix
- No superlatives ("best", "fastest", "revolutionary")
- Lead with what it does, not what it is
- Technical specificity ("60fps", "5,000 nodes") signals substance

### URL
Link to the **live demo** (not the GitHub repo). Put the repo link in the first comment.

### First Comment (post immediately after submission)
```
Hi HN, I built this because I was frustrated with how slow existing graph 
visualization libraries get beyond a few hundred nodes. 

The key insight: use Three.js instanced meshes (one draw call per node type) 
instead of individual DOM elements or canvas draw calls. Combined with a 
spatial hash for O(1) neighbor lookups and d3-force-3d for physics, it 
sustains 60fps at 5,000+ nodes.

It's a React component you can drop in with 3 lines of code:

    npm install swarming
    
    import { Swarming } from 'swarming'
    <Swarming source="wss://your-data-stream" />

Works with any WebSocket data source. The live demo connects to Solana 
blockchain data, but there are templates for Kubernetes, GitHub, social 
networks, and more.

GitHub: [link]
Docs: [link]
npm: [link]

Built with Three.js, React Three Fiber, d3-force-3d, and TypeScript. 
MIT licensed.

Happy to answer any questions about the rendering pipeline or architecture.
```

### Timing
- **Best days**: Tuesday, Wednesday, Thursday
- **Best time**: 8-10am ET (US morning, EU afternoon)
- **Avoid**: Fridays, weekends, holidays, days when major tech news is breaking

## During the Launch (first 6 hours)

### 1. Monitor and Respond
- Refresh HN every 15 minutes for the first 2 hours
- Respond to every comment within 30 minutes
- Be technical, humble, and helpful
- Don't be defensive about criticism — acknowledge limitations honestly
- Upvote thoughtful comments (not your own)

### 2. Common HN Questions to Prepare For
- "How does this compare to X?" → Have the benchmark comparison ready
- "Does it work with Y data source?" → Point to the provider interface
- "What about accessibility?" → Acknowledge limitations, share roadmap
- "Why not use WebGPU?" → Explain browser support trade-offs, mention it's on roadmap
- "Show me the ugly parts of the code" → Be transparent about tech debt
- "What's the business model?" → Open source, MIT, no commercial plan (yet)

### 3. Social Media Amplification
- Tweet the HN link with a compelling video clip
- Post to r/javascript, r/reactjs, r/dataisbeautiful (with different angles)
- Share in relevant Discord servers (Three.js, React, D3)
- Ask collaborators to share organically (not coordinated upvoting — HN detects this)

## Post-Launch (48-72 hours)

### 1. Capture the Momentum
- Respond to every GitHub issue opened during the spike
- Merge any community PRs quickly (show the project is alive)
- Write a "Thank you HN" follow-up comment with stats

### 2. Convert Visitors to Users
- Ensure the README has a clear "next step" after starring
- Discord invite link prominent
- Newsletter signup (optional)
- "Built with Swarming? Show us!" discussion thread

### 3. Track Metrics
- Star count over time
- npm installs
- Discord joins
- GitHub issues opened
- Traffic to docs site

## Files to Create
- `docs/launch/hn-checklist.md` — internal launch checklist
- `docs/launch/hn-comment.md` — pre-written first comment
- `docs/launch/faq.md` — prepared answers to common questions
