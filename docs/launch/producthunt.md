# Product Hunt Launch Plan

Target: **#1 Product of the Day**
Schedule: Tuesday or Wednesday, 2-4 weeks after HN launch

---

## Pre-Launch Checklist (1 week before)

- [ ] Create Product Hunt "Coming Soon" page at producthunt.com/upcoming
- [ ] Collect 50+ email subscribers on the Coming Soon page
- [ ] Prepare all gallery assets (see [Gallery Assets](#gallery-assets))
- [ ] Record 60-second product video (see [Video](#product-video))
- [ ] Line up 5-10 people to upvote and leave authentic reviews at launch
- [ ] Schedule launch for Tuesday or Wednesday (best PH days)
- [ ] Follow 50+ active PH community members
- [ ] Post 2-3 discussions in PH community in the week before

---

## Listing Content

### Tagline (60 chars max)

```
Real-time 3D data visualization at 60fps. Open source.
```

### Description

```
Swarming is a GPU-accelerated visualization engine that turns any
streaming data into a beautiful, interactive 3D force graph.

- 5,000+ nodes at 60fps
- Works with any WebSocket data source
- React component — 3 lines of code
- Built-in providers for blockchain, K8s, social, IoT
- Plugin system for custom data sources
- Dark & light themes
- MIT licensed, fully open source

npm install @web3viz/core @web3viz/react-graph

Whether you're monitoring Kubernetes pods, visualizing blockchain
transactions, mapping social networks, or watching AI agents
collaborate — Swarming makes your data come alive.
```

### Categories

1. Developer Tools
2. Open Source
3. Data Visualization
4. Design Tools

### Topics / Tags

`visualization`, `open-source`, `react`, `developer-tools`, `data-visualization`, `3d`, `real-time`, `graph`

---

## Maker Comment (post immediately after launch)

```
Hey PH! 👋

I built Swarming because I was tired of graph visualizations that
choke at a few hundred nodes. The secret sauce is Three.js instanced
rendering — one GPU draw call for thousands of particles.

Try it now: https://swarming.world/world
GitHub: https://github.com/nirholas/swarming.world
Docs: https://swarming.world/docs

Would love your feedback on what data sources you'd want to visualize!
```

---

## Gallery Assets

All images should be **1270x760px** (PH recommended) and saved in `docs/assets/producthunt/`.

| # | Image | Filename | Description |
|---|-------|----------|-------------|
| 1 | Hero screenshot | `01-hero-dark.png` | Full visualization, dark theme, 1000+ nodes visible, stats bar showing 60fps |
| 2 | Code snippet | `02-code-snippet.png` | "3 lines to visualize" — show the minimal React code with the graph rendering beside it |
| 3 | Use cases grid | `03-use-cases.png` | 2x3 grid: blockchain, K8s, social, IoT, AI agents, financial — each with small screenshot |
| 4 | Performance | `04-performance.png` | Benchmark chart: Swarming vs D3.js vs Cytoscape vs Sigma.js at 1K/5K/10K nodes |
| 5 | Light theme | `05-light-mobile.png` | Light theme on desktop + mobile responsive mockup side by side |

### Image Production Notes

- Use a clean browser window (no bookmarks bar, minimal chrome)
- Hero: capture at 2560x1536 retina, downscale to 1270x760
- Code snippet: use VS Code with a dark theme, font size 16+, no minimap
- Performance chart: simple bar chart, use brand colors (violet #8b5cf6, green #22c55e)
- Export as PNG, optimize with `pngquant` or `tinypng` (target <500KB each)

---

## Product Video (60 seconds)

Save to `docs/assets/producthunt/swarming-demo.mp4`

### Script

| Time | Visual | Audio/Text |
|------|--------|------------|
| 0-5s | Problem statement | "Most graph visualizations break at a few hundred nodes." |
| 5-15s | Competitor struggling | Show a generic graph viz lagging at 500 nodes |
| 15-25s | Swarming intro | "Swarming renders 5,000+ nodes at 60fps using GPU instanced rendering." |
| 25-45s | Live demo | Pan around the 3D graph, show real-time data flowing in, mouse repulsion, click interactions |
| 45-52s | Code snippet | "Add it to your React app in 3 lines of code." Show terminal: npm install, then the JSX |
| 52-58s | Use cases flash | Quick montage: blockchain, K8s, social, AI agents |
| 58-60s | CTA | "Star us on GitHub" with URL overlay |

### Video Specs

- Resolution: 1920x1080 or 1270x760
- Format: MP4 (H.264)
- Max file size: 50MB (PH limit)
- No audio required (most PH users watch muted) — use text overlays
- Record with OBS or Screen Studio

---

## Launch Day Playbook

### Timeline (all times Pacific)

| Time | Action |
|------|--------|
| **12:01 AM** | Listing goes live (PH resets at midnight PT) |
| **12:05 AM** | Post maker comment |
| **6:00 AM** | Share on Twitter, Discord, LinkedIn, Reddit |
| **7:00 AM** | Ask inner circle (5-10 people) to upvote + leave authentic reviews |
| **8:00 AM** | Respond to all PH comments |
| **10:00 AM** | Check ranking, share progress update on Twitter |
| **12:00 PM** | Midday Twitter update with current ranking |
| **2:00 PM** | Respond to all new comments |
| **4:00 PM** | Share in relevant Slack/Discord communities |
| **6:00 PM** | Thank everyone who upvoted, evening social push |
| **9:00 PM** | Final comment roundup |
| **11:59 PM** | Day ends — share final results |

### Response Templates

**For feature requests:**
```
Great idea! I've added this to our roadmap. Would you want [specific
implementation detail]? Happy to discuss in our Discord.
```

**For bug reports:**
```
Thanks for catching this! I've opened an issue for it:
[link]. Will prioritize a fix this week.
```

**For "how does it compare to X":**
```
Great question! [X] is solid for [use case]. Swarming's main
differentiator is GPU instanced rendering — we handle 10x more nodes
at interactive framerates. We also support real-time streaming data
natively, which most graph libs don't.
```

### Social Posts

**Twitter (launch announcement):**
```
🚀 Swarming is live on Product Hunt!

GPU-accelerated 3D visualization that handles 5,000+ nodes at 60fps.
Open source, React component, 3 lines of code.

Would love your support: [PH link]

#buildinpublic #opensource #dataviz
```

**LinkedIn:**
```
Excited to share that Swarming is now on Product Hunt!

After months of building, we're launching our open-source GPU-accelerated
visualization engine. It turns any streaming data into interactive 3D
force graphs — handling 5,000+ nodes at 60fps.

Use cases: blockchain monitoring, Kubernetes observability, social network
mapping, AI agent visualization, and more.

Check it out: [PH link]
```

---

## Post-Launch

### Same Week

- [ ] Thank-you post on Twitter/Discord with final ranking and stats
- [ ] Update README with Product Hunt badge (see below)
- [ ] Write a "lessons learned" thread on Twitter
- [ ] Respond to any remaining PH comments
- [ ] Follow up with everyone who left a review

### README Badge

Add after the existing badge row in `README.md`:

```html
<a href="https://www.producthunt.com/posts/swarming"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=POST_ID&theme=dark" alt="Featured on Product Hunt" height="28" /></a>
```

Replace `POST_ID` with the actual post ID after launch.

### Metrics to Track

| Metric | Target | Stretch |
|--------|--------|---------|
| PH ranking | Top 5 | #1 Product of the Day |
| Upvotes | 300+ | 500+ |
| GitHub stars (day of) | 200+ | 500+ |
| GitHub stars (week after) | 500+ | 2,000+ |
| npm installs (week after) | 100+ | 500+ |
| Comments on PH | 20+ | 50+ |
| Coming Soon subscribers | 50+ | 200+ |
