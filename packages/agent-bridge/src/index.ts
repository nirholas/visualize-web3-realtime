export { BridgeServer } from './server.js';
export { claudeAdapter } from './adapters/claude.js';
export { openclawAdapter } from './adapters/openclaw.js';
export { hermesAdapter } from './adapters/hermes.js';
export { genericAdapter } from './adapters/generic.js';
export { makeEvent, categorizeToolCall } from './transform.js';
export type { AgentEvent, AgentEventType, ToolCategory, AdapterFn, AdapterOptions, BroadcastFn } from './types.js';
