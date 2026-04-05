# Product Hunt Gallery Assets

Place all gallery images in this directory. See `docs/launch/producthunt.md` for full specs.

## Required Files

| File | Dimensions | Description |
|------|-----------|-------------|
| `01-hero-dark.png` | 1270x760 | Dark theme full visualization |
| `02-code-snippet.png` | 1270x760 | "3 lines to visualize" split screen |
| `03-use-cases.png` | 1270x760 | 2x3 use case grid |
| `04-performance.png` | 1270x760 | Benchmark comparison chart |
| `05-light-mobile.png` | 1270x760 | Light theme + mobile mockup |
| `swarming-demo.mp4` | 1920x1080 | 60-second product video |

## Capture Instructions

### 01 — Hero Screenshot
1. Open `https://swarming.world/world` in Chrome (2560px wide window)
2. Wait for 1000+ nodes to populate
3. Position camera for dramatic angle showing depth
4. Ensure stats bar shows 60fps
5. Screenshot with Cmd+Shift+4 or DevTools device toolbar at 2560x1536
6. Downscale to 1270x760

### 02 — Code Snippet
1. Open VS Code with the 3-line example from README
2. Use a dark theme (One Dark Pro or similar)
3. Font size 18, no minimap, no sidebar
4. Split screen: code on left, running visualization on right
5. Add text overlay: "3 lines of code. 5,000 nodes."

### 03 — Use Cases Grid
1. Create 6 thumbnail screenshots:
   - Blockchain transactions
   - Kubernetes pod network
   - Social network graph
   - IoT sensor mesh
   - AI agent collaboration
   - Financial market flow
2. Arrange in 2x3 grid with labels
3. Use Figma or similar for layout

### 04 — Performance Chart
1. Create bar chart comparing node counts at 60fps:
   - D3.js: ~500 nodes
   - Cytoscape: ~800 nodes
   - Sigma.js: ~2,000 nodes
   - Swarming: ~5,000+ nodes
2. Use brand violet (#8b5cf6) for Swarming bars
3. Gray (#6b7280) for competitors
4. Clean, minimal design

### 05 — Light Theme + Mobile
1. Screenshot light theme on desktop
2. Screenshot mobile view in Chrome DevTools (iPhone 14 Pro)
3. Compose side-by-side with device mockup frames

## Optimization

Run all PNGs through optimization before upload:

```bash
# Using pngquant (install: brew install pngquant)
pngquant --quality=80-95 --strip *.png

# Or use tinypng.com for web-based optimization
```

Target: <500KB per image, <50MB for video.
