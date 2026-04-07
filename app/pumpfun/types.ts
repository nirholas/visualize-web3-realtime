export interface PumpNode {
  id: string;
  type: 'token' | 'trade' | 'hub' | 'central';
  timestamp: number;
  // Optional token properties
  ticker?: string;
  name?: string;
  mint?: string;
  creator?: string;
  marketCapSol?: number;
  signature?: string;
  // Optional trade properties
  isBuy?: boolean;
  solAmount?: number;
  // Hub / central label
  label?: string;
  // Hub category (used to route trades)
  category?: HubCategory;

  // D3 internal properties (injected at runtime by force-graph)
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

/** Categories for the pre-populated hub nodes */
export type HubCategory =
  | 'buys'
  | 'sells'
  | 'creates'
  | 'whales';

export interface PumpLink {
  source: string | PumpNode;
  target: string | PumpNode;
}

export interface GraphData {
  nodes: PumpNode[];
  links: PumpLink[];
}

/** @deprecated Use GraphData — kept for backward compatibility */
export type PumpGraphData = GraphData;

// ---------------------------------------------------------------------------
// Hub definitions — always present on the graph
// ---------------------------------------------------------------------------

export const HUB_CENTRAL_ID = 'hub:pumpfun';

export interface HubDef {
  id: string;
  category: HubCategory;
  label: string;
}

export const HUB_NODES: HubDef[] = [
  { id: 'hub:buys', category: 'buys', label: 'BUYS' },
  { id: 'hub:sells', category: 'sells', label: 'SELLS' },
  { id: 'hub:creates', category: 'creates', label: 'COIN CREATIONS' },
  { id: 'hub:whales', category: 'whales', label: 'WHALES >1 SOL' },
];

/** Set of all hub IDs (including central) for fast lookup */
export const HUB_IDS = new Set([HUB_CENTRAL_ID, ...HUB_NODES.map((h) => h.id)]);
