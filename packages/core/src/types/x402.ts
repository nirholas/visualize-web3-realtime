// ============================================================================
// X402 Payment Protocol — Type Definitions
//
// Types for the x402 (https://x402.org) payment protocol, used to gate
// premium features behind on-chain USDC micropayments on Base.
// ============================================================================

// ---------------------------------------------------------------------------
// Network & Asset
// ---------------------------------------------------------------------------

export type X402Network = 'base-sepolia' | 'base-mainnet';
export type X402Asset = 'USDC';

export interface X402NetworkConfig {
  network: X402Network;
  chainId: number;
  rpcUrl: string;
  /** USDC contract address on this network */
  usdcAddress: string;
  explorerUrl: string;
}

// ---------------------------------------------------------------------------
// Payment schemes
// ---------------------------------------------------------------------------

/** Payment scheme — extend later with 'streaming' | 'subscription' */
export type X402Scheme = 'exact';

export interface X402Resource {
  /** URL path this payment protects (e.g. "/api/premium/feed") */
  resource: string;
  /** Human-readable description */
  description: string;
  /** Payment scheme */
  scheme: X402Scheme;
  /** Network to pay on */
  network: X402Network;
  /** Asset to pay with */
  asset: X402Asset;
  /** Amount in smallest unit (6 decimals for USDC, so 100000 = $0.10) */
  amount: string;
  /** Recipient address */
  payTo: string;
}

// ---------------------------------------------------------------------------
// Payment proof (sent by client in X-402-Payment header)
// ---------------------------------------------------------------------------

export interface X402PaymentProof {
  /** Transaction hash on-chain */
  txHash: string;
  /** Network the tx was submitted on */
  network: X402Network;
  /** Asset used */
  asset: X402Asset;
  /** Amount paid (in smallest unit) */
  amount: string;
  /** Payer address */
  from: string;
  /** Recipient address */
  to: string;
  /** Resource being accessed */
  resource: string;
  /** Unix timestamp (ms) when payment was made */
  paidAt: number;
  /** Signature of the proof by the payer (EIP-712 or personal_sign) */
  signature: string;
}

// ---------------------------------------------------------------------------
// Payment verification result
// ---------------------------------------------------------------------------

export type X402VerificationStatus = 'valid' | 'invalid' | 'pending' | 'expired';

export interface X402VerificationResult {
  status: X402VerificationStatus;
  /** If valid, when the access expires */
  expiresAt?: number;
  /** If invalid, reason */
  reason?: string;
  /** The verified proof (if valid) */
  proof?: X402PaymentProof;
}

// ---------------------------------------------------------------------------
// Access tiers
// ---------------------------------------------------------------------------

export type X402Tier = 'free' | 'basic' | 'premium';

export interface X402TierConfig {
  tier: X402Tier;
  /** USDC amount per access window (0 for free) */
  amount: string;
  /** Access window duration in ms (e.g. 3600000 = 1 hour) */
  windowMs: number;
  /** Max events per second in live feed */
  maxEventsPerSecond: number;
  /** Which provider IDs are accessible */
  allowedProviders: string[];
  /** Whether historical data is available */
  historicalAccess: boolean;
  /** Max concurrent WebSocket connections */
  maxConnections: number;
}

// ---------------------------------------------------------------------------
// Session (server-side, tracks active paid sessions)
// ---------------------------------------------------------------------------

export interface X402Session {
  /** Session ID */
  sessionId: string;
  /** Payer wallet address */
  address: string;
  /** Active tier */
  tier: X402Tier;
  /** When this session was created */
  createdAt: number;
  /** When this session expires */
  expiresAt: number;
  /** Payment proof that created this session */
  proof: X402PaymentProof;
  /** Number of API calls made in this session */
  requestCount: number;
}

// ---------------------------------------------------------------------------
// 402 Response payload (returned in HTTP 402 body)
// ---------------------------------------------------------------------------

export interface X402Challenge {
  /** x402 protocol version */
  version: '1';
  /** What to pay for */
  resource: X402Resource;
  /** Where to find the manifest */
  manifestUrl: string;
  /** Human-readable message */
  message: string;
}
