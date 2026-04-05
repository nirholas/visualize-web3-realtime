# Task 12: Hero Media Assets — GIFs, Videos, Screenshots

## Goal
Create a library of stunning visual assets that can be used across the README, docs, social media, and launch campaigns. The visual quality of these assets directly determines star velocity.

## Context
People star what looks beautiful. A 10-second GIF in the README is worth more than 1,000 words of documentation. Every successful visualization library has iconic screenshots/videos that circulate on social media.

## Assets to Create

### 1. Hero GIF (README)
- **Dimensions**: 800x450px (GitHub README sweet spot)
- **Duration**: 8-12 seconds, perfect loop
- **Content**: The most mesmerizing view of the visualization
  - Start zoomed out showing the full network
  - Show nodes flowing in real-time
  - Mouse interaction (cursor sweeps through, particles scatter)
  - Camera slowly orbits
- **File size**: <5MB (GitHub renders GIFs inline up to 10MB)
- **Optimization**: Record at 2x, downscale. Use `gifsicle --optimize=3`

### 2. Social Media Videos (Twitter/X)
4 short videos, each 15-30 seconds:

#### a) "The Overview"
- Full network view, slow orbit, bloom on
- Caption: "5,000 nodes. 60fps. Real-time."

#### b) "The Zoom"
- Start zoomed out, fly into a cluster, show individual nodes with labels
- Caption: "Every particle is a real event."

#### c) "The Interaction"
- Mouse sweeping through the network, particles scattering and reforming
- Caption: "GPU-accelerated mouse repulsion in the browser."

#### d) "The Speed"
- Split screen: same dataset in swarming (smooth) vs d3-force (choppy)
- Caption: "Left: swarming. Right: the other guys."

**Format**: MP4, 1080x1080 (square for Twitter), also 16:9 for YouTube/blog

### 3. Feature Screenshots (Docs)
High-res PNG screenshots for each major feature:
- Dark theme full view
- Light theme full view
- Mouse repulsion effect
- Bloom post-processing on/off comparison
- Protocol filter sidebar
- Stats bar with live counters
- Different data sources (crypto, K8s, social, etc.)
- Mobile responsive view

### 4. Architecture Diagram
- Clean SVG diagram showing: Data Source -> Provider -> Engine -> Renderer
- Style: monochrome with accent color, minimal, technical
- For the docs "How it Works" section

### 5. Open Graph Image
- 1200x630px PNG (social preview when URL is shared)
- Logo + hero visualization + tagline
- Dark background, vibrant nodes

### 6. Favicon Set
- 16x16, 32x32, 180x180 (Apple touch), 512x512 (PWA)
- Simple, recognizable at small sizes
- Derived from the logomark

### 7. Demo Thumbnails
One 400x300px thumbnail per demo template (Task 10):
- GitHub Activity
- Kubernetes
- Social Network
- API Traffic
- AI Agents
- IoT Sensors

## Technical Notes
- Use Playwright to programmatically capture screenshots at exact viewports
- Record GIFs with screen capture tool, optimize with `gifsicle` or `ffmpeg`
- Videos: record at 60fps, encode with `ffmpeg -crf 18` for quality
- Store originals in `docs/assets/` or a separate media branch
- Optimize all images with `sharp` or `imagemin` before committing
- Create a script: `npm run screenshots` that captures all assets programmatically

## Files to Create
```
docs/assets/
├── hero.gif                 # README hero
├── hero.mp4                 # Higher quality video version
├── social/
│   ├── overview.mp4
│   ├── zoom.mp4
│   ├── interaction.mp4
│   └── comparison.mp4
├── screenshots/
│   ├── dark-full.png
│   ├── light-full.png
│   ├── mouse-repulsion.png
│   ├── bloom-comparison.png
│   ├── mobile.png
│   └── [feature].png
├── og-image.png
├── favicon/
│   ├── favicon.ico
│   ├── favicon-32x32.png
│   └── apple-touch-icon.png
├── diagrams/
│   └── architecture.svg
└── thumbnails/
    ├── github.png
    ├── kubernetes.png
    ├── social.png
    ├── api-traffic.png
    ├── ai-agents.png
    └── iot.png

scripts/
└── capture-assets.ts        # Playwright screenshot automation
```
