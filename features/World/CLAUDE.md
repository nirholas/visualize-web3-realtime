# features/World

3D force-directed graph visualization of blockchain activity. The main visual feature of the app.

## Architecture

- **ForceGraph.tsx** — Core 3D graph using React Three Fiber + D3-force-3d. Renders nodes as instanced meshes for GPU performance.
- **StatsBar.tsx** — Real-time metrics bar (TPS, tokens, volume)
- **TimelineBar.tsx** — Temporal navigation / scrubbing
- **LiveFeed.tsx** — Scrolling event feed sidebar
- **ProviderPanel.tsx** — Toggle data sources on/off
- **ShareOverlay.tsx / SharePanel.tsx** — WebGL snapshot sharing

## Subdirectories

- `utils/` — Pure functions: hex validation, number formatting, address truncation, accessibility helpers. **Well-tested** — see `utils/__tests__/`
- `desktop/` — Desktop shell UI (taskbar, windows, draggable panels). Standalone layout system.
- `verification/` — Giza LuminAIR ZK proof verification. Uses **inline styles** (no Tailwind). Degrades gracefully if `@gizatech/luminair-web` is missing.
- `ai/` — AI-powered features (world chat, explanations)
- `onboarding/` — First-time user journey flow

## Key Patterns

- Provider data flows through `useProviders()` hook → ForceGraph
- Graph simulation runs in `@web3viz/core` ForceGraphSimulation (can be web worker)
- Node colors come from `CATEGORY_CONFIGS` in `@web3viz/core`
- All caches must use `BoundedMap`/`BoundedSet` (never unbounded `Map`/`Set`)

## Testing

```bash
npm test -- --run features/World
```
