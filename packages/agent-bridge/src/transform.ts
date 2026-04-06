import { randomUUID } from 'node:crypto';
import type { AgentEvent, AgentEventType, ToolCategory } from './types.js';

/** Generate a unique event ID. */
export function uid(): string {
  return randomUUID();
}

/** Classify a tool name into one of our visual categories. */
export function categorizeToolCall(toolName: string): ToolCategory {
  const n = toolName.toLowerCase();
  if (/read_file|write_file|create_file|edit_file|list_dir|file_search|replace_string|multi_replace|view_image/.test(n)) return 'filesystem';
  if (/search|grep|semantic|find|rg|ripgrep/.test(n)) return 'search';
  if (/terminal|shell|exec|run_in_terminal|command|bash|sh\b/.test(n)) return 'terminal';
  if (/fetch|curl|http|api|web|browser|url|download|request/.test(n)) return 'network';
  if (/think|reason|plan|reflect|chain.of.thought/.test(n)) return 'reasoning';
  return 'code';
}

/** Truncate long strings for summaries. */
export function truncate(s: string | undefined, max = 120): string | undefined {
  if (!s) return undefined;
  return s.length > max ? s.slice(0, max) + '…' : s;
}

/** Create a well-formed AgentEvent. */
export function makeEvent(
  type: AgentEventType,
  agentId: string,
  payload: Record<string, unknown> = {},
  extra?: { taskId?: string; callId?: string },
): AgentEvent {
  return {
    eventId: uid(),
    type,
    timestamp: Date.now(),
    agentId,
    taskId: extra?.taskId,
    callId: extra?.callId,
    payload,
  };
}

/** Summarize a JSON input object into a short string. */
export function summarizeInput(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const obj = input as Record<string, unknown>;
  // Common Claude tool input patterns
  const filePath = obj.file_path ?? obj.filePath ?? obj.path;
  if (filePath) return truncate(String(filePath));
  const command = obj.command;
  if (command) return truncate(String(command));
  const query = obj.query ?? obj.pattern ?? obj.search;
  if (query) return truncate(String(query));
  // Fallback: first key=value
  const keys = Object.keys(obj).slice(0, 2);
  return truncate(keys.map((k) => `${k}=${JSON.stringify(obj[k])}`).join(', '));
}
