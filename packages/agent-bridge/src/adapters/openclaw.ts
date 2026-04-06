// ---------------------------------------------------------------------------
// OpenClaw adapter
//
// Connects to the OpenClaw agent framework (https://github.com/openclaw/openclaw)
// by either wrapping its CLI or reading piped JSONL output.
//
// OpenClaw emits structured events for tool calls, planning, and execution.
// This adapter maps those events to the Swarming AgentEvent format.
//
// Usage:
//   agent-bridge openclaw -- run task.yaml
//   openclaw run --json task.yaml | agent-bridge --stdin openclaw
// ---------------------------------------------------------------------------

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { AdapterOptions, BroadcastFn } from '../types.js';
import { makeEvent, categorizeToolCall, truncate, uid } from '../transform.js';

const AGENT_ID = 'openclaw-agent';

class OpenClawParser {
  private broadcast: BroadcastFn;
  private taskId: string;
  private spawned = false;
  private agentCounter = 0;
  private agentIdMap = new Map<string, string>(); // openclaw id → our id

  constructor(broadcast: BroadcastFn) {
    this.broadcast = broadcast;
    this.taskId = `task_${uid()}`;
  }

  /** Resolve or create an agent ID from OpenClaw's agent identifiers. */
  private resolveAgentId(rawId?: string): string {
    if (!rawId) return AGENT_ID;
    if (this.agentIdMap.has(rawId)) return this.agentIdMap.get(rawId)!;
    const id = `openclaw-${this.agentCounter++}`;
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
      // Heuristic: look for common text patterns in unstructured output
      if (/\b(calling|invoking|executing)\b.*\btool\b/i.test(trimmed)) {
        this.ensureSpawned();
        const toolMatch = trimmed.match(/tool[:\s]+(\w+)/i);
        if (toolMatch) {
          const callId = uid();
          this.broadcast(makeEvent('tool:started', AGENT_ID, {
            callId,
            toolName: toolMatch[1],
            toolCategory: categorizeToolCall(toolMatch[1]),
          }, { taskId: this.taskId, callId }));
        }
      } else if (trimmed.length > 0) {
        this.ensureSpawned();
        this.broadcast(makeEvent('reasoning:update', AGENT_ID, { text: truncate(trimmed, 200) }, { taskId: this.taskId }));
      }
      return;
    }

    this.ensureSpawned();

    const type = (data.type ?? data.event ?? data.kind) as string | undefined;
    const agentId = this.resolveAgentId(data.agent_id as string | undefined ?? data.agentId as string | undefined);

    // --- Agent/session lifecycle ---
    if (type === 'agent_spawn' || type === 'session_start' || type === 'start') {
      this.broadcast(makeEvent('agent:spawn', agentId, {
        name: (data.name ?? data.agent_name ?? 'OpenClaw Agent') as string,
        role: (data.role ?? 'agent') as string,
      }));
      this.broadcast(makeEvent('task:started', agentId, {
        taskId: this.taskId,
        description: (data.task ?? data.description ?? 'OpenClaw session') as string,
      }, { taskId: this.taskId }));
      return;
    }

    // --- Tool/function call ---
    if (type === 'tool_call' || type === 'function_call' || type === 'action') {
      const callId = (data.call_id ?? data.id ?? uid()) as string;
      const toolName = (data.tool ?? data.function ?? data.action ?? data.name ?? 'unknown') as string;
      this.broadcast(makeEvent('tool:started', agentId, {
        callId,
        toolName,
        toolCategory: categorizeToolCall(toolName),
        inputSummary: truncate(JSON.stringify(data.input ?? data.args ?? data.parameters ?? ''), 120),
      }, { taskId: this.taskId, callId }));
      return;
    }

    // --- Tool/function result ---
    if (type === 'tool_result' || type === 'function_result' || type === 'action_result') {
      const callId = (data.call_id ?? data.id ?? uid()) as string;
      const isError = data.is_error === true || data.status === 'error' || data.success === false;
      this.broadcast(makeEvent(isError ? 'tool:failed' : 'tool:completed', agentId, {
        callId,
        outputSummary: truncate((data.output ?? data.result ?? data.content ?? '') as string, 200),
      }, { taskId: this.taskId, callId }));
      return;
    }

    // --- Thinking/reasoning ---
    if (type === 'thinking' || type === 'reasoning' || type === 'plan' || type === 'thought') {
      this.broadcast(makeEvent('reasoning:update', agentId, {
        text: truncate((data.text ?? data.content ?? data.thought ?? '') as string, 200),
      }, { taskId: this.taskId }));
      return;
    }

    // --- Sub-agent ---
    if (type === 'delegate' || type === 'subagent_spawn' || type === 'spawn') {
      const subId = this.resolveAgentId((data.sub_agent_id ?? data.child_id ?? uid()) as string);
      this.broadcast(makeEvent('subagent:spawn', agentId, {
        subAgentId: subId,
        name: (data.sub_agent_name ?? data.name ?? 'Sub-agent') as string,
        role: (data.role ?? 'agent') as string,
      }, { taskId: this.taskId }));
      return;
    }

    // --- Task completion ---
    if (type === 'complete' || type === 'done' || type === 'result' || type === 'finish') {
      const isError = data.is_error === true || data.status === 'error' || data.success === false;
      this.broadcast(makeEvent(isError ? 'task:failed' : 'task:completed', agentId, {
        result: truncate((data.result ?? data.output ?? '') as string, 300),
        error: isError ? truncate((data.error ?? '') as string, 300) : undefined,
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

    // --- Fallback: emit as reasoning ---
    this.broadcast(makeEvent('reasoning:update', agentId, {
      text: truncate(JSON.stringify(data).slice(0, 200), 200),
    }, { taskId: this.taskId }));
  }

  private ensureSpawned(): void {
    if (this.spawned) return;
    this.spawned = true;
    this.broadcast(makeEvent('agent:spawn', AGENT_ID, {
      name: 'OpenClaw Agent',
      role: 'agent',
    }));
    this.broadcast(makeEvent('task:started', AGENT_ID, {
      taskId: this.taskId,
      description: 'OpenClaw session',
    }, { taskId: this.taskId }));
  }
}

// ---------------------------------------------------------------------------
// Adapter entry point
// ---------------------------------------------------------------------------

export async function openclawAdapter(options: AdapterOptions): Promise<void> {
  const parser = new OpenClawParser(options.broadcast);

  if (options.stdin) {
    const rl = createInterface({ input: process.stdin });
    for await (const line of rl) {
      parser.processLine(line);
    }
    return;
  }

  // Spawn openclaw CLI
  const cliArgs = options.args.length > 0 ? options.args : ['run', '--json'];

  console.error(`[bridge] Spawning: openclaw ${cliArgs.join(' ')}`);

  const child = spawn('openclaw', cliArgs, {
    stdio: ['inherit', 'pipe', 'inherit'],
    env: { ...process.env },
  });

  const rl = createInterface({ input: child.stdout! });
  for await (const line of rl) {
    parser.processLine(line);
  }

  return new Promise<void>((resolve, reject) => {
    child.on('close', (code) => {
      if (code !== 0) console.error(`[bridge] OpenClaw exited with code ${code}`);
      resolve();
    });
    child.on('error', (err) => {
      console.error(`[bridge] Failed to spawn openclaw: ${err.message}`);
      console.error('[bridge] Make sure OpenClaw is installed: https://github.com/openclaw/openclaw');
      reject(err);
    });
  });
}
