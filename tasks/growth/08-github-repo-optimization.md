# Task 08: GitHub Repository Optimization

## Goal
Optimize every aspect of the GitHub repository to maximize discoverability, professionalism, and contributor friendliness. The repo itself is a product.

## Context
GitHub surfaces repos through topics, descriptions, stars, activity, and community health. Every one of these signals can be optimized. Many developers judge a project's quality in <10 seconds based on repo presentation.

## Requirements

### 1. Repository Settings
- **Description**: "GPU-accelerated real-time network visualization. 5,000+ nodes at 60fps."
- **Website**: Link to docs/demo site
- **Topics**: `visualization`, `3d`, `force-graph`, `real-time`, `threejs`, `react`, `webgl`, `network-graph`, `data-visualization`, `websocket`, `typescript`, `force-directed-graph`, `graph-visualization`
- Enable: Issues, Discussions, Projects, Wiki (if needed)
- Disable: Wiki (use docs site instead)

### 2. Community Health Files
```
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml          # Structured bug report form
│   ├── feature_request.yml     # Feature request form
│   └── config.yml              # Template chooser config
├── PULL_REQUEST_TEMPLATE.md    # PR checklist
├── DISCUSSION_TEMPLATE/
│   └── show-and-tell.yml       # "Built with Swarming" discussions
├── FUNDING.yml                 # GitHub Sponsors, Open Collective
├── CODEOWNERS                  # Auto-assign reviewers
├── CONTRIBUTING.md             # Contribution guide
├── CODE_OF_CONDUCT.md          # Contributor Covenant
├── SECURITY.md                 # Security policy
└── workflows/
    ├── ci.yml                  # Lint + test + build on PR
    ├── release.yml             # Auto-publish to npm on tag
    ├── size-check.yml          # Bundle size check on PR
    └── stale.yml               # Auto-close stale issues
```

### 3. Issue Templates

#### Bug Report (`bug_report.yml`)
```yaml
name: Bug Report
description: Report a bug
labels: ["bug"]
body:
  - type: textarea
    attributes:
      label: Description
      description: What happened?
  - type: textarea
    attributes:
      label: Steps to Reproduce
  - type: input
    attributes:
      label: swarming version
  - type: dropdown
    attributes:
      label: Framework
      options: [Next.js, Vite, Remix, Vanilla, Other]
  - type: textarea
    attributes:
      label: Screenshot / Recording
```

#### Feature Request (`feature_request.yml`)
```yaml
name: Feature Request
description: Suggest a feature
labels: ["enhancement"]
body:
  - type: textarea
    attributes:
      label: Problem
      description: What problem would this solve?
  - type: textarea
    attributes:
      label: Proposed Solution
  - type: textarea
    attributes:
      label: Alternatives Considered
```

### 4. CI/CD Pipeline

#### `ci.yml` — Run on every PR
- TypeScript type checking (`tsc --noEmit`)
- ESLint
- Unit tests (Vitest)
- Build all packages
- Bundle size comparison (report delta in PR comment)
- Visual regression test (optional, Chromatic or Percy)

#### `release.yml` — Publish on tag
- Build all packages
- Run full test suite
- Publish to npm (with provenance)
- Create GitHub Release with auto-generated notes
- Update changelog

#### `size-check.yml` — Bundle size gate
- Report gzipped bundle size on every PR
- Fail if core package exceeds 50KB gzipped
- Comment on PR with size comparison vs main

### 5. GitHub Discussions
Enable and seed with categories:
- **Announcements** — release notes, roadmap updates
- **Q&A** — help and support
- **Show & Tell** — "Built with Swarming" showcases
- **Ideas** — feature brainstorming
- **General** — everything else

### 6. GitHub Releases
- Use semantic versioning
- Auto-generate release notes from PR titles
- Include migration guide for breaking changes
- Pin latest stable release

### 7. Social Preview Image
- Create a 1280x640px social preview (Open Graph image)
- Shows: logo + hero visualization screenshot + tagline
- This appears when the repo URL is shared on Twitter/Slack/Discord

### 8. Badges in README
```markdown
[![npm version](https://img.shields.io/npm/v/swarming)](https://npmjs.com/package/swarming)
[![npm downloads](https://img.shields.io/npm/dm/swarming)](https://npmjs.com/package/swarming)
[![bundle size](https://img.shields.io/bundlephobia/minzip/swarming)](https://bundlephobia.com/package/swarming)
[![license](https://img.shields.io/github/license/swarming-vis/swarming)](LICENSE)
[![discord](https://img.shields.io/discord/XXXX?label=discord)](https://discord.gg/swarming)
```

## Files to Create/Modify
- `.github/` — all files listed above
- `README.md` — add badges
- Repository settings (manual, via GitHub UI or `gh` CLI)
