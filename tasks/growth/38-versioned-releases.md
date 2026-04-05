# Task 38: Versioned Releases & Changelog

## Goal
Establish a professional release process with semantic versioning, auto-generated changelogs, and GitHub Releases. Predictable releases build trust and give reasons to come back.

## Context
Each release is a content event — a reason to post on social media, send a newsletter, and remind people the project is alive. Professional releases signal maturity. Erratic releases signal abandonment risk.

## Requirements

### 1. Conventional Commits
Enforce commit message format:
```
feat: add WebGPU renderer support
fix: resolve memory leak in physics engine
docs: update getting started guide
perf: optimize spatial hash for 10k+ nodes
refactor: extract renderer interface
chore: update dependencies
BREAKING CHANGE: rename `source` prop to `dataSource`
```

Tools: `commitlint` + `husky` pre-commit hook

### 2. Automated Versioning
Use `changesets` or `semantic-release`:
```bash
# Developer adds a changeset
npx changeset
# > What kind of change? (major/minor/patch)
# > Which packages are affected?
# > Describe the change

# CI creates a "Version Packages" PR
# Merging the PR publishes to npm + creates GitHub Release
```

### 3. Changelog Generation
Auto-generated from commits/changesets:
```markdown
# Changelog

## v0.3.0 (2026-05-01)

### Features
- WebGPU renderer with automatic fallback (#42)
- New `cyberpunk` and `terminal` themes (#38)
- `<Swarming mode="2d" />` Canvas 2D rendering (#35)

### Bug Fixes
- Fix memory leak when switching data sources (#41)
- Resolve edge rendering artifacts at high zoom (#39)

### Performance
- 30% faster physics with Barnes-Hut optimization (#40)

### Breaking Changes
- Minimum React version is now 18.0 (#36)
```

### 4. GitHub Releases
Each version gets a GitHub Release with:
- Auto-generated release notes (from PR titles)
- Migration guide (for breaking changes)
- Download stats
- Links to npm, docs, changelog

### 5. Release Cadence
- **Patch** (x.x.1): As needed for bug fixes (same week)
- **Minor** (x.1.0): Every 2-4 weeks with new features
- **Major** (1.0.0): When API is stable and battle-tested
- **Pre-releases**: `0.x.0-beta.1` for testing before stable

### 6. Release Announcement Template
```
🚀 swarming v0.3.0 is out!

What's new:
• WebGPU renderer — 2x performance at 10k+ nodes
• 2D rendering mode — works without WebGL
• 2 new themes: cyberpunk & terminal

npm install swarming@latest

Full changelog: [link]
Try the playground: [link]

⭐ [GitHub link]
```

### 7. npm Publish Automation
```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: changesets/action@v1
        with:
          publish: npx changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Files to Create/Modify
```
.changeset/
├── config.json          # Changesets configuration
.commitlintrc.js         # Commit message linting
.husky/
├── pre-commit           # Run lint
├── commit-msg           # Run commitlint
CHANGELOG.md             # Auto-generated
.github/workflows/
├── release.yml          # Auto-publish on merge
└── ci.yml               # Add commitlint check
package.json             # Add changeset scripts
```
