// ============================================================================
// X402 Payment Protocol — Zod Validation Schemas
//
// Runtime validation schemas mirroring the hand-written types in x402.ts.
// Prefer the hand-written types for IDE experience; use these schemas
// to validate untrusted data at system boundaries.
// ============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const x402NetworkSchema = z.literal('base-sepolia').or(z.literal('base-mainnet'));
const x402AssetSchema = z.literal('USDC');
const x402SchemeSchema = z.literal('exact');
const x402TierSchema = z.union([z.literal('free'), z.literal('basic'), z.literal('premium')]);
const x402VerificationStatusSchema = z.union([
  z.literal('valid'),
  z.literal('invalid'),
  z.literal('pending'),
  z.literal('expired'),
]);

// ---------------------------------------------------------------------------
// X402Resource
// ---------------------------------------------------------------------------

export const x402ResourceSchema = z
  .object({
    resource: z.string(),
    description: z.string(),
    scheme: x402SchemeSchema,
    network: x402NetworkSchema,
    asset: x402AssetSchema,
    amount: z.string(),
    payTo: z.string(),
  })
  .strict();

// ---------------------------------------------------------------------------
// X402PaymentProof
// ---------------------------------------------------------------------------

export const x402PaymentProofSchema = z
  .object({
    txHash: z.string(),
    network: x402NetworkSchema,
    asset: x402AssetSchema,
    amount: z.string(),
    from: z.string(),
    to: z.string(),
    resource: z.string(),
    paidAt: z.number(),
    signature: z.string(),
  })
  .strict();

// ---------------------------------------------------------------------------
// X402VerificationResult
// ---------------------------------------------------------------------------

export const x402VerificationResultSchema = z
  .object({
    status: x402VerificationStatusSchema,
    expiresAt: z.number().optional(),
    reason: z.string().optional(),
    proof: x402PaymentProofSchema.optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// X402TierConfig
// ---------------------------------------------------------------------------

export const x402TierConfigSchema = z
  .object({
    tier: x402TierSchema,
    amount: z.string(),
    windowMs: z.number(),
    maxEventsPerSecond: z.number(),
    allowedProviders: z.array(z.string()),
    historicalAccess: z.boolean(),
    maxConnections: z.number(),
  })
  .strict();

// ---------------------------------------------------------------------------
// X402Challenge
// ---------------------------------------------------------------------------

export const x402ChallengeSchema = z
  .object({
    version: z.literal('1'),
    resource: x402ResourceSchema,
    manifestUrl: z.string(),
    message: z.string(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Inferred types (for reference — prefer hand-written types from x402.ts)
// ---------------------------------------------------------------------------

export type X402ResourceSchema = z.infer<typeof x402ResourceSchema>;
export type X402PaymentProofSchema = z.infer<typeof x402PaymentProofSchema>;
export type X402VerificationResultSchema = z.infer<typeof x402VerificationResultSchema>;
export type X402TierConfigSchema = z.infer<typeof x402TierConfigSchema>;
export type X402ChallengeSchema = z.infer<typeof x402ChallengeSchema>;
