# Task 10: Non-Crypto Use Case Templates

## Goal
Build 5-6 compelling demo templates for non-crypto use cases. Each should be a working, beautiful example that shows developers in different domains "this is for me."

## Context
The engine is general-purpose but every demo is crypto. Each new use-case template opens a new audience vertical. These templates serve triple duty: demos on the site, CLI scaffolder options, and social media content.

## Templates to Build

### 1. GitHub Activity Visualizer
**Audience**: Every developer on GitHub
**Data source**: GitHub Events API (REST polling or WebSocket via server)
**Visualization**:
- Hub nodes = repositories (top 8 by activity)
- Particle nodes = events (push, PR, issue, star, fork)
- Color coding: green=push, purple=PR, yellow=issue, blue=star, orange=fork
- Edge = developer -> repository connection

**Why it's viral**: People love seeing their own repos visualized. "Paste your GitHub org and watch it come alive."

```
app/demos/github/
├── page.tsx
├── GitHubProvider.ts
└── README.md
```

### 2. Kubernetes Cluster Monitor
**Audience**: DevOps engineers (massive market)
**Data source**: kubectl proxy / Kubernetes API watch endpoints
**Visualization**:
- Hub nodes = namespaces
- Particle nodes = pods
- Color: green=running, yellow=pending, red=error, gray=terminated
- Edges = service-to-pod connections
- Real-time: pods appear/disappear as they scale

**Why it's viral**: K8s dashboards are ugly. This is beautiful.

```
app/demos/kubernetes/
├── page.tsx
├── K8sProvider.ts
├── mock-data.ts           # Mock cluster for demo
└── README.md
```

### 3. Social Network Graph
**Audience**: Data scientists, social media developers
**Data source**: Farcaster Hubs API or Bluesky AT Protocol firehose
**Visualization**:
- Hub nodes = top accounts by follower count
- Particle nodes = interactions (likes, reposts, follows, replies)
- Color by interaction type
- Edges = user -> user social connections

**Why it's viral**: Social graphs are inherently fascinating and shareable.

```
app/demos/social/
├── page.tsx
├── FarcasterProvider.ts
├── BlueskyProvider.ts
└── README.md
```

### 4. Real-Time API Traffic Monitor
**Audience**: Backend engineers, SRE teams
**Data source**: WebSocket from a log aggregator (or mock)
**Visualization**:
- Hub nodes = API endpoints (top 8 by traffic)
- Particle nodes = requests
- Color: green=2xx, yellow=3xx, orange=4xx, red=5xx
- Size = response time (bigger = slower)
- Edges = client IP -> endpoint

**Why it's viral**: Every engineering team has an API. Monitoring tools are boring. This is not.

```
app/demos/api-traffic/
├── page.tsx
├── ApiTrafficProvider.ts
├── mock-traffic.ts
└── README.md
```

### 5. AI Agent Swarm
**Audience**: AI/ML engineers (fast-growing market)
**Data source**: Agent orchestration events (already partially built!)
**Visualization**:
- Hub nodes = agent types (researcher, coder, reviewer, planner)
- Particle nodes = tasks/messages
- Color by agent type
- Edges = agent -> agent communication
- Size = task complexity

**Why it's viral**: AI agent orchestration is the hottest topic in tech right now.

```
app/demos/ai-agents/
├── page.tsx
├── AgentProvider.ts
└── README.md
```

### 6. IoT Sensor Network
**Audience**: IoT/embedded developers, smart city projects
**Data source**: MQTT over WebSocket (or mock)
**Visualization**:
- Hub nodes = sensor gateways/zones
- Particle nodes = sensor readings
- Color by reading type (temperature=red, humidity=blue, motion=green)
- Size = value magnitude
- Edges = sensor -> gateway

```
app/demos/iot/
├── page.tsx
├── IoTProvider.ts
├── mock-sensors.ts
└── README.md
```

## Demo Index Page
Create `/demos` route showing all demos in a beautiful grid:
- Animated thumbnail preview for each
- One-line description
- "View Demo" + "View Source" buttons
- Filterable by category

## Implementation Notes
- Each demo should work with mock data by default (no API keys required)
- Include a toggle to switch between mock and live data
- Each demo should be independently deployable (could become its own CodeSandbox)
- Reuse the `<Swarming />` component from Task 05 — these demos prove the API works

## Files to Create
- `app/demos/page.tsx` — demo index
- `app/demos/[slug]/` — individual demo pages
- One provider file per demo
- Mock data generators for each
