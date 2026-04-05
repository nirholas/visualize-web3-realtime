# Benchmark Suite

Reproducible performance benchmarks comparing **swarming** against popular graph visualization libraries.

## Libraries Tested

| Library | Renderer | Source |
|---------|----------|--------|
| **swarming** | Three.js WebGL + d3-force-3d | This project |
| d3-force + SVG | SVG DOM | [d3-force](https://d3js.org/d3-force) |
| d3-force + Canvas | Canvas 2D | [d3-force](https://d3js.org/d3-force) |
| Sigma.js | WebGL (Sigma) | [sigma.js](https://www.sigmajs.org/) |
| Cytoscape.js | Canvas 2D | [cytoscape.js](https://js.cytoscape.org/) |
| vis-network | Canvas 2D | [vis-network](https://visjs.github.io/vis-network/) |
| force-graph (3D) | Three.js WebGL | [3d-force-graph](https://github.com/vasturiano/3d-force-graph) |
| ngraph | Canvas 2D | [ngraph](https://github.com/anvaka/ngraph) |

## Quick Start

```bash
cd benchmarks
npm install
npx playwright install chromium

# Run all benchmarks
npm run bench

# Run specific library and node count
npm run bench -- --lib swarming --nodes 5000

# Generate comparison report (after running benchmarks)
npm run bench:report
```

## What's Measured

| Metric | Description |
|--------|-------------|
| FPS | Sustained framerate via `requestAnimationFrame` counting |
| Time to first frame | Mount to first rendered frame (ms) |
| Memory | `performance.memory.usedJSHeapSize` at steady state |
| Physics tick | Median time per simulation step (ms) |
| Render time | Median time per frame excluding physics (ms) |
| Startup time | Mount to interactive (ms) |

## How It Works

1. A static HTTP server serves each library's test page
2. Playwright opens each page in headless Chromium
3. 3-second warmup, then 5-second measurement window
4. Results collected from `window.__BENCH` (injected via `harness.js`)
5. Raw JSON written to `results/latest.json`
6. Report generator produces Markdown table and summary JSON

## Node Counts

Default: 500, 1,000, 2,000, 5,000, 10,000, 20,000

## Output Files

- `results/latest.json` — Raw benchmark data
- `results/comparison.md` — Markdown comparison tables
- `results/summary.json` — Pivoted data for the `/benchmarks` page

## Fairness

Each library uses its recommended configuration from official documentation. No strawman setups. The same random graph structure (2 edges per node) is used across all libraries.
