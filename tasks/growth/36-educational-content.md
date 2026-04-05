# Task 36: Educational Content & Tutorials

## Goal
Create educational content that teaches visualization concepts while using swarming as the tool. Education creates loyal users and ranks highly in search.

## Context
"How to build X" tutorials are the #1 search query pattern for developers. Every tutorial that uses swarming as the tool drives installs, stars, and long-term adoption. Educational content also gets shared by coding bootcamps and universities.

## Content to Create

### 1. YouTube Tutorial Series: "Visualize Everything"
5-10 minute episodes, each building a complete visualization:

| Episode | Title | Data Source |
|---------|-------|-------------|
| 1 | "Your First Visualization in 5 Minutes" | Static data |
| 2 | "Visualizing Live Data with WebSockets" | Mock WebSocket |
| 3 | "Visualize Your GitHub Organization" | GitHub API |
| 4 | "Real-Time Blockchain Visualization" | Solana PumpFun |
| 5 | "Monitor Your API in 3D" | Express middleware |
| 6 | "Social Network Graph Explorer" | Farcaster |
| 7 | "Building a Custom Data Provider" | Custom WS |
| 8 | "Themes and Customization Deep Dive" | Any |
| 9 | "Performance Optimization Guide" | Large dataset |
| 10 | "Building a Swarming Plugin" | Plugin system |

### 2. Written Tutorials (blog/docs)

#### Beginner
- "Getting Started with Swarming: A Complete Guide"
- "Understanding Force-Directed Graphs"
- "Connecting to Your First WebSocket"

#### Intermediate
- "Building a Custom Data Provider"
- "Creating a Custom Theme"
- "Adding Interactivity: Click, Hover, and Selection"
- "Deploying Swarming on Vercel"

#### Advanced
- "Performance Tuning: From 1,000 to 10,000 Nodes"
- "Custom Node Rendering with Three.js Shaders"
- "Building a Swarming Plugin from Scratch"
- "Server-Side Rendering Strategies"

### 3. Interactive Cookbook
A collection of copy-paste recipes on the docs site:

```
/cookbook
├── Basic Recipes
│   ├── Static graph
│   ├── WebSocket stream
│   ├── JSON file
│   └── REST API polling
├── Styling Recipes
│   ├── Custom node colors
│   ├── Gradient backgrounds
│   ├── Node size by value
│   └── Animated edges
├── Interaction Recipes
│   ├── Click to expand
│   ├── Hover tooltip
│   ├── Search and highlight
│   └── Drag to rearrange
├── Data Source Recipes
│   ├── Kafka consumer
│   ├── GraphQL subscription
│   ├── MQTT
│   └── Server-Sent Events
└── Integration Recipes
    ├── Next.js App Router
    ├── Vite + React
    ├── Remix
    └── Astro
```

Each recipe: description, code, live preview, "Open in Playground" link.

### 4. CodeSandbox / StackBlitz Examples
Create 20+ runnable examples:
- One for every cookbook recipe
- One for every use case template
- Linked from docs, README, and playground

### 5. University / Bootcamp Kit
Package for educators:
- Slide deck: "Introduction to Data Visualization with Swarming"
- Lab exercises: 5 progressive assignments
- Sample datasets
- Grading rubric for visualization projects
- MIT licensed for educational use

## Files to Create
```
docs/tutorials/
├── getting-started.mdx
├── websockets.mdx
├── custom-provider.mdx
├── custom-theme.mdx
├── performance.mdx
└── plugins.mdx

docs/cookbook/
├── page.tsx              # Cookbook index
├── [recipe]/page.tsx     # Individual recipe
└── recipes/
    ├── static-graph.mdx
    ├── websocket-stream.mdx
    ├── custom-colors.mdx
    └── [20+ more].mdx

docs/education/
├── slides.md
├── labs/
│   ├── lab-01-first-viz.md
│   ├── lab-02-live-data.md
│   ├── lab-03-custom-provider.md
│   ├── lab-04-interactivity.md
│   └── lab-05-full-project.md
└── datasets/
    ├── social-network.json
    ├── api-traffic.json
    └── dependencies.json
```
