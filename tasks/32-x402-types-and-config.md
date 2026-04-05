# Task 32: X402 Type System & Configuration

## Context
We're implementing the x402 payment protocol (https://x402.org) to gate premium features behind on-chain USDC micropayments on Base Sepolia (testnet now, mainnet later). Before building any logic, we need a comprehensive type system and configuration layer.

The existing `@web3viz/core` package already has `GraphNode`, `GraphEdge`, `DataProviderEvent`, and the `RawEvent` union. We're adding x402-specific types alongside these.

The project uses:
- Next.js 14 app router (`app/api/` for routes)
- `packages/core/src/types/` for shared types
- `zod` for runtime validation (already in dependencies)
- TypeScript strict mode

## What to Build

### 1. X402 Core Types (`packages/core/src/types/x402.ts` — NEW)

```typescript
// ---------------------------------------------------------------------------
// Network & Asset
// ---------------------------------------------------------------------------

export type X402Network = 'base-sepolia' | 'base-mainnet';
export type X402Asset = 'USDC';

export interface X402NetworkConfig {
  network: X402Network;
  chainId: number;
  rpcUrl: string;
  usdcAddress: string;         // USDC contract address on this network
  explorerUrl: string;
}

// ---------------------------------------------------------------------------
// Payment schemes
// ---------------------------------------------------------------------------

export type X402Scheme = 'exact';  // extend later: 'streaming' | 'subscription'

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
```

### 2. Zod Schemas (`packages/core/src/types/x402-schemas.ts` — NEW)

Create Zod schemas that mirror each type above for runtime validation of:
- `X402PaymentProof` — validate incoming payment headers
- `X402Challenge` — validate outgoing 402 responses
- `X402Resource` — validate manifest entries

Use `z.object()` with strict mode. Export both the schemas and inferred types (but prefer the hand-written types for IDE experience).

### 3. X402 Config (`lib/x402/config.ts` — NEW)

```typescript
import type { X402NetworkConfig, X402TierConfig, X402Resource } from '@web3viz/core';

export const X402_NETWORKS: Record<string, X402NetworkConfig> = {
  'base-sepolia': {
    network: 'base-sepolia',
    chainId: 84532,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    explorerUrl: 'https://sepolia.basescan.org',
  },
};

export const X402_PAY_TO = process.env.X402_PAY_TO_ADDRESS || '0x...'; // TODO: set real address

export const X402_TIERS: Record<string, X402TierConfig> = {
  free: {
    tier: 'free',
    amount: '0',
    windowMs: 0,
    maxEventsPerSecond: 2,
    allowedProviders: ['pumpfun'],
    historicalAccess: false,
    maxConnections: 1,
  },
  basic: {
    tier: 'basic',
    amount: '100000',   // $0.10 USDC
    windowMs: 3600000,  // 1 hour
    maxEventsPerSecond: 10,
    allowedProviders: ['pumpfun', 'ethereum', 'base'],
    historicalAccess: false,
    maxConnections: 2,
  },
  premium: {
    tier: 'premium',
    amount: '1000000',  // $1.00 USDC
    windowMs: 86400000, // 24 hours
    maxEventsPerSecond: 50,
    allowedProviders: ['pumpfun', 'ethereum', 'base', 'agents', 'cex'],
    historicalAccess: true,
    maxConnections: 5,
  },
};

export const X402_RESOURCES: X402Resource[] = [
  {
    resource: '/api/premium/feed',
    description: 'Real-time premium data feed with all providers',
    scheme: 'exact',
    network: 'base-sepolia',
    asset: 'USDC',
    amount: '100000',
    payTo: X402_PAY_TO,
  },
  {
    resource: '/api/premium/history',
    description: 'Historical event data and analytics',
    scheme: 'exact',
    network: 'base-sepolia',
    asset: 'USDC',
    amount: '1000000',
    payTo: X402_PAY_TO,
  },
];
```

### 4. Environment Variables

Add to `.env.local` (document in `.env.example` — NEW if it doesn't exist):

```
# X402 Payment Protocol
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
X402_PAY_TO_ADDRESS=0x0000000000000000000000000000000000000000
X402_SESSION_SECRET=change-me-in-production
```

### 5. Export from Core

Update `packages/core/src/types/index.ts` to re-export all x402 types:
```typescript
export * from './x402';
```

Update `packages/core/src/index.ts` if needed to export the types barrel.

## Files to Create
- `packages/core/src/types/x402.ts` — **NEW** — Core x402 type definitions
- `packages/core/src/types/x402-schemas.ts` — **NEW** — Zod validation schemas
- `lib/x402/config.ts` — **NEW** — Network config, tier definitions, resource list
- `.env.example` — **NEW** (or update if exists) — Document required env vars

## Files to Modify
- `packages/core/src/types/index.ts` — Add `export * from './x402'`
- `packages/core/src/index.ts` — Ensure types barrel is exported

## Acceptance Criteria
- [ ] `packages/core` compiles with no errors (`npm run build` or `tsc --noEmit`)
- [ ] All x402 types are importable from `@web3viz/core`
- [ ] Zod schemas match the TypeScript types (same fields, same constraints)
- [ ] `lib/x402/config.ts` exports `X402_NETWORKS`, `X402_TIERS`, `X402_RESOURCES`
- [ ] `.env.example` documents all new env vars with comments
- [ ] No circular imports introduced
