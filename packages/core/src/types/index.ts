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
  /** Token contract address (mint on Solana, contract on EVM) */
  tokenAddress?: string;
  /** Solana mint address */
  mint?: string;
  name: string;
  symbol: string;
  /** Chain identifier: 'solana' | 'ethereum' | 'base' | string */
  chain?: string;
  uri?: string;
  /** Normalized creator/deployer address */
  creatorAddress?: string;
  /** Backward-compat alias for creatorAddress (Solana) */
  traderPublicKey?: string;
  initialBuy?: number;
  marketCap?: number;
  marketCapSol?: number;
  /** Native currency symbol for marketCap (e.g. 'SOL', 'ETH') */
  nativeSymbol?: string;
  signature?: string;
  timestamp: number;
  /** Whether this token appears to be an AI agent launch */
  isAgent?: boolean;
  /** Which data source produced this token */
  source?: string;
  /** Arbitrary provider-specific metadata */
  meta?: Record<string, unknown>;
}

/** An on-chain trade event */
export interface Trade {
  tokenAddress?: string;
  /** Solana mint address */
  mint?: string;
  chain?: string;
  signature: string;
  /** Normalized trader address */
  traderAddress?: string;
  /** Backward-compat alias for traderAddress (Solana) */
  traderPublicKey?: string;
  txType: 'buy' | 'sell' | 'swap' | string;
  tokenAmount: number;
  /** Normalized native currency amount */
  nativeAmount?: number;
  /** Backward-compat alias for nativeAmount (Solana, in lamports) */
  solAmount?: number;
  nativeSymbol?: string;
  /** USD equivalent if available */
  usdAmount?: number;
  marketCap?: number;
  marketCapSol?: number;
  timestamp: number;
  name?: string;
  symbol?: string;
  /** Solana-specific bonding curve fields */
  newTokenBalance?: number;
  bondingCurveKey?: string;
  vTokensInBondingCurve?: number;
  vSolInBondingCurve?: number;
  /** Which data source produced this trade */
  source?: string;
  /** Arbitrary provider-specific metadata */
  meta?: Record<string, unknown>;
}

/** A token/entity ranked by activity — used as a hub node in the graph */
export interface TopToken {
  /** Solana mint address or EVM contract address */
  mint: string;
  /** Normalized alias for mint (multi-chain) */
  tokenAddress?: string;
  symbol: string;
  name: string;
  chain?: string;
  trades: number;
  /** Total volume in the chain's native currency */
  volumeSol: number;
  /** Normalized alias for volumeSol */
  volume?: number;
  nativeSymbol?: string;
  /** USD volume if available */
  volumeUsd?: number;
  /** Source provider that produced this entry */
  source?: string;
}

/** An edge between a participant and a hub (for graph visualization) */
export interface TraderEdge {
  trader: string;
  /** Solana mint address or EVM contract address */
  mint: string;
  /** Normalized alias for mint (multi-chain) */
  tokenAddress?: string;
  chain?: string;
  trades: number;
  /** Total volume in the chain's native currency */
  volumeSol: number;
  /** Normalized alias for volumeSol */
  volume?: number;
  /** Source provider that produced this edge */
  source?: string;
}

/** A claim event (e.g. fee claims, social claims) */
export interface Claim {
  signature: string;
  chain?: string;
  slot?: number;
  timestamp: number;
  claimType: string;
  programId: string;
  claimer?: string;
  /** Backward-compat alias for claimer (Solana wallet address) */
  wallet?: string;
  /** Solana token mint associated with the claim */
  mint?: string;
  isFirstClaim: boolean;
  logs?: string[];
  /** SOL amount claimed (Solana-specific) */
  solAmount?: number;
  /** Token amount associated with the claim */
  tokenAmount?: number;
  /** Arbitrary provider-specific metadata */
  meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

import type { AgentEvent } from './agent';

/** Raw event from a data source */
export type RawEvent =
  | { type: 'tokenCreate'; data: Token }
  | { type: 'trade'; data: Trade }
  | { type: 'claim'; data: Claim }
  | { type: 'custom'; data: Record<string, unknown> }
  | { type: 'agentEvent'; data: AgentEvent };

/**
 * Unified event with category and source assignment.
 * This is the canonical event type that all providers emit.
 */
export interface DataProviderEvent {
  id: string;
  /** Which provider emitted this */
  providerId?: string;
  /** Source identifier (backward-compat alias for providerId) */
  source?: string;
  /** Category within the source (e.g. 'launches', 'trades', 'swaps') */
  category: string;
  chain?: string;
  timestamp: number;
  label: string;
  amount?: number;
  /** Native currency symbol */
  nativeSymbol?: string;
  /** USD equivalent */
  amountUsd?: number;
  address: string;
  tokenAddress?: string;
  /** Solana mint address (backward-compat alias for tokenAddress) */
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
  chain?: string;
  hubTokenAddress?: string;
  /** Backward-compat alias for hubTokenAddress (Solana mint) */
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
  /** Total volume in SOL (Solana-native) */
  totalVolumeSol?: number;
  /** Total volume per chain: { solana: 123.4, ethereum: 56.7 } */
  totalVolume?: Record<string, number>;
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
  /** Capture the current 3D view as a PNG data URL via synchronous WebGL render */
  takeSnapshot: () => string | null;
}
