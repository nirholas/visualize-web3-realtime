# app/opengraph-image.tsx

## File Path

`/workspaces/visualize-web3-realtime/app/opengraph-image.tsx`

## Purpose

Dynamically generates an Open Graph image for social media previews using Next.js's `ImageResponse` API. When social platforms or link previews request the OG image, this edge function renders a styled JSX template to a 1200x630 PNG image on the fly.

## Module Dependencies

| Import | Source | Description |
|--------|--------|-------------|
| `ImageResponse` | `next/og` | Next.js utility that renders JSX to a PNG image on the edge runtime. |

## Line-by-Line Documentation

### Line 1 -- Import

```ts
import { ImageResponse } from 'next/og';
```

Imports `ImageResponse` from the Next.js OG image generation module. This class accepts JSX and image options, returning a `Response` object containing a rendered PNG.

### Line 3 -- Runtime Configuration

```ts
export const runtime = 'edge';
```

Instructs Next.js to execute this route handler on the Edge Runtime (Cloudflare Workers-compatible) rather than Node.js. Required for `ImageResponse` to function correctly.

### Line 4 -- Alt Text

```ts
export const alt = 'PumpFun World -- real-time 3D token visualization';
```

Exported string that Next.js uses as the `alt` attribute on the generated `<meta property="og:image:alt">` tag.

### Line 5 -- Image Dimensions

```ts
export const size = { width: 1200, height: 630 };
```

Standard Open Graph image dimensions (1200x630 pixels). This object is spread into the `ImageResponse` options.

### Line 6 -- Content Type

```ts
export const contentType = 'image/png';
```

Declares the MIME type of the generated image. Next.js uses this to set the `Content-Type` response header.

### Lines 8-61 -- OGImage Component

```ts
export default function OGImage() { ... }
```

Default export function that returns an `ImageResponse`. This is a Next.js convention for file-based OG image generation.

#### Outer Container (Lines 12-23)

A full-size `<div>` with:
- `background: '#0a0a14'` -- Dark navy/black background.
- `color: '#ffffff'` -- White text.
- `display: 'flex'` with centered alignment -- Centers content both horizontally and vertically.
- `fontFamily: 'monospace'` -- Uses the system monospace font (IBM Plex Mono is not available in the edge image renderer).

#### Inner Container (Lines 24-31)

A flex column with 16px gap containing the title card and subtitle.

#### Title Card (Lines 32-45)

A `<div>` rendered as the main visual element:
- `border: '2px solid rgba(120, 140, 234, 0.4)'` -- Semi-transparent purple/blue border.
- `borderRadius: 24` -- Rounded corners.
- `fontSize: 48` -- Large title text.
- `fontWeight: 600` -- Semi-bold weight.
- `letterSpacing: '-0.02em'` -- Slight negative tracking for display type.
- `padding: '24px 48px'` -- Generous padding.
- Text content: `"PumpFun World"`.

#### Subtitle (Lines 46-56)

A `<div>` beneath the title card:
- `color: 'rgba(255, 255, 255, 0.5)'` -- 50% opacity white.
- `fontSize: 20` -- Smaller subtitle text.
- `letterSpacing: '0.1em'` -- Wide tracking.
- `textTransform: 'uppercase'` -- All caps.
- Text content: `"Real-time 3D Token Visualization"`.

#### ImageResponse Construction (Lines 58-60)

```ts
return new ImageResponse( <jsx>, { ...size } );
```

Creates the response with the JSX tree and spreads the `size` object (`{ width: 1200, height: 630 }`) as image options.

## Exported Members

| Export | Kind | Description |
|--------|------|-------------|
| `runtime` | Named constant (`string`) | Edge runtime declaration. |
| `alt` | Named constant (`string`) | Alt text for the OG image meta tag. |
| `size` | Named constant (`{ width: number; height: number }`) | Image dimensions. |
| `contentType` | Named constant (`string`) | MIME type for the response. |
| `OGImage` | Default function | Route handler that returns an `ImageResponse`. |

## Component Props

None. This is a route handler, not a traditional React component.

## State Management

None. Stateless edge function.

## Side Effects

- Generates a PNG image response when the route is requested.
- The generated image URL is automatically linked via Next.js metadata resolution.

## Usage Examples

Next.js automatically discovers this file and generates the appropriate `<meta>` tags:

```html
<meta property="og:image" content="/opengraph-image" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="PumpFun World -- real-time 3D token visualization" />
<meta property="og:image:type" content="image/png" />
```
