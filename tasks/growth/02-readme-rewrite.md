# Task 02: README Rewrite — Optimized for Virality

## Goal
Rewrite the README to follow the proven formula used by 50k+ star projects. The README is the single highest-leverage asset for GitHub stars.

## Context
100k-star READMEs follow a strict visual hierarchy: hero media -> one-liner -> instant start -> feature showcase -> comparison -> community. Every section must earn its place.

## Requirements

### 1. Hero Section (above the fold)
```
[Animated GIF or video embed — 800x400px, 10-15 seconds]
[Badges row: npm version | bundle size | license | discord | stars]

# swarming

GPU-accelerated real-time network visualization. 5,000+ nodes at 60fps. Any data source.

[Live Demo](link) · [Documentation](link) · [Discord](link)
```

### 2. Instant Start (must be <30 seconds to "wow")
```bash
npm install swarming
```

```tsx
import { Swarming } from 'swarming'

function App() {
  return <Swarming source="wss://your-websocket-url" />
}
```

Show a "that's it — you now have a real-time 3D visualization" moment.

Also include:
```bash
npx create-swarming-app my-viz
cd my-viz && npm run dev
```

### 3. Feature Grid (visual, scannable)
Create a 2x3 or 3x3 grid with screenshots/GIFs:

| Feature | Visual |
|---------|--------|
| 60fps @ 5,000 nodes | Benchmark GIF |
| Any WebSocket source | Code snippet |
| Force-directed physics | Physics demo GIF |
| Mouse interaction | Interaction GIF |
| Built-in themes | Theme comparison |
| Export & share | Screenshot feature |

### 4. Use Cases Section
Show 4-6 real-world applications with thumbnails:
- Blockchain transaction flows
- Kubernetes pod networking
- Social graph exploration
- IoT sensor networks
- AI agent orchestration
- Real-time trading activity

### 5. Performance Section
```
Benchmark: swarming vs alternatives

| Library     | 1,000 nodes | 5,000 nodes | 10,000 nodes |
|-------------|-------------|-------------|--------------|
| swarming    | 60 fps      | 60 fps      | 45 fps       |
| d3-force    | 45 fps      | 12 fps      | 3 fps        |
| sigma.js    | 55 fps      | 30 fps      | 15 fps       |
| cytoscape   | 40 fps      | 8 fps       | crash        |
```

### 6. API Overview
Brief, scannable table of the main props/options. Link to full docs.

### 7. Community & Contributing
- Discord link
- "Star this repo" CTA with explanation of why it helps
- Contributing guide link
- Showcase: "Built with Swarming" gallery link

### 8. Footer
- License (MIT)
- "Built by [team]" with links
- Sponsors section (even if empty — shows professionalism)

## Implementation Notes
- Record all GIFs at 2x resolution, optimize with `gifsicle`
- Hero GIF should show the most mesmerizing, universally appealing visualization
- Every code snippet must be copy-pasteable and actually work
- Run `npx markdown-link-check README.md` to verify all links

## Files to Create/Modify
- `README.md` — complete rewrite
- `docs/assets/` — hero GIF, feature screenshots, benchmark chart
- `.github/` — FUNDING.yml, ISSUE_TEMPLATE/, PULL_REQUEST_TEMPLATE.md
