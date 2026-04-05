# Task 01: Rebrand — Universal Identity

## Goal
Reposition the project from "Web3 visualization app" to "real-time data visualization engine" that happens to ship with a Web3 demo.

## Context
The current branding (swarming.world, crypto-centric README, Web3-only landing page) caps the audience at crypto developers. The engine is general-purpose — it can visualize ANY streaming data. The branding should reflect that.

## Requirements

### 1. Name & Tagline
- Evaluate keeping "swarming" as the core name (it's evocative, memorable, domain-agnostic)
- Drop the `.world` TLD from branding (too Web3-coded)
- New tagline candidates:
  - "Real-time data, visualized at 60fps"
  - "GPU-accelerated network visualization for any data stream"
  - "See your data swarm"
- Pick one that is short, technical, and universal

### 2. Logo & Visual Identity
- Design a minimal logomark (abstract particle cluster or force-graph node)
- Ensure it works at 16x16 (favicon), 64x64 (npm), and full size
- Color palette: keep the dark-mode aesthetic but ensure it doesn't read as "crypto"
- The logo should feel like a developer tool (think: Vite, Turborepo, Bun)

### 3. Package Naming
- Primary npm package: `@swarming/core` or `swarming` (check availability)
- Sub-packages: `@swarming/react`, `@swarming/providers`, `@swarming/cli`
- GitHub org: `swarming-vis` or `swarmingjs`

### 4. Landing Page Copy
- Rewrite hero section to lead with the engine, not the Web3 demo
- Show 3-4 use case thumbnails (network traffic, social graph, IoT, blockchain)
- "Enter World" CTA becomes "Try Live Demo" with a dropdown of demo sources

### 5. Social Profiles
- Create consistent branding across: GitHub org, npm, Twitter/X, Discord
- Bio: same tagline everywhere
- Banner image: animated GIF of the visualization

## Success Criteria
- A developer who has never touched crypto sees the README and thinks "I could use this for my project"
- The branding feels like a serious open-source tool, not a hackathon project
- npm package names are reserved and published (even if placeholder)

## Files to Modify
- `README.md`
- `package.json` (name, description, keywords)
- `app/layout.tsx` (metadata, title)
- `public/` (favicon, og-image, logo assets)
- Landing page components in `features/Landing/`
