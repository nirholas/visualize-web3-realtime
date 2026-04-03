import type { CategoryConfig } from '@web3viz/core';

/** Agent-specific category configs used by the meta-provider */
export const AGENT_CATEGORIES: CategoryConfig[] = [
  { id: 'agentDeploys', label: 'Agent Deploys', icon: '\u2B23', color: '#E040FB', sourceId: 'agents' },
  { id: 'agentInteractions', label: 'Agent Actions', icon: '\u26A1', color: '#AA00FF', sourceId: 'agents' },
];
