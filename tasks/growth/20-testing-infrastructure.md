# Task 20: Testing Infrastructure

## Goal
Add comprehensive testing to signal project maturity, prevent regressions, and make contributors confident their changes won't break things.

## Context
No visible testing infrastructure exists. For a library that others depend on, tests are non-negotiable. They're also a trust signal — developers check for tests before adopting a dependency. A green CI badge in the README says "this project is serious."

## Requirements

### 1. Test Framework Setup
- **Unit/Integration**: Vitest (fast, TypeScript-native, Vite-compatible)
- **Component Testing**: @testing-library/react + vitest
- **E2E/Visual**: Playwright (for screenshot tests and full-page interaction)
- **Coverage**: Vitest built-in coverage with v8

### 2. Unit Tests (packages/swarming/)

#### Physics Engine
- `SpatialHash` — insert, query, remove, boundary conditions
- `forceSimulation` — node positioning converges, spring forces correct
- Physics config changes apply correctly

#### Data Providers
- `WebSocketProvider` — connects, parses messages, emits events, handles disconnect
- `StaticProvider` — loads data, emits initial batch
- `createProvider` — factory produces valid provider
- Event normalization (raw data → SwarmingEvent)

#### Plugin System
- `definePlugin` — validates plugin shape
- Plugin loading order
- Config validation
- Multiple plugins compose correctly

#### Utilities
- Color mapping functions
- Data aggregation (top N hubs, edge building)
- URL sharing (encode/decode)

### 3. Component Tests

#### `<Swarming />`
- Renders without crashing (smoke test)
- Accepts `data` prop and renders nodes
- Calls `onReady` when mounted
- Calls `onNodeClick` when node clicked
- Respects `maxNodes` prop
- Applies theme correctly
- Cleans up on unmount (no WebSocket leaks)

#### UI Components
- Stats bar renders formatted numbers
- Filter sidebar toggles categories
- Search finds nodes

### 4. Visual Regression Tests (Playwright)
- Capture screenshots of the visualization at:
  - 100 nodes
  - 1,000 nodes
  - 5,000 nodes
- Compare against baseline images
- Detect unintended visual changes
- Run on CI (headless Chrome)

### 5. Performance Tests
- Measure and assert: FPS > 55 at 2,000 nodes
- Measure and assert: memory < 200MB at 5,000 nodes
- Track performance over time (store results in CI artifacts)

### 6. CI Configuration
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test -- --coverage
      - run: npm run build
      - uses: codecov/codecov-action@v4

  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:visual
```

### 7. Coverage Targets
- Core physics/data: >80% line coverage
- Components: >60% (hard to test 3D rendering)
- Overall: >70%
- Add Codecov badge to README

## Files to Create
```
vitest.config.ts
playwright.config.ts
packages/swarming/src/__tests__/
├── SpatialHash.test.ts
├── physics.test.ts
├── providers.test.ts
├── plugins.test.ts
├── Swarming.test.tsx
└── utils.test.ts
tests/
├── visual/
│   ├── screenshots.spec.ts
│   └── baselines/
└── performance/
    └── fps.spec.ts
.github/workflows/ci.yml
```
