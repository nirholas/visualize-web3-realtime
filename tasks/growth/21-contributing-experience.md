# Task 21: Contributor Experience

## Goal
Make it easy and rewarding for external developers to contribute. The path from "I found a bug" to "my PR is merged" should take less than a day and feel great.

## Context
Open-source projects grow when contributors feel valued. The #1 reason people don't contribute is friction: unclear setup, no guidance on what to work on, slow PR reviews. Fixing this unlocks exponential growth.

## Requirements

### 1. CONTRIBUTING.md (rewrite)
```markdown
# Contributing to Swarming

We love contributions! Here's how to get started.

## Quick Start (5 minutes)

git clone https://github.com/swarming-vis/swarming
cd swarming
npm install
npm run dev

Open http://localhost:3000 to see the dev server.

## Project Structure
packages/
├── swarming/        # Core library (npm package)
├── create-swarming-app/  # CLI scaffolder
├── graph/           # Force graph engine
├── core/            # Shared types and utilities
├── ui/              # UI components
└── providers/       # Data source providers

## Making Changes
1. Fork the repo
2. Create a branch: git checkout -b my-feature
3. Make your changes
4. Run tests: npm run test
5. Run linting: npm run lint
6. Commit with a descriptive message
7. Open a PR

## What to Work On
→ Check issues labeled "good first issue" for beginner-friendly tasks
→ Check issues labeled "help wanted" for medium-complexity tasks
→ Check the roadmap in GitHub Discussions for bigger features

## Code Style
- TypeScript strict mode
- No `any` types
- Functional components with hooks
- Descriptive variable names
```

### 2. Good First Issues
Create and maintain 10+ issues labeled `good-first-issue`:
- Fix a typo in docs
- Add a missing TypeScript type
- Write a unit test for an existing function
- Add a new theme preset
- Improve an error message
- Add a prop to the `<Swarming />` component
- Create a new demo template
- Add keyboard shortcut

Each issue should have:
- Clear description of what needs to change
- Which file(s) to modify
- Expected behavior
- "Mentored" tag if a maintainer will guide the contributor

### 3. Issue Labels
```
good-first-issue  — Beginner-friendly
help-wanted       — Medium complexity, needs community help
bug               — Something isn't working
enhancement       — New feature or improvement
docs              — Documentation improvement
performance       — Performance-related
plugin            — Plugin system related
provider          — Data source provider
theme             — Theme/styling
breaking          — Breaking change
```

### 4. PR Template
```markdown
## What does this PR do?
<!-- Brief description -->

## How to test
<!-- Steps to verify the change -->

## Screenshots (if visual change)
<!-- Before/after screenshots -->

## Checklist
- [ ] Tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Types check (`npm run typecheck`)
- [ ] Documentation updated (if applicable)
```

### 5. Development Environment
- `npm run dev` — starts the dev server with hot reload
- `npm run dev:mock` — starts with mock data (no external dependencies)
- `npm run test:watch` — run tests in watch mode
- `npm run storybook` (optional) — component playground

### 6. Recognition
- All contributors listed in README (use all-contributors bot)
- Monthly "Contributor Spotlight" in Discord #announcements
- `@contributor` role in Discord after first merged PR
- Yearly "Top Contributors" acknowledgment

### 7. Automated Checks
- PR auto-labeling based on files changed
- Auto-assign reviewers via CODEOWNERS
- Bundle size check comment on every PR
- Lint/test/build status checks must pass before merge

## Files to Create/Modify
- `CONTRIBUTING.md` — rewrite
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/ISSUE_TEMPLATE/` — bug, feature, good-first-issue templates
- `.github/CODEOWNERS`
- `.github/workflows/ci.yml` — ensure checks run on PRs
- Create 10+ good-first-issue GitHub issues
