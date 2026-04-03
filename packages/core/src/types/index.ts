// ============================================================================
// @web3viz/core — Types
//
// All shared type definitions for the Web3 visualization SDK.
// These types are framework-agnostic and can be used with any renderer.
// ============================================================================

// ---------------------------------------------------------------------------
// Source identification
// ---------------------------------------------------------------------------

/**
 * Every data source (provider) is identified by a source ID.
 * Built-in sources are typed here; plugins add their own string IDs.
 */
export type BuiltInSource =
  | 'pumpfun'
  | 'ethereum'
  | 'base'
  | 'agents'
  | 'erc8004'
  | 'cex';

// ---------------------------------------------------------------------------
// Token & Trade types
// ---------------------------------------------------------------------------

/** A token on-chain (e.g. from PumpFun, Uniswap, etc.) */
export interface Token {
  mint: string;
  name: string;
  symbol: string;
  uri?: string;
  traderPublicKey: string;
  initialBuy?: number;
  marketCapSol?: number;
  signature?: string;
  timestamp: number;
  /** Whether this token appears to be an AI agent launch */
  isAgent?: boolean;
  /** Which data source produced this token */
  source?: string;
}

/** An on-chain trade event */
export interface Trade {
  mint: string;
  signature: string;
  traderPublicKey: string;
  txType: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;
  newTokenBalance?: number;
  bondingCurveKey?: string;
  vTokensInBondingCurve?: number;
  vSolInBondingCurve?: number;
  marketCapSol?: number;
  timestamp: number;
  name?: string;
  symbol?: string;
  /** Which data source produced this trade */
  source?: string;
}

/** A token/entity ranked by activity — used as a hub node in the graph */
export interface TopToken {
  mint: string;
  symbol: string;
  name: string;
  trades: number;
  volumeSol: number;
  /** Source provider that produced this entry */
  source?: string;
}

/** An edge between a participant and a hub (for graph visualization) */
export interface TraderEdge {
  trader: string;
  mint: string;
  trades: number;
  volumeSol: number;
  /** Source provider that produced this edge */
  source?: string;
}

/** A claim event (e.g. fee claims, social claims) */
export interface Claim {
  signature: string;
  slot?: number;
  timestamp: number;
  claimType: 'wallet' | 'github' | string;
  programId: string;
  claimer: string;
  isFirstClaim: boolean;
  logs?: string[];
}

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

/** Raw event from a data source */
export type RawEvent =
  | { type: 'tokenCreate'; data: Token }
  | { type: 'trade'; data: Trade }
  | { type: 'claim'; data: Claim };

/**
 * Unified event with category and source assignment.
 * This is the canonical event type that all providers emit.
 */
export interface DataProviderEvent {
  id: string;
  /** Category within the source (e.g. 'launches', 'trades', 'swaps') */
  category: string;
  /** Source provider ID (e.g. 'pumpfun', 'ethereum', 'base') */
  source: string;
  timestamp: number;
  label: string;
  amount?: number;
  address: string;
  mint?: string;
  meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Graph types (for the force-directed visualization)
// ---------------------------------------------------------------------------

export interface GraphNode {
  id: string;
  type: 'hub' | 'agent';
  label: string;
  radius: number;
  color: string;
  hubMint?: string;
  /** Source provider that owns this node */
  source?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  source: string | GraphNode;
  target: string | GraphNode;
}

// ---------------------------------------------------------------------------
// Stats & aggregation types
// ---------------------------------------------------------------------------

/** Aggregate stats from a single data provider */
export interface DataProviderStats {
  counts: Record<string, number>;
  totalVolumeSol: number;
  totalTransactions: number;
  totalAgents: number;
  recentEvents: DataProviderEvent[];
  topTokens: TopToken[];
  traderEdges: TraderEdge[];
  rawEvents: RawEvent[];
}

/** Merged stats from all active providers */
export interface MergedStats extends DataProviderStats {
  /** Per-source breakdown of stats */
  bySource: Record<string, DataProviderStats>;
}

// ---------------------------------------------------------------------------
// Share / theming types
// ---------------------------------------------------------------------------

/** Colors for share/screenshot customization */
export interface ShareColors {
  background: string;
  protocol: string;
  user: string;
}

/** Embed widget configuration */
export interface EmbedConfig {
  bg: string;
  width: number;
  height: number;
  title: string;
}

// ---------------------------------------------------------------------------
// Camera / 3D types
// ---------------------------------------------------------------------------

export type Vec3 = [number, number, number];

export interface CameraAnimationRequest {
  position: Vec3;
  lookAt?: Vec3;
  durationMs?: number;
}

/** Imperative API exposed by graph renderers */
export interface GraphHandle {
  animateCameraTo: (request: CameraAnimationRequest) => Promise<void>;
  focusHub: (index: number, durationMs?: number) => Promise<void>;
  getCanvasElement: () => HTMLCanvasElement | null;
  getHubCount: () => number;
  setOrbitEnabled: (enabled: boolean) => void;
}
