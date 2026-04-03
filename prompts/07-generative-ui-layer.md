# Prompt 07: Generative UI Layer (AI-Driven Component Streaming)

## Objective
Implement an AI orchestration layer that enables autonomous agents to dynamically generate, stream, and interact with React components in the 3D world. This transforms the visualization from a passive display into an interactive, AI-driven interface where agents can spawn UI elements, update scene parameters, and respond to natural language.

## Problem
The current architecture is a **one-way data pipeline**: WebSocket events flow in, get buffered, and render as nodes in the force graph. There is no:
- Natural language interface for querying or commanding the visualization
- AI agent that can dynamically generate UI components based on data context
- Mechanism for the AI to modify scene parameters (colors, camera, filters) based on intent
- Interactive agent-driven overlays in the 3D world

## Architecture Overview

This is the largest and most complex enhancement. It requires:
1. An AI orchestration framework (Tambo, Vercel AI SDK, or custom)
2. A component registry with Zod schemas
3. A streaming UI renderer
4. Integration with existing data providers and scene controls

## Implementation

### Step 1: Choose and Install AI Orchestration Framework

**Option A — Tambo (recommended for Generative UI focus):**
```bash
npm install @anthropic-ai/sdk tambo-ai zod
```

**Option B — Vercel AI SDK (more mature, broader ecosystem):**
```bash
npm install ai @ai-sdk/anthropic zod
```

**Option C — Custom minimal implementation:**
Build a thin wrapper around the Anthropic SDK with tool-use for component generation. Lighter weight but more engineering effort.

**Recommendation**: Start with Option B (Vercel AI SDK) as it has the most robust streaming UI support with React Server Components and is well-tested with Next.js 14.

### Step 2: Create the Component Registry

Create `features/World/ai/componentRegistry.ts`:

```typescript
import { z } from 'zod';

/**
 * Registry of components the AI can generate.
 * Each entry maps a component name to its Zod schema and React component.
 */
export const componentRegistry = {
  sceneColorUpdate: {
    description: 'Changes the color scheme of the 3D world',
    schema: z.object({
      background: z.string().describe('Hex color for scene background'),
      protocolColor: z.string().describe('Hex color for protocol nodes'),
      userColor: z.string().describe('Hex color for user/agent nodes'),
      bloomIntensity: z.number().min(0).max(2).optional(),
    }),
  },

  cameraFocus: {
    description: 'Moves the camera to focus on a specific hub or region',
    schema: z.object({
      hubIndex: z.number().optional().describe('Index of hub to focus on'),
      position: z.tuple([z.number(), z.number(), z.number()]).optional(),
      lookAt: z.tuple([z.number(), z.number(), z.number()]).optional(),
    }),
  },

  dataFilter: {
    description: 'Filters visible data by protocol, time range, or volume',
    schema: z.object({
      protocols: z.array(z.string()).optional(),
      minVolume: z.number().optional(),
      timeRange: z.enum(['1h', '6h', '24h', '7d', 'all']).optional(),
    }),
  },

  agentSummary: {
    description: 'Displays a summary card of agent activity',
    schema: z.object({
      title: z.string(),
      metrics: z.array(z.object({
        label: z.string(),
        value: z.string(),
        change: z.number().optional(),
      })),
    }),
  },

  tradeVisualization: {
    description: 'Highlights a specific trade or series of trades in the 3D scene',
    schema: z.object({
      tradeIds: z.array(z.string()),
      highlightColor: z.string().optional(),
      duration: z.number().optional().describe('Highlight duration in ms'),
    }),
  },
};

export type ComponentRegistry = typeof componentRegistry;
export type ComponentName = keyof ComponentRegistry;
```

### Step 3: Create AI Chat Interface

Create `features/World/ai/WorldChat.tsx`:

```tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import type { GraphHandle } from '@web3viz/react-graph';
import type { ShareColors } from '../SharePanel';

interface WorldChatProps {
  graphRef: React.RefObject<GraphHandle | null>;
  onColorChange: (colors: ShareColors) => void;
  onFilterChange: (filters: { protocols?: string[]; timeRange?: string }) => void;
  stats: { totalEvents: number; totalVolume: number; connections: number };
}

export function WorldChat({ graphRef, onColorChange, onFilterChange, stats }: WorldChatProps) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);

    try {
      const response = await fetch('/api/world-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          context: {
            stats,
            hubCount: graphRef.current?.getHubCount() ?? 0,
          },
        }),
      });

      // Handle streamed response and tool calls
      // Parse AI response for component generation actions
      const data = await response.json();

      // Execute any scene commands from the AI
      if (data.actions) {
        for (const action of data.actions) {
          switch (action.type) {
            case 'sceneColorUpdate':
              onColorChange({
                background: action.params.background,
                protocol: action.params.protocolColor,
                user: action.params.userColor,
              });
              break;
            case 'cameraFocus':
              if (action.params.hubIndex !== undefined) {
                graphRef.current?.focusHub(action.params.hubIndex);
              }
              break;
            case 'dataFilter':
              onFilterChange(action.params);
              break;
          }
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to process request.' }]);
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, stats, graphRef, onColorChange, onFilterChange]);

  return (
    <div className="absolute bottom-4 left-4 w-80 bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
      {/* Message history */}
      <div className="max-h-60 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-blue-300' : 'text-gray-200'}`}>
            <span className="font-mono text-xs text-gray-500">
              {msg.role === 'user' ? 'you' : 'agent'}:
            </span>{' '}
            {msg.content}
          </div>
        ))}
        {isStreaming && (
          <div className="text-sm text-gray-400 animate-pulse">thinking...</div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-white/10 p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the world..."
          className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          disabled={isStreaming}
        />
      </form>
    </div>
  );
}
```

### Step 4: Create API Route

Create `app/api/world-chat/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { componentRegistry } from '@/features/World/ai/componentRegistry';

const anthropic = new Anthropic();

// Convert component registry to tool definitions
const tools = Object.entries(componentRegistry).map(([name, config]) => ({
  name,
  description: config.description,
  input_schema: config.schema, // Zod-to-JSON-schema conversion needed
}));

export async function POST(request: NextRequest) {
  const { messages, context } = await request.json();

  const systemPrompt = `You are the AI agent controlling a 3D visualization of Web3 activity. 
You can see ${context.stats.totalEvents} events across ${context.hubCount} protocol hubs.
Total volume: $${context.stats.totalVolume.toLocaleString()}.

You can use tools to modify the scene, camera, filters, and colors.
Be concise. Respond with visual actions when appropriate.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
    tools,
  });

  // Parse tool use from response
  const actions: any[] = [];
  let textMessage = '';

  for (const block of response.content) {
    if (block.type === 'text') {
      textMessage += block.text;
    } else if (block.type === 'tool_use') {
      actions.push({
        type: block.name,
        params: block.input,
      });
    }
  }

  return NextResponse.json({ message: textMessage, actions });
}
```

### Step 5: Create MCP Server for Blockchain Data (Future)

Create `packages/mcp/src/gizaServer.ts` as a stub for connecting the AI to live blockchain data:

```typescript
/**
 * MCP Server stub for Giza/blockchain data access.
 * 
 * This server exposes the following resources to the AI:
 * - protocol_stats: Current stats for each DeFi protocol
 * - recent_trades: Last N trades across all protocols
 * - agent_activity: ARMA agent reallocation history
 * - proof_status: Recent STARK proof verifications
 *
 * Implementation requires:
 * 1. Connection to Giza API backend
 * 2. Blockchain indexer integration
 * 3. Real-time event subscription
 */

export interface MCPResource {
  name: string;
  description: string;
  fetch: () => Promise<any>;
}

// Placeholder — implement when Giza API access is available
export const gizaResources: MCPResource[] = [
  {
    name: 'protocol_stats',
    description: 'Current statistics for monitored DeFi protocols',
    fetch: async () => {
      // TODO: Connect to Giza API
      return { protocols: [], timestamp: Date.now() };
    },
  },
  {
    name: 'recent_trades',
    description: 'Most recent autonomous agent trades',
    fetch: async () => {
      // TODO: Connect to ARMA trade history
      return { trades: [], count: 0 };
    },
  },
];
```

### Step 6: Wire WorldChat into the Page

In `app/world/page.tsx`, add the chat interface:

```tsx
import { WorldChat } from '@/features/World/ai/WorldChat';

// Inside the page component, alongside existing overlays:
<WorldChat
  graphRef={graphRef}
  onColorChange={handleColorChange}
  onFilterChange={handleFilterChange}
  stats={stats}
/>
```

### Step 7: Generative UI Components (Phase 2)

Once the basic chat-to-action pipeline works, add streamed component rendering:

- Agent summary cards that appear as floating HTML overlays in the 3D scene
- Real-time metric dashboards generated by the AI based on context
- Interactive parameter sliders that the AI can spawn and the user can manually adjust
- Trade highlight animations triggered by AI analysis

These use drei's `<Html>` component to render React inside the 3D scene, positioned at relevant world coordinates.

## Dependencies to Install
```bash
npm install @anthropic-ai/sdk zod
```

## Environment Variables Required
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Files to Create
- `features/World/ai/componentRegistry.ts` — Zod schemas for AI-generatable components
- `features/World/ai/WorldChat.tsx` — Chat interface component
- `app/api/world-chat/route.ts` — API route for AI processing
- `packages/mcp/src/gizaServer.ts` — MCP server stub for blockchain data

## Files to Modify
- `app/world/page.tsx` — Add `<WorldChat>` to the page
- `package.json` — Add `@anthropic-ai/sdk` and `zod` dependencies

## Acceptance Criteria
- Chat interface renders in the bottom-left of the world view
- User can type natural language commands (e.g., "make the background dark", "focus on the largest hub")
- AI responds with text AND executes scene actions (color changes, camera moves, filter updates)
- Scene actions execute immediately via existing GraphHandle and state callbacks
- Component registry defines typed schemas for all generatable components
- API route handles tool-use responses from Claude
- Streaming indicator shows while AI is processing
- MCP server stub is in place for future blockchain data integration
- Error states are handled gracefully (API failures, missing API key)

## Implementation Phases
1. **Phase 1**: Chat + scene commands (color, camera, filters) — core pipeline
2. **Phase 2**: Streamed component generation (summary cards, metric overlays)
3. **Phase 3**: MCP integration with live blockchain data
4. **Phase 4**: Interactable components (AI-spawned sliders, toggles that sync back to AI context)
