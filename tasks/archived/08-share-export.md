# Task 08: Share on Social Media & Download Snapshots

## Context
After Task 07, we have the share panel with color customization. Now we need the actual export functionality: sharing to X/LinkedIn and downloading images.

## Reference Behavior (Giza World)
- Bottom of the share panel has a footer with 4 buttons:
  - "Share on X" — opens X/Twitter compose with pre-filled text + image
  - "Share on LinkedIn" — opens LinkedIn share with pre-filled text + image
  - "Download World" — downloads the full graph as a PNG
  - "Download Snapshot" — downloads a branded snapshot with metadata overlay
- The snapshot includes the color customizations and metadata overlays
- Share links include URL params encoding the current colors: `?bg=342c49&pc=8bf4b7&uc=d86e91`

## What to Build

### 1. Canvas Screenshot Utility
Create `features/World/utils/screenshot.ts`:
```typescript
async function captureCanvas(
  canvas: HTMLCanvasElement,
  overlayElement?: HTMLElement
): Promise<Blob>
```
- Use `canvas.toDataURL('image/png')` for the Three.js canvas
- If overlay element provided, use `html2canvas` to composite the HTML overlay on top
- Return as Blob for download or upload

### 2. Download World
- Captures just the Three.js canvas (the graph visualization)
- No metadata overlay, just the raw graph with current colors
- Downloads as `pumpfun-world-{timestamp}.png`
- Resolution: match canvas size (or 2x for retina)

### 3. Download Snapshot
- Captures the canvas + metadata overlay composite
- Includes: address info, stats, app branding
- Downloads as `pumpfun-snapshot-{timestamp}.png`
- Branded: includes logo watermark

### 4. Share on X (Twitter)
- Generate the snapshot image
- Option A (simpler): Open X compose URL with pre-filled text, user attaches image manually
  ```
  https://twitter.com/intent/tweet?text=...&url=...
  ```
- Option B (better): Upload image to a temporary host, include in URL
- Pre-filled text template:
  ```
  I'm part of a financial system breathing in real time.
  [X] tokens, $[Y] volume, [Z] transactions.
  
  Explore the world: {shareUrl}
  ```
- Share URL includes color params: `?bg=342c49&pc=8bf4b7&uc=d86e91&address=...`

### 5. Share on LinkedIn
- Similar to X but uses LinkedIn share URL:
  ```
  https://www.linkedin.com/sharing/share-offsite/?url=...
  ```
- Include the share URL with color/address params
- LinkedIn will use the og:image meta tag for preview

### 6. Share URL Generation
```typescript
function buildShareUrl(colors: ShareColors, address?: string): string {
  const params = new URLSearchParams()
  params.set('bg', colors.background.replace('#', ''))
  params.set('pc', colors.protocol.replace('#', ''))
  params.set('uc', colors.user.replace('#', ''))
  if (address) params.set('address', address)
  return `${window.location.origin}/world?${params.toString()}`
}
```
- On page load: parse these params and apply colors/address

### 7. Share Footer UI
Add to the bottom of SharePanel:
- Left group: "Share on X" + "Share on LinkedIn" buttons
- Right group: "Download World" + "Download Snapshot" buttons
- Buttons: dark text on light background, subtle hover effect
- Show loading spinner while generating screenshots

### 8. Install html2canvas
- Add `html2canvas` to dependencies for compositing HTML overlays onto canvas screenshots

## Files to Create/Modify
- `features/World/utils/screenshot.ts` — **NEW** screenshot utilities
- `features/World/SharePanel.tsx` — Add share/download footer buttons
- `features/World/ShareOverlay.tsx` — Ensure overlay is capturable by html2canvas
- `app/world/page.tsx` — Handle share URL params on load
- `app/layout.tsx` — Update og:image meta tags for share previews
- `package.json` — Add `html2canvas`

## Acceptance Criteria
- [ ] "Download World" saves a PNG of the raw graph visualization
- [ ] "Download Snapshot" saves a PNG with the graph + metadata overlay
- [ ] "Share on X" opens Twitter compose with pre-filled text and share URL
- [ ] "Share on LinkedIn" opens LinkedIn share with the share URL
- [ ] Share URL encodes current colors and address as query params
- [ ] Loading the share URL applies the encoded colors and highlights the address
- [ ] Screenshots capture the current color customizations
- [ ] Loading states shown while generating screenshots
- [ ] Downloaded images are high quality (at least 2x resolution)
