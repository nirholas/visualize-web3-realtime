// ============================================================================
// PumpFun Graph Types
//
// Strict interfaces for the force-directed graph visualization.
// Nodes represent either token launches or individual trades.
// Links connect trades to the token they traded on.
// ============================================================================

/** A node in the PumpFun force graph */
export interface PumpNode {
  /** Unique identifier — token mint address or generated trade ID */
  id: string;
  /** Discriminator: 'token' for launches, 'trade' for buy/sell events */
  type: 'token' | 'trade';
  /** Token ticker symbol (present only on token nodes) */
  ticker?: string;
  /** Whether the trade was a buy (present only on trade nodes) */
  isBuy?: boolean;
  /** Trade size in SOL (present only on trade nodes) */
  solAmount?: number;
  /** Unix ms timestamp — used for garbage-collecting stale nodes */
  timestamp: number;
}

/** A directed edge from a trade node to its token node */
export interface PumpLink {
  /** Trade node ID (source of the edge) */
  source: string;
  /** Token node ID (target of the edge) */
  target: string;
}

/** The complete graph state consumed by the force-graph renderer */
export interface PumpGraphData {
  nodes: PumpNode[];
  links: PumpLink[];
}
