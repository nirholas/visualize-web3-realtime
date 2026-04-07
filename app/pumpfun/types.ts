export interface PumpNode {
  id: string;
  type: 'token' | 'trade';
  timestamp: number;
  // Optional token properties
  ticker?: string;
  // Optional trade properties
  isBuy?: boolean;
  solAmount?: number;
  
  // D3 internal properties (injected at runtime by force-graph)
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

export interface PumpLink {
  source: string | PumpNode;
  target: string | PumpNode;
}

export interface GraphData {
  nodes: PumpNode[];
  links: PumpLink[];
}
