# Task 30: Enterprise Features

## Goal
Add features that make swarming adoptable by companies, which drives sustained star growth through internal advocacy and corporate open-source contributions.

## Context
Enterprise adoption is the long-tail growth engine. When a company adopts an open-source tool, every developer on that team becomes a potential star-giver and contributor. Enterprise features don't need to be paid — they need to exist.

## Requirements

### 1. Accessibility (a11y)
- **Screen reader support**: ARIA labels for nodes, edges, and controls
- **Keyboard navigation**: Tab through nodes, Enter to select, arrow keys to navigate
- **High contrast mode**: Theme that meets WCAG AA contrast ratios
- **Reduced motion**: Respect `prefers-reduced-motion` (static layout, no animations)
- **Color blind safe**: Palette options that work for deuteranopia, protanopia, tritanopia
- **Alt text**: Canvas fallback text description for screen readers

### 2. Data Labels & Tooltips
- Rich tooltips on node hover (customizable content)
- Node labels that scale with zoom (always readable)
- Edge labels for connection metadata
- Info panel: click a node to see full details in a side panel

### 3. Export & Reporting
- **PNG/JPEG export**: High-res screenshot with customizable resolution
- **SVG export**: Vector format for reports and presentations
- **PDF export**: Full-page visualization with metadata
- **CSV export**: Node and edge data as spreadsheet
- **JSON export**: Full graph state
- **Clipboard**: Copy visualization to clipboard (for pasting into Slack, docs)

### 4. Authentication & Data Privacy
- No data sent to swarming servers (everything runs client-side)
- Document this explicitly in a security/privacy page
- CSP (Content Security Policy) compatible
- Subresource Integrity (SRI) hashes for CDN usage

### 5. Custom Branding
- Remove/replace "Swarming" branding (white-label)
- Custom watermark/logo overlay
- Custom color schemes matching corporate brand
- Custom fonts

### 6. Internationalization (i18n)
- All UI strings externalized
- RTL layout support
- Number formatting (locale-aware)
- Ship with English; community can contribute translations

### 7. Monitoring & Observability
```tsx
<Swarming
  onMetrics={(metrics) => {
    // Send to your monitoring system
    datadog.gauge('swarming.fps', metrics.fps)
    datadog.gauge('swarming.nodes', metrics.nodeCount)
    datadog.gauge('swarming.memory_mb', metrics.memoryMB)
  }}
/>
```

### 8. Error Boundaries
- Graceful error handling (visualization crashes don't take down the page)
- Custom error UI
- Retry mechanism for WebSocket disconnections
- Offline mode (show last known state when disconnected)

### 9. Telemetry (opt-in)
- Anonymous usage telemetry (opt-in only, fully documented)
- Helps understand: most used features, common configurations, performance issues
- Can be disabled with one prop: `<Swarming telemetry={false} />`

## Files to Create/Modify
```
packages/swarming/src/
├── a11y/
│   ├── AriaLabels.tsx
│   ├── KeyboardNav.ts
│   ├── HighContrastTheme.ts
│   └── ReducedMotion.ts
├── export/
│   ├── png.ts
│   ├── svg.ts
│   ├── pdf.ts
│   ├── csv.ts
│   └── clipboard.ts
├── i18n/
│   ├── en.json
│   └── i18n.ts
└── monitoring/
    └── metrics.ts
```
