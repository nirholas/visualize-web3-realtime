# app/layout.tsx

## File Path

`/workspaces/visualize-web3-realtime/app/layout.tsx`

## Purpose

Root layout component for the Next.js application. Defines the top-level HTML structure, global metadata (including Open Graph and Twitter card tags), and loads the IBM Plex Mono font from Google Fonts. Every page in the application renders inside this layout.

## Module Dependencies

| Import | Source | Description |
|--------|--------|-------------|
| `"./globals.css"` | Local CSS | Imports the global Tailwind CSS stylesheet and custom application styles. Side-effect only import -- no named exports consumed. |
| `Metadata` (type) | `next` | TypeScript type from the Next.js framework used to statically type the exported `metadata` object. |

## Line-by-Line Documentation

### Line 1 -- Global CSS Import

```ts
import "./globals.css";
```

Side-effect import that registers the global stylesheet. Tailwind base/components/utilities layers, CSS custom properties, keyframe animations, and responsive breakpoints are all loaded here. Must appear in the root layout so styles apply to every route.

### Line 2 -- Metadata Type Import

```ts
import type { Metadata } from "next";
```

Type-only import of the `Metadata` interface from Next.js. Used to ensure the exported `metadata` constant conforms to the Next.js metadata API contract.

### Lines 4-27 -- Metadata Export

```ts
export const metadata: Metadata = { ... };
```

A named export consumed by Next.js at build time to generate `<head>` tags.

| Property | Value | Purpose |
|----------|-------|---------|
| `title` | `"Web3 Realtime Visualizer"` | Sets the `<title>` tag. |
| `description` | `"Real-time 3D visualization of PumpFun token activity"` | Sets `<meta name="description">`. |
| `openGraph.title` | `"Web3 Realtime Visualizer"` | OG title for social sharing. |
| `openGraph.description` | `"Explore a living, breathing financial network in real time."` | OG description. |
| `openGraph.type` | `"website"` | Declares the OG content type. |
| `openGraph.siteName` | `"PumpFun World"` | Site name shown in OG card previews. |
| `openGraph.images` | Array with one entry | OG image at `/og-preview.png`, dimensions 1200x630, with alt text. |
| `twitter.card` | `"summary_large_image"` | Twitter card type for large preview images. |
| `twitter.title` | `"Web3 Realtime Visualizer"` | Twitter card title. |
| `twitter.description` | `"Explore a living, breathing financial network in real time."` | Twitter card description. |
| `twitter.images` | `["/og-preview.png"]` | Twitter card image path. |

### Lines 29-41 -- RootLayout Component

```ts
export default function RootLayout({ children }: { children: React.ReactNode }) { ... }
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `React.ReactNode` | Child routes/pages rendered within the layout. |

#### JSX Structure

- `<html lang="en">` -- Root HTML element with English language attribute.
  - `<head>` -- Contains a `<link>` element that loads the IBM Plex Mono font from Google Fonts CDN. Weights loaded: 200 (Extra Light), 300 (Light), 400 (Regular), 500 (Medium), 600 (Semi Bold). `display=swap` ensures text remains visible during font load.
  - `<body>` -- Renders `{children}`, which is the matched page component for the current route.

## Exported Members

| Export | Kind | Description |
|--------|------|-------------|
| `metadata` | Named constant (`Metadata`) | Next.js page metadata for SEO and social sharing. |
| `RootLayout` | Default function component | Root layout wrapping all pages. |

## State Management

None. This is a server component with no client-side state.

## Side Effects

- Imports `globals.css`, which registers global styles.
- The `metadata` export causes Next.js to inject `<meta>` and `<title>` tags into the document head at build time.
- External font loaded via Google Fonts CDN link tag.

## Usage Examples

This component is used automatically by Next.js as the root layout. It wraps every page:

```
app/
  layout.tsx   <-- this file
  page.tsx     <-- rendered as {children}
  world/
    page.tsx   <-- also rendered as {children}
```
