/**
 * Solana WebSocket RPC endpoint.
 * Replace with your own RPC provider for higher rate limits (e.g. Helius, QuickNode).
 */
export const SOLANA_WS_URL = "wss://api.mainnet-beta.solana.com";

/**
 * Known DEX program IDs on Solana.
 * The WebSocket subscription filters logs that mention these programs.
 */
export const DEX_PROGRAMS = {
  /** Raydium AMM V4 */
  RAYDIUM: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  /** Jupiter Aggregator V6 */
  JUPITER: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
} as const;

/** Maximum number of token nodes displayed in the graph */
export const MAX_NODES = 200;

/** Maximum number of swap edges displayed in the graph */
export const MAX_EDGES = 500;

/** Interval (ms) for generating demo swap events when in fallback mode */
export const DEMO_INTERVAL_MS = 1000;
