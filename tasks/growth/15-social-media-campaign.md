# Task 15: Social Media Campaign

## Goal
Create a repeatable social media content engine that generates ongoing star growth through visual, shareable content.

## Context
Stars compound through social visibility. A single viral tweet can drive 2,000+ stars. But sustained growth requires consistent content, not just one-time launches. The most successful open-source projects post 2-3 times per week.

## Platform Strategy

### Twitter/X (Primary)
The developer audience lives here. Visual content (videos, GIFs) gets 10x the engagement of text-only posts.

### Reddit (Secondary)
Target subreddits: r/dataisbeautiful, r/javascript, r/reactjs, r/webdev, r/threejs, r/dataengineering, r/devops

### YouTube (Long-term)
Tutorial videos, conference talks, architecture walkthroughs.

### LinkedIn (Amplification)
Repost content for the enterprise/DevOps audience.

## Content Calendar — First 30 Days

### Week 1: Launch Week
| Day | Platform | Content |
|-----|----------|---------|
| Mon | Twitter | Teaser: 10-sec GIF "Something's coming..." |
| Tue | HN + Twitter | Launch post (see Task 14) |
| Wed | Twitter | "How we render 5k nodes at 60fps" thread (5 tweets) |
| Thu | Reddit | Post to r/dataisbeautiful with mesmerizing screenshot |
| Fri | Twitter | "Build a live data viz in 30 seconds" video tutorial |

### Week 2: Social Proof
| Day | Platform | Content |
|-----|----------|---------|
| Mon | Twitter | Star count milestone celebration (if hit 1k) |
| Tue | Reddit | Post to r/javascript "I built an alternative to d3-force" |
| Wed | Twitter | Side-by-side comparison GIF (swarming vs d3 at 5k nodes) |
| Thu | Twitter | "What would you visualize?" engagement post |
| Fri | YouTube | 5-minute tutorial video |

### Week 3: Use Cases
| Day | Platform | Content |
|-----|----------|---------|
| Mon | Twitter | Kubernetes demo GIF + "Monitor your cluster in 3D" |
| Tue | Reddit | Post K8s demo to r/devops, r/kubernetes |
| Wed | Twitter | GitHub activity visualizer demo |
| Thu | Twitter | "Which demo should we build next?" poll |
| Fri | Twitter | AI agent swarm visualization demo |

### Week 4: Community
| Day | Platform | Content |
|-----|----------|---------|
| Mon | Twitter | Retweet/highlight community-built visualizations |
| Tue | Twitter | "v0.2 released" with new feature showcase |
| Wed | Reddit | Post to r/reactjs "React component for real-time 3D graphs" |
| Thu | Twitter | Technical deep-dive: spatial hashing explained |
| Fri | Twitter | Week-in-review: stats, community highlights, roadmap preview |

## Content Templates

### The "Wow" Post
```
[10-15 sec video of mesmerizing visualization]

5,000 nodes. 60fps. Real-time.

Built with Three.js + React. Works with any WebSocket.

npm install swarming

⭐ github.com/swarming-vis/swarming
```

### The "How It Works" Thread
```
How do we render 5,000 particles at 60fps in the browser? 🧵

1/ The naive approach: one DOM element per node.
   Dies at ~200 nodes. Layout thrashing kills performance.

2/ Canvas 2D: one draw call per node.
   Better. Dies at ~2,000 nodes. Too many individual draw calls.

3/ Our approach: Three.js InstancedMesh.
   ONE draw call for ALL nodes. GPU handles the rest.
   [diagram]

4/ But rendering is only half the problem.
   Finding nearby nodes for edges is O(n²) — too slow.
   
5/ Solution: SpatialHash. Divide 3D space into cells.
   Neighbor lookup becomes O(1).
   [code snippet]

6/ Result: 60fps sustained at 5,000+ nodes.
   [benchmark chart]

7/ Try it yourself:
   npm install swarming
   
   [playground link]
   [GitHub link]
```

### The "Side-by-Side" Post
```
Same data. Same machine. Same browser.

Left: swarming (60fps)
Right: [competitor] (12fps)

[split-screen video]

The difference? Instanced rendering + spatial hashing.

Open source: github.com/swarming-vis/swarming
```

### The "Use Case" Post
```
Your Kubernetes cluster, visualized in real-time.

🟢 Running pods
🟡 Pending
🔴 Errors

Every particle is a real pod. Every cluster is a namespace.

3 lines of code:

import { Swarming } from 'swarming'
<Swarming source="wss://k8s-proxy:8001/..." />

[GIF of K8s visualization]
```

## Tooling

### Content Creation
- Screen recordings: OBS or built-in macOS/Linux recorder
- GIF creation: `ffmpeg` + `gifsicle`
- Video editing: minimal (raw screen captures work best for authenticity)
- Image annotations: Figma or Excalidraw

### Scheduling
- Use Buffer, Typefully, or manual posting
- Best Twitter posting times: 8-10am ET, 12-2pm ET
- Best Reddit posting times: 6-9am ET

### Tracking
- Twitter Analytics for engagement metrics
- GitHub star history (star-history.com)
- npm download trends
- Reddit post karma

## Ongoing Content Ideas (post-launch)
- Every new feature = a short demo video
- Every community showcase = a retweet + highlight
- Monthly "state of swarming" post with stats
- "Visualize X" series (new data source each week)
- Code walkthroughs of interesting PRs
- "Ask me anything" sessions

## Files to Create
- `docs/marketing/content-calendar.md` — editable content schedule
- `docs/marketing/templates.md` — copy-paste social media templates
- `scripts/record-demo.sh` — script to record demo GIFs/videos programmatically
