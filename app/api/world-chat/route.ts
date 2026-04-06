import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getToolDefinitions } from '@/features/World/ai/componentRegistry';

// ---------------------------------------------------------------------------
// In-memory rate limiter (per-IP, 20 requests / 60 s window, bounded)
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const MAX_TRACKED_IPS = 10_000;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    // Purge expired entries to bound memory usage
    if (ipHits.size >= MAX_TRACKED_IPS) {
      for (const [k, v] of ipHits) {
        if (now > v.resetAt) ipHits.delete(k);
      }
    }
    if (ipHits.size >= MAX_TRACKED_IPS) return true;
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// ---------------------------------------------------------------------------
// Anthropic client — reads ANTHROPIC_API_KEY from env at request time
// ---------------------------------------------------------------------------

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  return new Anthropic({ apiKey });
}

// ---------------------------------------------------------------------------
// Tool definitions from the component registry
// ---------------------------------------------------------------------------

const tools: Anthropic.Messages.Tool[] = getToolDefinitions().map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.input_schema as Anthropic.Messages.Tool['input_schema'],
}));

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

interface AgentMetrics {
  activeAgents: number;
  activeTasks: number;
  completedTasks: number;
  recentToolCalls: string[];
}

interface ChatContext {
  stats: {
    totalEvents: number;
    totalVolume: number;
    connections: number;
  };
  hubCount: number;
  agentMetrics?: AgentMetrics;
}

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// Input constraints
// ---------------------------------------------------------------------------
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 4_000; // characters per message
const MAX_TOOL_CALLS_SHOWN = 5;
const VALID_ROLES = new Set(['user', 'assistant']);

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/** Sanitize a plain-text string: trim and truncate to maxLen. */
function sanitizeString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  }

  let body: { messages: IncomingMessage[]; context: ChatContext };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { messages, context } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
  }

  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: `Maximum ${MAX_MESSAGES} messages allowed` }, { status: 400 });
  }

  // Validate and sanitize each message
  const sanitizedMessages: IncomingMessage[] = [];
  for (const m of messages) {
    if (!m || typeof m !== 'object') {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }
    if (!VALID_ROLES.has(m.role)) {
      return NextResponse.json({ error: 'Invalid message role' }, { status: 400 });
    }
    if (typeof m.content !== 'string' || m.content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content must be a non-empty string' }, { status: 400 });
    }
    if (m.content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 },
      );
    }
    sanitizedMessages.push({ role: m.role, content: m.content.trim() });
  }

  // Sanitize context — treat all values as untrusted
  const safeStats = {
    totalEvents: Number(context?.stats?.totalEvents) || 0,
    totalVolume: Number(context?.stats?.totalVolume) || 0,
    connections: Number(context?.stats?.connections) || 0,
  };
  const safeHubCount = Number(context?.hubCount) || 0;

  // Build agent context section if metrics are available (sanitized)
  let agentSection = '';
  if (context?.agentMetrics) {
    const am = context.agentMetrics;
    const activeAgents = Number(am.activeAgents) || 0;
    const activeTasks = Number(am.activeTasks) || 0;
    const completedTasks = Number(am.completedTasks) || 0;
    const recentTools = Array.isArray(am.recentToolCalls)
      ? am.recentToolCalls
          .slice(0, MAX_TOOL_CALLS_SHOWN)
          .map((t: unknown) => sanitizeString(t, 80))
          .filter(Boolean)
          .join(', ')
      : 'none';

    agentSection = `\nAgent System Status:
- ${activeAgents} active AI agents
- ${activeTasks} tasks in progress, ${completedTasks} completed
- Recent tool calls: ${recentTools || 'none'}
Agents use Claude to autonomously analyze DeFi data via MCP tools (protocol_stats, recent_trades, agent_activity, proof_status).`;
  }

  // Build system prompt with live context
  const systemPrompt = `You are the AI agent controlling a 3D visualization of Web3 activity.
You can see ${safeStats.totalEvents} events across ${safeHubCount} protocol hubs.
Total volume: $${safeStats.totalVolume.toLocaleString()}.
Active connections: ${safeStats.connections}.${agentSection}

You can use tools to modify the scene:
- sceneColorUpdate: Change background, protocol, and user node colors (hex strings)
- cameraFocus: Focus camera on a specific hub by index (0-based) or position
- dataFilter: Filter visible data by protocols, volume, or time range
- agentSummary: Display a summary card with agent metrics
- tradeVisualization: Highlight specific trades in the 3D scene

Be concise. When the user asks to change visual elements, use the appropriate tool.
When answering questions about the data, reference the stats you have.
You can discuss agent activity, verification proofs, and protocol health.
Always respond with a brief text message in addition to any tool calls.`;

  try {
    const client = getClient();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: sanitizedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      tools,
    });

    // Parse tool use from response
    const actions: Array<{ type: string; params: unknown }> = [];
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

    // If the AI only used tools and didn't produce text, add a default message
    if (!textMessage && actions.length > 0) {
      const actionNames = actions.map((a) => a.type).join(', ');
      textMessage = `Applied: ${actionNames}`;
    }

    return NextResponse.json({ message: textMessage, actions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // Don't leak API key details
    if (message.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service not configured. Set ANTHROPIC_API_KEY in environment.' },
        { status: 503 },
      );
    }

    // Don't leak internal error details to clients
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
