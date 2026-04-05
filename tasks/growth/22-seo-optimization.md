# Task 22: SEO & Discoverability Optimization

## Goal
Ensure the project appears in Google results for every relevant search query. Organic search is the most sustainable long-term growth channel.

## Context
Developers search for solutions before they browse GitHub trending. If someone searches "real-time graph visualization react" and we're not in the top 5 results, we've lost them to a competitor.

## Requirements

### 1. Target Keywords
| Keyword | Target Page | Search Volume |
|---------|-------------|---------------|
| "real-time data visualization" | Landing page | High |
| "3d force graph javascript" | Docs - Getting Started | Medium |
| "force directed graph react" | Docs - React Guide | Medium |
| "websocket visualization library" | Docs - WebSocket Guide | Medium |
| "d3 force graph alternative" | Blog - Comparison Post | Medium |
| "threejs network graph" | Blog - Technical Post | Medium |
| "graph visualization library 2026" | Landing page | High |
| "real-time network visualization" | Landing page | Medium |
| "kubernetes visualization tool" | K8s Demo Page | Medium |
| "social network graph visualization" | Social Demo Page | Low |

### 2. On-Page SEO

#### Landing Page
```tsx
// app/layout.tsx
export const metadata = {
  title: 'Swarming — Real-time Data Visualization at 60fps',
  description: 'GPU-accelerated 3D network visualization for any streaming data source. React component. 5,000+ nodes at 60fps. Open source.',
  keywords: ['data visualization', 'real-time', 'force graph', 'react', 'threejs', 'webgl', 'network graph'],
  openGraph: {
    title: 'Swarming — Real-time Data Visualization',
    description: '5,000+ nodes at 60fps. Any data source.',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Swarming',
    description: 'GPU-accelerated real-time network visualization',
    images: ['/og-image.png'],
  },
}
```

#### Each Doc Page
- Unique `<title>` with target keyword
- Meta description (150-160 chars) with keyword
- H1 matches the target keyword
- Internal links to related pages
- Schema.org structured data (SoftwareApplication)

#### Blog Posts
- URL slugs match target keywords (`/blog/real-time-graph-visualization-react`)
- Author, date, reading time in metadata
- Schema.org Article structured data

### 3. Technical SEO
- **Sitemap**: Auto-generated `sitemap.xml` (Next.js built-in)
- **Robots.txt**: Allow all crawlers, point to sitemap
- **Canonical URLs**: Every page has a canonical tag
- **Page speed**: Core Web Vitals all green (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- **Mobile-friendly**: Responsive design, passes Google mobile test
- **Structured data**: SoftwareApplication schema on landing page
- **Internal linking**: Every page links to 3+ related pages

### 4. Schema.org Markup
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Swarming",
  "description": "GPU-accelerated real-time network visualization",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Web Browser",
  "offers": { "@type": "Offer", "price": "0" },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5",
    "ratingCount": "100"
  }
}
```

### 5. npm Discoverability
- Package description matches primary keyword
- Keywords field includes all relevant terms
- README renders well on npmjs.com (no broken images)
- `homepage` field points to docs site
- `repository` field points to GitHub

### 6. GitHub Discoverability
- Topics (tags) include all relevant keywords
- Description is keyword-rich but natural
- README has structured headings (GitHub indexes H1-H3)
- "About" section filled with website link

### 7. Backlink Strategy
- Submit to awesome-lists:
  - awesome-threejs
  - awesome-react
  - awesome-dataviz
  - awesome-webgl
  - awesome-websocket
- Get listed on:
  - threejs.org/resources
  - reactjs.org/community (if applicable)
  - alternatives.to (as alternative to d3, sigma, cytoscape)

## Files to Modify
- `app/layout.tsx` — metadata
- `app/*/page.tsx` — per-page metadata
- `next.config.js` — redirects, headers
- `public/robots.txt`
- `app/sitemap.ts` — sitemap generation
