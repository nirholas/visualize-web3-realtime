# Task 34: npm Downloads Growth Strategy

## Goal
Drive npm weekly downloads from 0 to 10,000+. npm downloads are both a growth metric and a growth driver (high download counts attract more downloads via social proof).

## Context
GitHub stars and npm downloads are correlated but different audiences. Stars = "this looks cool." Downloads = "I'm using this." Downloads compound: every project that depends on swarming drives transitive downloads.

## Actions

### 1. Package Quality Score
npm has a quality score visible on the package page. Maximize it:
- [ ] Include `README.md` (detailed, with examples)
- [ ] Include `LICENSE` (MIT)
- [ ] Include TypeScript types (`types` field in package.json)
- [ ] Include `repository` field
- [ ] Include `homepage` field
- [ ] Include `keywords` field (20+ relevant terms)
- [ ] Include `engines` field (node version)
- [ ] Include `exports` field (proper ESM/CJS)
- [ ] Include `files` field (only ship necessary files)
- [ ] No security vulnerabilities (`npm audit`)
- [ ] Recent publish date (publish frequently)

### 2. Package.json Optimization
```json
{
  "name": "swarming",
  "version": "0.1.0",
  "description": "GPU-accelerated real-time network visualization. 5,000+ nodes at 60fps.",
  "keywords": [
    "visualization", "data-visualization", "3d", "force-graph",
    "force-directed", "graph", "network", "real-time", "threejs",
    "react", "webgl", "webgpu", "particles", "streaming",
    "websocket", "interactive", "gpu", "instanced-mesh",
    "d3-force", "graph-visualization"
  ],
  "homepage": "https://swarming.dev",
  "repository": {
    "type": "git",
    "url": "https://github.com/swarming-vis/swarming"
  },
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": { "import": "./dist/index.mjs", "require": "./dist/index.cjs", "types": "./dist/index.d.ts" },
    "./2d": { "import": "./dist/2d.mjs", "types": "./dist/2d.d.ts" }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "peerDependencies": {
    "react": "^18 || ^19",
    "three": ">=0.150"
  }
}
```

### 3. Semver & Release Cadence
- Publish at least monthly (shows activity)
- Use semantic versioning strictly
- Changelog generated from commit messages (conventional commits)
- GitHub Releases for each version
- Announce each release on Discord + Twitter

### 4. Starter Templates on Popular Platforms
Create templates that install swarming as a dependency:
- **CodeSandbox template**: "swarming starter" (appears in search)
- **StackBlitz template**: "swarming demo"
- **Vercel template**: One-click deploy with swarming
- **Repl.it template**: For educational use
- Each template drives installs

### 5. Integration Guides
Write guides for using swarming with popular tools:
- "Swarming + Next.js" (huge audience)
- "Swarming + Vite"
- "Swarming + Remix"
- "Swarming + Astro"
- "Swarming + Storybook"
- Each guide appears in search results for "[framework] visualization"

### 6. Ecosystem Packages
Publish companion packages that depend on core:
- `@swarming/plugin-github` — drives core installs
- `@swarming/plugin-kubernetes` — drives core installs
- `@swarming/theme-cyberpunk` — drives core installs
- Each plugin install = 1 additional core install (peer dep)

### 7. Track & Display
- Add npm download badge to README
- Track weekly downloads trend
- Celebrate milestones publicly (1k, 5k, 10k weekly downloads)

## Files to Modify
- `packages/swarming/package.json` — optimize all fields
- `README.md` — npm badge
- Release automation in `.github/workflows/release.yml`
