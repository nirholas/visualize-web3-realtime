# Task 32: GitHub Action — Visualize Your Repo

## Goal
Build a GitHub Action that generates a visualization of repository activity and commits it as an image to the repo's README. This is a growth hack — every repo that uses the action is free advertising.

## Context
The "GitHub profile README" trend proved that developers love visual flair in their repos. A GitHub Action that auto-generates a beautiful force graph of repo activity creates a viral loop: people see the visualization in other repos → install the action → their repos show the visualization → more people see it.

## Requirements

### 1. Usage
```yaml
# .github/workflows/swarming-viz.yml
name: Update Swarming Visualization
on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

jobs:
  visualize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: swarming-vis/swarming-action@v1
        with:
          output: docs/activity.svg
          theme: midnight
          days: 30
          width: 800
          height: 400
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'Update activity visualization'
```

Then in README:
```markdown
## Recent Activity
![Activity](docs/activity.svg)
```

### 2. Visualization Modes

#### `activity` (default)
- Hub nodes = top contributors
- Particle nodes = commits, PRs, issues
- Edges = contributor → file/area connections
- Size = lines changed

#### `dependencies`
- Hub nodes = direct dependencies
- Particle nodes = transitive dependencies
- Edges = dependency relationships
- Color = freshness (green=up-to-date, red=outdated)

#### `codebase`
- Hub nodes = top-level directories
- Particle nodes = files
- Edges = import relationships
- Size = file size or change frequency

### 3. Output Formats
- **SVG** (default): Vector, renders in README, small file size
- **PNG**: Raster, for social media
- **GIF**: Animated, shows data flowing (higher impact but larger)

### 4. Configuration
```yaml
with:
  # What to visualize
  mode: activity | dependencies | codebase
  
  # Time range (for activity mode)
  days: 30
  
  # Appearance
  theme: midnight | daylight | cyberpunk | ...
  width: 800
  height: 400
  
  # Output
  output: docs/activity.svg
  format: svg | png | gif
  
  # Optional
  exclude-bots: true
  min-commits: 5
```

### 5. Technical Implementation
- Run Playwright in headless mode to render the visualization
- Use the 2D mode (Task 28) for SVG/PNG output
- Capture as SVG via canvas serialization or as PNG via screenshot
- For GIF: capture 60 frames, compile with `gifski`
- Use `@octokit/rest` to fetch GitHub API data (commits, PRs, contributors)
- Node.js action (runs in ~30 seconds)

### 6. Marketing
- Create a showcase of repos using the action
- "Add this badge to your README" as onboarding
- Encourages starring the main repo (linked from action README)

## Files to Create
```
packages/swarming-action/
├── action.yml           # GitHub Action metadata
├── src/
│   ├── index.ts        # Action entry point
│   ├── github.ts       # GitHub API data fetching
│   ├── render.ts       # Headless rendering
│   └── output.ts       # SVG/PNG/GIF generation
├── Dockerfile          # Container action
├── package.json
└── README.md           # Action marketplace listing
```
