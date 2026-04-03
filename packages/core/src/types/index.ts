// ============================================================================
// @web3viz/core — Types
//
// All shared type definitions for the Web3 visualization SDK.
// These types are framework-agnostic and can be used with any renderer.
// ============================================================================

// ---------------------------------------------------------------------------
// Token & Trade types
// ---------------------------------------------------------------------------

/** A token on-chain (e.g. from PumpFun) */
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
}

/** A token ranked by trading activity */
export interface TopToken {
  mint: string;
  symbol: string;
  name: string;
  trades: number;
  volumeSol: number;
}

/** An edge between a trader wallet and a token (for graph visualization) */
export interface TraderEdge {
  trader: string;
  mint: string;
  trades: number;
  volumeSol: number;
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

/** Unified event with category assignment */
export interface DataProviderEvent {
  id: string;
  category: string;
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

/** Aggregate stats from a data provider */
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
