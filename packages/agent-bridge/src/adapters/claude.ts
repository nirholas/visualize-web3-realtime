// ---------------------------------------------------------------------------
// Claude Code adapter
//
// Reads Claude Code's `--output-format stream-json` JSONL output and maps
// each event to the AgentEvent format consumed by the /agents visualization.
//
// Usage:
//   agent-bridge claude -- -p "refactor the auth module"
//   claude -p --output-format stream-json "fix tests" | agent-bridge --stdin claude
// ---------------------------------------------------------------------------

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { AdapterOptions, AgentEvent, BroadcastFn } from '../types.js';
import { makeEvent, categorizeToolCall, summarizeInput, truncate, uid } from '../transform.js';

const AGENT_ID = 'claude-code';

/** Track in-flight tool calls so we can correlate start/complete. */
interface ToolCallState {
  callId: string;
  toolName: string;
  taskId: string;
  startedAt: number;
}

class ClaudeParser {
  private broadcast: BroadcastFn;
  private taskId: string;
  private spawned = false;
  private toolCalls = new Map<string, ToolCallState>();
  private turnIndex = 0;

  constructor(broadcast: BroadcastFn) {
    this.broadcast = broadcast;
    this.taskId = `task_${uid()}`;
  }

  /** Process a single JSONL line from Claude's output. */
  processLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(trimmed);
    } catch {
      // Raw text output — treat as reasoning
      if (trimmed.length > 0) {
        this.ensureSpawned();
        this.broadcast(makeEvent('reasoning:update', AGENT_ID, { text: trimmed }, { taskId: this.taskId }));
      }
      return;
    }

    this.ensureSpawned();

    const type = data.type as string | undefined;

    // --- System / init event ---
    if (type === 'system' || type === 'init') {
      // Session config — already spawned, nothing extra needed
      return;
    }

    // --- Message start (Anthropic streaming format) ---
    if (type === 'message_start') {
      this.turnIndex++;
      return;
    }

    // --- Content block start (streaming format) ---
    if (type === 'content_block_start') {
      const block = data.content_block as Record<string, unknown> | undefined;
      if (!block) return;

      if (block.type === 'tool_use') {
        const callId = (block.id as string) || uid();
        const toolName = (block.name as string) || 'unknown';
        const state: ToolCallState = { callId, toolName, taskId: this.taskId, startedAt: Date.now() };
        this.toolCalls.set(callId, state);
        this.broadcast(makeEvent('tool:started', AGENT_ID, {
          callId,
          toolName,
          toolCategory: categorizeToolCall(toolName),
          inputSummary: summarizeInput(block.input),
        }, { taskId: this.taskId, callId }));
      }
      if (block.type === 'thinking') {
        this.broadcast(makeEvent('reasoning:start', AGENT_ID, {}, { taskId: this.taskId }));
      }
      return;
    }

    // --- Content block delta (streaming text/thinking/input) ---
    if (type === 'content_block_delta') {
      const delta = data.delta as Record<string, unknown> | undefined;
      if (!delta) return;
      if (delta.type === 'thinking_delta') {
        this.broadcast(makeEvent('reasoning:update', AGENT_ID, {
          text: truncate(delta.thinking as string, 200),
        }, { taskId: this.taskId }));
      }
      if (delta.type === 'text_delta') {
        this.broadcast(makeEvent('reasoning:update', AGENT_ID, {
          text: truncate(delta.text as string, 200),
        }, { taskId: this.taskId }));
      }
      return;
    }

    // --- Content block stop ---
    if (type === 'content_block_stop') {
      return; // Handled via tool result events
    }

    // --- Message delta (stop reason changes) ---
    if (type === 'message_delta') {
      return;
    }

    // --- Message stop ---
    if (type === 'message_stop') {
      return;
    }

    // --- Full assistant message (non-streaming format) ---
    if (type === 'assistant') {
      const message = data.message as Record<string, unknown> | undefined;
      const content = (message?.content ?? data.content) as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(content)) return;

      for (const block of content) {
        if (block.type === 'tool_use') {
          const callId = (block.id as string) || uid();
          const toolName = (block.name as string) || 'unknown';
          this.toolCalls.set(callId, { callId, toolName, taskId: this.taskId, startedAt: Date.now() });
          this.broadcast(makeEvent('tool:started', AGENT_ID, {
            callId,
            toolName,
            toolCategory: categorizeToolCall(toolName),
            inputSummary: summarizeInput(block.input),
          }, { taskId: this.taskId, callId }));
        }
        if (block.type === 'thinking') {
          this.broadcast(makeEvent('reasoning:update', AGENT_ID, {
            text: truncate(block.thinking as string, 200),
          }, { taskId: this.taskId }));
        }
        if (block.type === 'text') {
          this.broadcast(makeEvent('reasoning:update', AGENT_ID, {
            text: truncate(block.text as string, 200),
          }, { taskId: this.taskId }));
        }
      }
      return;
    }

    // --- Tool result ---
    if (type === 'tool' || type === 'tool_result') {
      const toolUseId = (data.tool_use_id ?? data.id) as string | undefined;
      const content = data.content as Array<Record<string, unknown>> | string | undefined;
      const isError = data.is_error === true;

      // Try to match to a tracked tool call
      let callId = toolUseId;
      let toolName = 'unknown';
      if (callId && this.toolCalls.has(callId)) {
        toolName = this.toolCalls.get(callId)!.toolName;
        this.toolCalls.delete(callId);
      } else {
        callId = uid();
      }

      const outputSummary = typeof content === 'string'
        ? truncate(content, 200)
        : Array.isArray(content)
          ? truncate(content.map((c) => String(c.text ?? c.content ?? '')).join(' '), 200)
          : undefined;

      this.broadcast(makeEvent(isError ? 'tool:failed' : 'tool:completed', AGENT_ID, {
        callId,
        toolName,
        toolCategory: categorizeToolCall(toolName),
        outputSummary,
      }, { taskId: this.taskId, callId }));
      return;
    }

    // --- Final result ---
    if (type === 'result') {
      const isError = data.is_error === true || data.subtype === 'error';
      this.broadcast(makeEvent(
        isError ? 'task:failed' : 'task:completed',
        AGENT_ID,
        {
          result: truncate(data.result as string, 300),
          error: isError ? truncate((data.error ?? data.result) as string, 300) : undefined,
          costUsd: data.cost_usd,
          durationMs: data.duration_ms,
          numTurns: data.num_turns,
        },
        { taskId: this.taskId },
      ));

      // Close any remaining open tool calls
      for (const [id, state] of this.toolCalls) {
        this.broadcast(makeEvent('tool:completed', AGENT_ID, {
          callId: id,
          toolName: state.toolName,
        }, { taskId: this.taskId, callId: id }));
      }
      this.toolCalls.clear();
      return;
    }

    // --- Error event ---
    if (type === 'error') {
      const errMsg = (data.error as Record<string, unknown>)?.message ?? data.message ?? 'Unknown error';
      this.broadcast(makeEvent('error', AGENT_ID, { error: String(errMsg) }, { taskId: this.taskId }));
      return;
    }
  }

  private ensureSpawned(): void {
    if (this.spawned) return;
    this.spawned = true;
    this.broadcast(makeEvent('agent:spawn', AGENT_ID, {
      name: 'Claude Code',
      role: 'coder',
    }));
    this.broadcast(makeEvent('task:started', AGENT_ID, {
      taskId: this.taskId,
      description: 'Claude Code session',
    }, { taskId: this.taskId }));
  }
}

// ---------------------------------------------------------------------------
// Adapter entry point
// ---------------------------------------------------------------------------

export async function claudeAdapter(options: AdapterOptions): Promise<void> {
  const parser = new ClaudeParser(options.broadcast);

  if (options.stdin) {
    // Read from stdin (piped output from `claude --output-format stream-json`)
    const rl = createInterface({ input: process.stdin });
    for await (const line of rl) {
      parser.processLine(line);
    }
    return;
  }

  // Spawn claude CLI with stream-json output
  const cliArgs = options.args.length > 0
    ? options.args
    : ['-p', '--output-format', 'stream-json', 'What files are in this project?'];

  // Ensure stream-json format is requested
  const hasFormat = cliArgs.some((a) => a === '--output-format');
  const finalArgs = hasFormat ? cliArgs : ['-p', '--output-format', 'stream-json', ...cliArgs];

  console.error(`[bridge] Spawning: claude ${finalArgs.join(' ')}`);

  const child = spawn('claude', finalArgs, {
    stdio: ['inherit', 'pipe', 'inherit'],
    env: { ...process.env },
  });

  const rl = createInterface({ input: child.stdout! });
  for await (const line of rl) {
    parser.processLine(line);
  }

  return new Promise<void>((resolve, reject) => {
    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`[bridge] Claude exited with code ${code}`);
      }
      resolve();
    });
    child.on('error', (err) => {
      console.error(`[bridge] Failed to spawn claude: ${err.message}`);
      console.error('[bridge] Make sure the Claude CLI is installed: https://docs.anthropic.com/en/docs/claude-code');
      reject(err);
    });
  });
}
