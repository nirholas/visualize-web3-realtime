# Task 33: AI-Powered Features

## Goal
Add AI-powered features that make swarming smarter and more useful, capitalizing on the AI hype cycle for press coverage and social media virality.

## Context
AI features generate outsized attention right now. "AI-powered" in the title of an HN post gets 2x clicks. But the features must be genuinely useful, not gimmicky. We already have an AI chat integration — let's expand it.

## Requirements

### 1. Natural Language Queries
```tsx
<Swarming
  source="wss://..."
  ai={{ 
    provider: 'openai', // or 'anthropic', 'ollama'
    apiKey: process.env.OPENAI_API_KEY,
  }}
/>
```

Users can ask questions about the visualization in natural language:
- "Show me the most active node in the last 5 minutes"
- "Highlight all nodes connected to wallet 0x..."
- "What's the total volume flowing through the top 3 hubs?"
- "Filter to only show error events"

The AI translates natural language into swarming API calls (filtering, highlighting, camera movement).

### 2. Anomaly Detection
```tsx
<Swarming
  source="wss://..."
  anomalyDetection={{
    enabled: true,
    sensitivity: 0.8, // 0-1
    onAnomaly: (anomaly) => {
      toast(`Unusual activity: ${anomaly.description}`)
    }
  }}
/>
```

Automatically detect and highlight:
- Sudden spikes in activity (volume, frequency)
- New nodes appearing at unusual rates
- Clusters forming or dissolving
- Outlier nodes (abnormally high/low connectivity)

Implementation: simple statistical methods (z-score, moving average deviation). No ML training required.

### 3. Auto-Narration
Generate a real-time text description of what's happening:
```
"Network activity is increasing. Hub 'PEPE' has seen 340 trades in 
the last minute, up 5x from baseline. A new cluster is forming around 
wallet 0x7f...3a with connections to 12 other nodes."
```

Useful for:
- Accessibility (screen reader users)
- Monitoring dashboards (Slack/Discord alerts)
- Content creation (auto-generated captions for recordings)

### 4. Smart Layouts
AI-suggested layout optimizations:
- "These 3 clusters should be separated" (adjust physics)
- "This hub is too central, it's obscuring the pattern" (rebalance)
- Auto-adjust charge/distance/damping based on graph density

### 5. Prompt-to-Visualization
```tsx
// Generate a visualization from a text description
<Swarming
  prompt="Show me a network of 50 nodes with 3 clusters, 
          each cluster a different color, with occasional 
          cross-cluster connections"
/>
```

The AI generates the data structure from the prompt. Great for demos, prototyping, and education.

## Implementation Notes
- All AI features are optional (no API key = no AI features)
- Support multiple providers: OpenAI, Anthropic, Ollama (local)
- Anomaly detection uses zero AI — pure statistics
- Natural language queries use function calling (tool use)
- Keep AI code in a separate package (`@swarming/ai`) for tree-shaking

## Files to Create
```
packages/swarming-ai/
├── src/
│   ├── index.ts
│   ├── nlq.ts              # Natural language queries
│   ├── anomaly.ts          # Statistical anomaly detection
│   ├── narration.ts        # Auto-narration
│   ├── smart-layout.ts     # Layout optimization
│   ├── prompt-to-viz.ts    # Text-to-visualization
│   └── providers/
│       ├── openai.ts
│       ├── anthropic.ts
│       └── ollama.ts
└── package.json
```
