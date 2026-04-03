import type { DataProviderEvent } from '@web3viz/core';

const AGENT_KEYWORDS =
  /\b(agent|ai\b|gpt|bot|auto|llm|claude|openai|chatgpt|neural|sentient|autonomous|virtuals|eliza|ai16z|degenai|smart\s*agent|olas|fetch\.ai|singularity|ocean\s*protocol)\b/i;

const KNOWN_AGENT_ADDRESSES = new Set<string>();

/** Check if a DataProviderEvent looks like agent activity */
export function isAgentEvent(event: DataProviderEvent): boolean {
  if (AGENT_KEYWORDS.test(event.label)) return true;

  if (event.address && KNOWN_AGENT_ADDRESSES.has(event.address)) return true;

  if (event.meta) {
    const metaStr = JSON.stringify(event.meta);
    if (AGENT_KEYWORDS.test(metaStr)) return true;
  }

  return false;
}

/** Check if a token name/symbol indicates an AI agent */
export function isAgentToken(name: string, symbol: string): boolean {
  return AGENT_KEYWORDS.test(name) || AGENT_KEYWORDS.test(symbol);
}

/** Register a known agent address for future detection */
export function registerAgentAddress(address: string): void {
  KNOWN_AGENT_ADDRESSES.add(address);
}
