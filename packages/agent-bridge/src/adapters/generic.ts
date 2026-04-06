// ---------------------------------------------------------------------------
// Generic stdin adapter
//
// Reads JSONL from stdin and broadcasts events. Accepts either:
//   1) Full AgentEvent objects (pass-through)
//   2) Simplified objects that get auto-mapped:
//      {"tool": "read_file", "input": {"path": "foo.ts"}}
//      {"thinking": "Let me analyze..."}
//      {"result": "Done!", "success": true}
//      {"error": "Something broke"}
//
// Usage:
//   my-agent --json | agent-bridge --stdin generic
//   cat events.jsonl | agent-bridge --stdin generic
// ---------------------------------------------------------------------------

import { createInterface } from 'node:readline';
import type { AdapterOptions, BroadcastFn } from '../types.js';
import { makeEvent, categorizeToolCall, truncate, uid } from '../transform.js';

const AGENT_ID = 'generic-agent';

class GenericParser {
  private broadcast: BroadcastFn;
  private taskId: string;
  private spawned = false;

  constructor(broadcast: BroadcastFn) {
    this.broadcast = broadcast;
    this.taskId = `task_${uid()}`;
  }

  processLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(trimmed);
    } catch {
      if (trimmed.length > 0) {
        this.ensureSpawned();
        this.broadcast(makeEvent('reasoning:update', AGENT_ID, { text: truncate(trimmed, 200) }, { taskId: this.taskId }));
      }
      return;
    }

    this.ensureSpawned();

    // --- Pass-through: full AgentEvent with `eventId` and `type` ---
    if (data.eventId && data.type && data.agentId) {
      if (!data.timestamp) data.timestamp = Date.now();
      this.broadcast(data as import('../types.js').AgentEvent);
      return;
    }

    // --- Simplified format: tool call ---
    if (data.tool || data.function || data.tool_call) {
      const toolName = (data.tool ?? data.function ?? data.tool_call) as string;
      const callId = (data.id ?? uid()) as string;
      this.broadcast(makeEvent('tool:started', AGENT_ID, {
        callId,
        toolName,
        toolCategory: categorizeToolCall(toolName),
        inputSummary: truncate(JSON.stringify(data.input ?? data.args ?? ''), 120),
      }, { taskId: this.taskId, callId }));

      // If there's also a result inline, emit completion
      if (data.output !== undefined || data.result !== undefined) {
        this.broadcast(makeEvent('tool:completed', AGENT_ID, {
          callId,
          toolName,
          outputSummary: truncate(String(data.output ?? data.result ?? ''), 200),
        }, { taskId: this.taskId, callId }));
      }
      return;
    }

    // --- Simplified: thinking/reasoning ---
    if (data.thinking || data.reasoning || data.thought) {
      this.broadcast(makeEvent('reasoning:update', AGENT_ID, {
        text: truncate((data.thinking ?? data.reasoning ?? data.thought) as string, 200),
      }, { taskId: this.taskId }));
      return;
    }

    // --- Simplified: result ---
    if (data.result !== undefined && !data.tool) {
      const isError = data.success === false || data.is_error === true;
      this.broadcast(makeEvent(isError ? 'task:failed' : 'task:completed', AGENT_ID, {
        result: truncate(String(data.result), 300),
      }, { taskId: this.taskId }));
      return;
    }

    // --- Simplified: error ---
    if (data.error) {
      this.broadcast(makeEvent('error', AGENT_ID, {
        error: String(data.error),
      }, { taskId: this.taskId }));
      return;
    }

    // --- Fallback ---
    this.broadcast(makeEvent('reasoning:update', AGENT_ID, {
      text: truncate(JSON.stringify(data), 200),
    }, { taskId: this.taskId }));
  }

  private ensureSpawned(): void {
    if (this.spawned) return;
    this.spawned = true;
    this.broadcast(makeEvent('agent:spawn', AGENT_ID, {
      name: 'Agent',
      role: 'agent',
    }));
    this.broadcast(makeEvent('task:started', AGENT_ID, {
      taskId: this.taskId,
      description: 'Agent session',
    }, { taskId: this.taskId }));
  }
}

// ---------------------------------------------------------------------------
// Adapter entry point (stdin-only)
// ---------------------------------------------------------------------------

export async function genericAdapter(options: AdapterOptions): Promise<void> {
  const parser = new GenericParser(options.broadcast);
  const rl = createInterface({ input: process.stdin });
  for await (const line of rl) {
    parser.processLine(line);
  }
}
