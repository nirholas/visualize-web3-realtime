# Task 11: Performance Benchmarks — Prove the Claims

## Goal
Build a reproducible benchmark suite that proves swarming is the fastest real-time graph visualization library, and publish the results in a format that's easy to share and cite.

## Context
"60fps at 5,000 nodes" is the core value proposition. We need to prove it with numbers, make the benchmark runnable by anyone, and create shareable comparison charts. Performance claims without evidence are marketing; with evidence, they're technical authority.

## Requirements

### 1. Benchmark Suite
Create automated benchmarks that measure:

| Metric | Description |
|--------|-------------|
| FPS at N nodes | Sustained framerate at 500, 1k, 2k, 5k, 10k, 20k nodes |
| Time to first frame | From mount to first rendered frame |
| Memory usage | Heap size at steady state per node count |
| Physics tick time | Time per simulation step (ms) |
| Render time | Time per frame (ms), excluding physics |
| Startup time | Time from `<Swarming />` mount to interactive |

### 2. Comparison Libraries
Benchmark against:
- **d3-force** + SVG rendering
- **d3-force** + Canvas 2D rendering
- **Sigma.js** (WebGL 2D graph)
- **Cytoscape.js** (Canvas 2D)
- **vis-network** (Canvas 2D)
- **force-graph** (ThreeJS-based, by vasturiano)
- **ngraph** (WebGL)

For each competitor, use their recommended setup from docs. No strawman configs.

### 3. Benchmark Runner
```bash
# Run all benchmarks
npm run bench

# Run specific benchmark
npm run bench -- --lib swarming --nodes 5000

# Generate comparison report
npm run bench:report
```

Use Puppeteer/Playwright to:
1. Open each library's test page
2. Wait for steady state (5 seconds)
3. Measure FPS via `requestAnimationFrame` counting
4. Measure memory via `performance.memory`
5. Record results to JSON

### 4. Output Formats

#### Comparison Table (for README)
```
| Library      | 1,000 nodes | 5,000 nodes | 10,000 nodes | Bundle Size |
|-------------|-------------|-------------|--------------|-------------|
| swarming    | 60 fps      | 60 fps      | 45 fps       | 48 KB       |
| force-graph | 60 fps      | 35 fps      | 18 fps       | 52 KB       |
| sigma.js    | 55 fps      | 28 fps      | 12 fps       | 180 KB      |
| d3 + canvas | 45 fps      | 12 fps      | 3 fps        | 95 KB       |
| cytoscape   | 40 fps      | 8 fps       | crash        | 400 KB      |
```

#### Interactive Chart (for docs site)
- Bar chart or line chart comparing FPS across node counts
- Built with a simple charting lib (Chart.js or Recharts)
- Embeddable in README as an image and in docs as interactive

#### Raw JSON (for reproducibility)
```json
{
  "timestamp": "2026-04-05T...",
  "machine": { "cpu": "...", "ram": "...", "gpu": "..." },
  "results": [
    { "library": "swarming", "nodes": 5000, "fps": 60, "memory_mb": 120 }
  ]
}
```

### 5. Benchmark Page
`/benchmarks` route on the site:
- Interactive charts
- Methodology explanation
- "Run it yourself" instructions
- Hardware specs
- Links to each library tested
- Last updated date

### 6. CI Integration
- Run benchmarks on every release (not every PR — too slow)
- Track performance over time (detect regressions)
- Publish results to GitHub Pages or the docs site

## Files to Create
```
benchmarks/
├── README.md               # How to run benchmarks
├── runner.ts               # Puppeteer-based benchmark runner
├── report.ts               # Generate comparison charts/tables
├── libs/
│   ├── swarming.html       # Test page for swarming
│   ├── d3-force.html       # Test page for d3-force
│   ├── sigma.html
│   ├── cytoscape.html
│   ├── vis-network.html
│   ├── force-graph.html
│   └── ngraph.html
├── results/
│   └── latest.json
└── package.json
```
