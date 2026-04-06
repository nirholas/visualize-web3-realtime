// ---------------------------------------------------------------------------
// Hermes agent adapter
//
// Connects to Hermes (https://github.com/nousresearch/hermes-agent) by
// wrapping its CLI or reading piped JSONL output.
//
// Usage:
//   agent-bridge hermes -- --task "research quantum computing"
//   hermes run --json "topic" | agent-bridge --stdin hermes
// ---------------------------------------------------------------------------

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { AdapterOptions, BroadcastFn } from '../types.js';
import { makeEvent, categorizeToolCall, truncate, uid } from '../transform.js';

const AGENT_ID = 'hermes-agent';

class HermesParser {
  private broadcast: BroadcastFn;
  private taskId: string;
  private spawned = false;
  private agentCounter = 0;
  private agentIdMap = new Map<string, string>();

  constructor(broadcast: BroadcastFn) {
    this.broadcast = broadcast;
    this.taskId = `task_${uid()}`;
  }

  private resolveAgentId(rawId?: string): string {
    if (!rawId) return AGENT_ID;
    if (this.agentIdMap.has(rawId)) return this.agentIdMap.get(rawId)!;
    const id = `hermes-${this.agentCounter++}`;
    this.agentIdMap.set(rawId, id);
    return id;
  }

  processLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(trimmed);
    } catch {
      // Heuristic: look for common Hermes text patterns
      if (/\bfunction_call\b|\btool_call\b/i.test(trimmed)) {
        this.ensureSpawned();
        const toolMatch = trimmed.match(/(?:function|tool)_?call[:\s]+["']?(\w+)/i);
        if (toolMatch) {
          const callId = uid();
          this.broadcast(makeEvent('tool:started', AGENT_ID, {
            callId,
            toolName: toolMatch[1],
            toolCategory: categorizeToolCall(toolMatch[1]),
          }, { taskId: this.taskId, callId }));
        }
      } else if (/^<\|.*\|>/.test(trimmed)) {
        // Hermes special tokens — treat as reasoning
        this.ensureSpawned();
        this.broadcast(makeEvent('reasoning:update', AGENT_ID, { text: truncate(trimmed, 200) }, { taskId: this.taskId }));
      } else if (trimmed.length > 0) {
        this.ensureSpawned();
        this.broadcast(makeEvent('reasoning:update', AGENT_ID, { text: truncate(trimmed, 200) }, { taskId: this.taskId }));
      }
      return;
    }

    this.ensureSpawned();

    const type = (data.type ?? data.event ?? data.kind) as string | undefined;
    const agentId = this.resolveAgentId(data.agent_id as string | undefined);

    // --- Agent lifecycle ---
    if (type === 'agent_start' || type === 'session_start' || type === 'init') {
      this.broadcast(makeEvent('agent:spawn', agentId, {
        name: (data.name ?? data.model ?? 'Hermes Agent') as string,
        role: (data.role ?? 'researcher') as string,
      }));
      this.broadcast(makeEvent('task:started', agentId, {
        taskId: this.taskId,
        description: (data.task ?? data.prompt ?? 'Hermes session') as string,
      }, { taskId: this.taskId }));
      return;
    }

    // --- Tool / function calls (Hermes uses OpenAI-style function calling) ---
    if (type === 'function_call' || type === 'tool_call' || type === 'tool_use') {
      const callId = (data.call_id ?? data.id ?? uid()) as string;
      const toolName = (data.function ?? data.name ?? data.tool ?? 'unknown') as string;
      const args = data.arguments ?? data.input ?? data.parameters;
      this.broadcast(makeEvent('tool:started', agentId, {
        callId,
        toolName,
        toolCategory: categorizeToolCall(toolName),
        inputSummary: truncate(typeof args === 'string' ? args : JSON.stringify(args ?? ''), 120),
      }, { taskId: this.taskId, callId }));
      return;
    }

    // --- Tool / function result ---
    if (type === 'function_result' || type === 'tool_result' || type === 'observation') {
      const callId = (data.call_id ?? data.id ?? uid()) as string;
      const isError = data.is_error === true || data.status === 'error';
      this.broadcast(makeEvent(isError ? 'tool:failed' : 'tool:completed', agentId, {
        callId,
        outputSummary: truncate((data.output ?? data.result ?? data.content ?? '') as string, 200),
      }, { taskId: this.taskId, callId }));
      return;
    }

    // --- Thinking / chain-of-thought ---
    if (type === 'thinking' || type === 'reasoning' || type === 'cot' || type === 'thought') {
      this.broadcast(makeEvent('reasoning:update', agentId, {
        text: truncate((data.text ?? data.content ?? data.thought ?? '') as string, 200),
      }, { taskId: this.taskId }));
      return;
    }

    // --- Response text ---
    if (type === 'response' || type === 'assistant' || type === 'message') {
      this.broadcast(makeEvent('reasoning:update', agentId, {
        text: truncate((data.content ?? data.text ?? data.message ?? '') as string, 200),
      }, { taskId: this.taskId }));
      return;
    }

    // --- Completion ---
    if (type === 'complete' || type === 'done' || type === 'result' || type === 'finish') {
      const isError = data.is_error === true || data.success === false;
      this.broadcast(makeEvent(isError ? 'task:failed' : 'task:completed', agentId, {
        result: truncate((data.result ?? data.output ?? '') as string, 300),
      }, { taskId: this.taskId }));
      return;
    }

    // --- Error ---
    if (type === 'error') {
      this.broadcast(makeEvent('error', agentId, {
        error: (data.message ?? data.error ?? 'Unknown error') as string,
      }, { taskId: this.taskId }));
      return;
    }

    // --- Fallback ---
    this.broadcast(makeEvent('reasoning:update', agentId, {
      text: truncate(JSON.stringify(data).slice(0, 200), 200),
    }, { taskId: this.taskId }));
  }

  private ensureSpawned(): void {
    if (this.spawned) return;
    this.spawned = true;
    this.broadcast(makeEvent('agent:spawn', AGENT_ID, {
      name: 'Hermes Agent',
      role: 'researcher',
    }));
    this.broadcast(makeEvent('task:started', AGENT_ID, {
      taskId: this.taskId,
      description: 'Hermes session',
    }, { taskId: this.taskId }));
  }
}

// ---------------------------------------------------------------------------
// Adapter entry point
// ---------------------------------------------------------------------------

export async function hermesAdapter(options: AdapterOptions): Promise<void> {
  const parser = new HermesParser(options.broadcast);

  if (options.stdin) {
    const rl = createInterface({ input: process.stdin });
    for await (const line of rl) {
      parser.processLine(line);
    }
    return;
  }

  // Spawn hermes CLI
  const cliArgs = options.args.length > 0 ? options.args : ['run'];

  console.error(`[bridge] Spawning: hermes ${cliArgs.join(' ')}`);

  const child = spawn('hermes', cliArgs, {
    stdio: ['inherit', 'pipe', 'inherit'],
    env: { ...process.env },
  });

  const rl = createInterface({ input: child.stdout! });
  for await (const line of rl) {
    parser.processLine(line);
  }

  return new Promise<void>((resolve, reject) => {
    child.on('close', (code) => {
      if (code !== 0) console.error(`[bridge] Hermes exited with code ${code}`);
      resolve();
    });
    child.on('error', (err) => {
      console.error(`[bridge] Failed to spawn hermes: ${err.message}`);
      console.error('[bridge] Make sure Hermes is installed: https://github.com/nousresearch/hermes-agent');
      reject(err);
    });
  });
}
