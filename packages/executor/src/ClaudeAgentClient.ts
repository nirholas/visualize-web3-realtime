import type { AgentIdentity, AgentTask, AgentEvent } from './types.js';
import type { AgentSpawnConfig } from './types.js';

/**
 * Claude SDK-powered agent client.
 *
 * Replaces the SperaxOS client with real AI agent execution using Claude.
 * Each agent is a Claude conversation that can use tools (MCP resources)
 * to reason about DeFi data and make decisions.
 *
 * In mock mode (no ANTHROPIC_API_KEY), falls back to synthetic event generation
 * for development/demo purposes.
 */

let _agentSeq = 0;

interface ClaudeAgentClientOptions {
  /** Anthropic API key. If empty, operates in mock mode. */
  apiKey: string;
  /** Claude model to use. Default: claude-sonnet-4-6 */
  model?: string;
  /** MCP tool definitions the agent can call. */
  tools?: Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>;
  /** Called when the agent emits an event (tool call, reasoning, etc.) */
  onEvent?: (event: AgentEvent) => void;
}

export class ClaudeAgentClient {
  private readonly mockMode: boolean;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly tools: ClaudeAgentClientOptions['tools'];
  private readonly onEvent?: (event: AgentEvent) => void;

  constructor(options: ClaudeAgentClientOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'claude-sonnet-4-6';
    this.tools = options.tools ?? [];
    this.onEvent = options.onEvent;
    this.mockMode = !options.apiKey;

    if (this.mockMode) {
      console.log('[ClaudeAgentClient] No API key — operating in mock mode');
    }
  }

  get isMockMode(): boolean {
    return this.mockMode;
  }

  async spawnAgent(config: AgentSpawnConfig): Promise<AgentIdentity> {
    const agentId = `agent_${Date.now()}_${++_agentSeq}`;
    const identity: AgentIdentity = {
      agentId,
      name: config.name ?? `${config.role}Agent${_agentSeq}`,
      role: config.role,
      createdAt: Date.now(),
    };

    return identity;
  }

  /**
   * Execute a task using Claude. The agent reasons through the task,
   * calling MCP tools as needed, and emits events for each step.
   */
  async executeTask(agentId: string, task: AgentTask): Promise<{
    success: boolean;
    result: string;
    toolCalls: Array<{ tool: string; input: unknown; output: unknown }>;
  }> {
    if (this.mockMode) {
      return this.executeMockTask(agentId, task);
    }

    return this.executeClaudeTask(agentId, task);
  }

  private async executeClaudeTask(agentId: string, task: AgentTask): Promise<{
    success: boolean;
    result: string;
    toolCalls: Array<{ tool: string; input: unknown; output: unknown }>;
  }> {
    // Dynamic import to avoid bundling Anthropic SDK when not needed
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: this.apiKey });

    const systemPrompt = `You are an autonomous AI agent with role: ${task.agentId}.
Your task: ${task.description}

You have access to MCP tools for querying DeFi protocol data, recent trades,
agent activity, and proof verification status. Use these tools to gather
information and make informed decisions.

Be thorough but efficient. Call tools only when needed. Provide a clear
summary of your findings and any actions taken.`;

    const toolDefs = this.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Messages.Tool['input_schema'],
    })) ?? [];

    const toolCallLog: Array<{ tool: string; input: unknown; output: unknown }> = [];
    let messages: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: task.description },
    ];

    // Agentic loop — keep calling Claude until it stops using tools
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      iterations++;

      this.emitEvent(agentId, task.taskId, 'reasoning:started', {
        iteration: iterations,
      });

      const response = await client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
        tools: toolDefs.length > 0 ? toolDefs : undefined,
      });

      // Process response blocks
      let hasToolUse = false;
      let resultText = '';
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          resultText += block.text;
          this.emitEvent(agentId, task.taskId, 'reasoning:text', {
            text: block.text,
          });
        } else if (block.type === 'tool_use') {
          hasToolUse = true;
          const callId = `call_${Date.now()}_${iterations}_${block.id}`;

          this.emitEvent(agentId, task.taskId, 'tool:started', {
            callId,
            toolName: block.name,
            toolCategory: 'mcp',
            inputSummary: JSON.stringify(block.input).slice(0, 200),
          });

          // Execute the tool via MCP resource fetcher
          let toolOutput: unknown;
          try {
            toolOutput = await this.executeTool(block.name, block.input);
          } catch (err) {
            toolOutput = { error: err instanceof Error ? err.message : 'Tool execution failed' };
          }

          toolCallLog.push({ tool: block.name, input: block.input, output: toolOutput });

          this.emitEvent(agentId, task.taskId, 'tool:completed', {
            callId,
            outputSummary: JSON.stringify(toolOutput).slice(0, 200),
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(toolOutput),
          });
        }
      }

      // If no tool use, we're done
      if (!hasToolUse || response.stop_reason === 'end_turn') {
        return { success: true, result: resultText, toolCalls: toolCallLog };
      }

      // Continue the conversation with tool results
      messages = [
        ...messages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];
    }

    return {
      success: true,
      result: 'Max iterations reached',
      toolCalls: toolCallLog,
    };
  }

  private async executeTool(name: string, input: unknown): Promise<unknown> {
    // This will be wired to the MCP resource fetcher
    // For now, return a placeholder that signals the tool was called
    const { fetchResource } = await import('../../mcp/src/gizaServer.js');
    return fetchResource(name);
  }

  private async executeMockTask(agentId: string, task: AgentTask): Promise<{
    success: boolean;
    result: string;
    toolCalls: Array<{ tool: string; input: unknown; output: unknown }>;
  }> {
    const mockTools = ['protocol_stats', 'recent_trades', 'agent_activity'];
    const toolCallLog: Array<{ tool: string; input: unknown; output: unknown }> = [];

    // Simulate 2-4 tool calls with delays
    const callCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < callCount; i++) {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 800));
      const tool = mockTools[i % mockTools.length];
      const callId = `mock_call_${Date.now()}_${i}`;

      this.emitEvent(agentId, task.taskId, 'tool:started', {
        callId,
        toolName: tool,
        toolCategory: 'mcp',
        inputSummary: `Querying ${tool}`,
      });

      await new Promise((r) => setTimeout(r, 100 + Math.random() * 300));

      const output = { status: 'ok', data: `Mock ${tool} result` };
      toolCallLog.push({ tool, input: {}, output });

      this.emitEvent(agentId, task.taskId, 'tool:completed', {
        callId,
        outputSummary: JSON.stringify(output),
      });
    }

    const failed = Math.random() < 0.1;
    return {
      success: !failed,
      result: failed ? 'Simulated task failure' : 'Task completed successfully with mock data',
      toolCalls: toolCallLog,
    };
  }

  private emitEvent(
    agentId: string,
    taskId: string | undefined,
    type: string,
    payload: Record<string, unknown>,
  ): void {
    if (!this.onEvent) return;
    this.onEvent({
      eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: type as AgentEvent['type'],
      timestamp: Date.now(),
      agentId,
      taskId,
      payload,
    });
  }

  async healthCheck(): Promise<boolean> {
    if (this.mockMode) return true;
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: this.apiKey });
      // Quick model check — just verify the API key works
      await client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
