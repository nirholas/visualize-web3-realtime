# Task 09: Interactive Playground — Try Without Installing

## Goal
Build a browser-based playground where developers can experiment with the swarming API, tweak parameters in real-time, and see results instantly — no install required.

## Context
Playgrounds are the #1 conversion tool for developer tools. Tailwind has play.tailwindcss.com, Three.js has threejs.org/editor, Framer Motion has their sandbox. A playground lets someone go from "curious" to "convinced" in 60 seconds.

## Requirements

### 1. URL
`/playground` route on the main site (or `play.swarming.dev` subdomain)

### 2. Layout
```
┌─────────────────────────────────────────────────┐
│ [Logo]  Playground    [Share] [Reset] [Fullscreen]│
├──────────────────────┬──────────────────────────┤
│                      │                          │
│   Code Editor        │   Live Preview           │
│   (Monaco/CodeMirror)│   (3D Visualization)     │
│                      │                          │
│                      │                          │
│                      │                          │
├──────────────────────┤                          │
│   Controls Panel     │                          │
│   ├ Nodes: [slider]  │                          │
│   ├ Charge: [slider] │                          │
│   ├ Theme: [toggle]  │                          │
│   ├ Bloom: [toggle]  │                          │
│   └ Source: [select]  │                          │
└──────────────────────┴──────────────────────────┘
```

### 3. Code Editor
- Use CodeMirror 6 or Monaco (Monaco is heavier but more familiar)
- Pre-populated with a working example
- TypeScript support with autocompletion for the swarming API
- Real-time compilation (debounced 300ms) via Sucrase or esbuild-wasm
- Error overlay when code has issues

### 4. Preset Examples
Dropdown to load pre-built examples:
- **Basic** — minimal static data
- **WebSocket** — live Solana data
- **Custom Theme** — themed visualization
- **Physics Tuning** — demonstrates charge/link/damping
- **Large Dataset** — 5,000 nodes performance demo
- **Custom Nodes** — custom node rendering
- **Event Handlers** — click/hover interactivity

### 5. Controls Panel
Real-time parameter tweaking without code changes:
- **Max Nodes**: slider (100 - 10,000)
- **Charge Strength**: slider (-100 to 0)
- **Link Distance**: slider (10 - 200)
- **Center Pull**: slider (0 - 1)
- **Theme**: dark / light toggle
- **Bloom**: on/off
- **Mouse Repulsion**: on/off
- **Data Source**: dropdown (static, mock, live Solana, live Ethereum)

Changes instantly reflect in both the preview AND the code editor.

### 6. Share & Export
- **Share URL**: Encode current code + settings in URL hash (compressed with lz-string)
- **Export**: Download as standalone HTML file or zip (Vite project)
- **CodeSandbox**: "Open in CodeSandbox" button
- **Copy Code**: One-click copy of current code

### 7. Performance
- The preview must maintain 60fps even while the editor is active
- Lazy-load Monaco/CodeMirror (don't block initial page load)
- Use Web Workers for code compilation
- The playground itself should load in <2 seconds

## Files to Create
```
app/playground/
├── page.tsx                  # Main playground page
├── components/
│   ├── PlaygroundEditor.tsx  # Code editor component
│   ├── PlaygroundPreview.tsx # Live preview renderer
│   ├── ControlsPanel.tsx     # Parameter sliders/toggles
│   ├── PresetSelector.tsx    # Example dropdown
│   └── ShareButton.tsx       # URL sharing logic
├── presets/
│   ├── basic.ts
│   ├── websocket.ts
│   ├── custom-theme.ts
│   ├── physics.ts
│   └── large-dataset.ts
└── lib/
    ├── compiler.ts           # Sucrase/esbuild compilation
    └── sharing.ts            # URL encoding/decoding
```
