# Task 06: CDN Embed — Zero Build Step

## Goal
Create a `<script>` tag embed that renders a swarming visualization without any build tooling. This captures the audience that doesn't use React or doesn't want to set up a project.

## Context
Many viral visualization libraries (Chart.js, p5.js, anime.js) gained traction because you could paste a script tag into an HTML file and see results instantly. This is the lowest-friction adoption path.

## Requirements

### 1. Usage
```html
<!DOCTYPE html>
<html>
<body>
  <div id="viz" style="width: 100vw; height: 100vh;"></div>
  <script src="https://unpkg.com/swarming/dist/swarming.umd.js"></script>
  <script>
    Swarming.create('#viz', {
      source: 'wss://pumpportal.fun/api/data',
      theme: 'dark',
      maxNodes: 2000,
    })
  </script>
</body>
</html>
```

### 2. Imperative API
```js
const viz = Swarming.create('#container', { source: 'wss://...' })

// Control
viz.pause()
viz.resume()
viz.setTheme('light')
viz.setMaxNodes(5000)

// Data
viz.addNode({ id: 'new', label: 'New Node', group: 'default' })
viz.removeNode('old')

// Events
viz.on('nodeClick', (node) => console.log(node))
viz.on('ready', () => console.log('Visualization loaded'))

// Cleanup
viz.destroy()
```

### 3. Static Data Mode
```js
Swarming.create('#container', {
  data: {
    nodes: [
      { id: '1', label: 'Alice', group: 'users' },
      { id: '2', label: 'Bob', group: 'users' },
    ],
    edges: [
      { source: '1', target: '2', label: 'follows' }
    ]
  }
})
```

### 4. Build Configuration
- UMD bundle that exposes `window.Swarming`
- Also ship ESM for `<script type="module">` users
- Include React, Three.js, and R3F in the bundle (no peer deps for CDN usage)
- Target bundle size: <300KB gzipped (aggressive tree-shaking)
- Publish to unpkg and jsdelivr via npm
- Source map included for debugging

### 5. Embed Widget Mode
For blog posts, documentation, and iframes:
```html
<!-- Self-contained iframe embed -->
<iframe
  src="https://swarming.dev/embed?source=wss://...&theme=dark"
  width="800" height="600"
  style="border: none; border-radius: 8px;"
></iframe>
```

The embed route (`/embed`) should:
- Accept all configuration via URL params
- Render only the visualization (no chrome/UI)
- Include a subtle "Powered by Swarming" watermark (removable via `?watermark=false`)

## Files to Create
- `packages/swarming/src/umd.ts` — UMD entry point with imperative API
- `packages/swarming/tsup.config.ts` — add UMD build target
- `app/embed/page.tsx` — embeddable widget route
- `docs/examples/vanilla.html` — working HTML example
- `docs/examples/codepen.html` — CodePen-ready example
