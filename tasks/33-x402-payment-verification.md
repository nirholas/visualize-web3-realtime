# Task 33: X402 Payment Proof Verification

## Context
Task 32 defined the x402 type system. Now we need server-side logic to verify that a client's payment proof is legitimate — i.e., the on-chain transaction exists, is confirmed, pays the correct amount to the correct address, and hasn't been reused.

This project uses Next.js 14 app router. We need a standalone verification library that the API middleware (Task 34) will call. We're on Base Sepolia testnet using USDC.

**Key dependency:** Install `viem` for EVM chain interaction (lightweight, tree-shakeable, TypeScript-first). Do NOT use ethers.js.

## What to Build

### 1. Install Dependencies

```bash
npm install viem
```

### 2. Chain Client (`lib/x402/chain.ts` — NEW)

Create a viem public client for Base Sepolia:

```typescript
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { X402_NETWORKS } from './config';

const config = X402_NETWORKS['base-sepolia'];

export const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(config.rpcUrl),
});
```

### 3. USDC Contract ABI (minimal)

Only include the Transfer event and `balanceOf` / `decimals` functions — we don't need the full ERC-20 ABI:

```typescript
export const USDC_ABI = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;
```

### 4. Payment Verifier (`lib/x402/verify.ts` — NEW)

This is the core verification logic. It must:

**a) Verify the transaction exists on-chain:**
- Use `baseSepoliaClient.getTransactionReceipt({ hash })` to fetch the receipt
- Confirm the tx is in a mined block (status === 'success')
- Parse Transfer event logs to find the USDC transfer

**b) Validate payment details match the proof:**
- `from` address matches `proof.from`
- `to` address matches `proof.to` (and matches our `X402_PAY_TO`)
- `amount` is >= the required amount for the resource
- The USDC contract address matches our config

**c) Check the proof hasn't been reused:**
- Maintain an in-memory `Set<string>` of consumed tx hashes (this is fine for single-instance; Task 40 can add Redis)
- If the txHash has already been consumed, reject

**d) Check freshness:**
- The transaction's block timestamp should be within a configurable window (default: 1 hour)
- Reject stale proofs

**e) Verify the signature (optional but recommended):**
- The proof includes a `signature` field — verify it's a valid `personal_sign` over the canonical proof payload (JSON-sorted, excluding the `signature` field)
- Use `viem`'s `verifyMessage` to check the signer matches `proof.from`

**Return** an `X402VerificationResult`:
- `status: 'valid'` with `expiresAt` = now + tier's `windowMs`
- `status: 'invalid'` with `reason` string
- `status: 'pending'` if the tx exists but has 0 confirmations

```typescript
import type { X402PaymentProof, X402VerificationResult, X402Resource } from '@web3viz/core';

export async function verifyPayment(
  proof: X402PaymentProof,
  resource: X402Resource,
): Promise<X402VerificationResult> {
  // Implementation here
}
```

### 5. Session Store (`lib/x402/sessions.ts` — NEW)

Simple in-memory session management:

```typescript
import type { X402Session, X402Tier } from '@web3viz/core';

class SessionStore {
  private sessions = new Map<string, X402Session>();

  /** Create a session after successful payment verification */
  create(address: string, tier: X402Tier, proof: X402PaymentProof, expiresAt: number): X402Session;

  /** Look up an active (non-expired) session by address */
  getByAddress(address: string): X402Session | null;

  /** Look up by session ID */
  getById(sessionId: string): X402Session | null;

  /** Increment request count */
  recordRequest(sessionId: string): void;

  /** Clean up expired sessions (call periodically) */
  prune(): void;
}

export const sessionStore = new SessionStore();
```

Use `crypto.randomUUID()` for session IDs. Run `prune()` every 60 seconds via `setInterval` (module-level, guarded so it only starts once).

## Files to Create
- `lib/x402/chain.ts` — **NEW** — viem public client for Base Sepolia
- `lib/x402/verify.ts` — **NEW** — Payment proof verification logic
- `lib/x402/sessions.ts` — **NEW** — In-memory session store
- `lib/x402/abi.ts` — **NEW** — Minimal USDC ABI

## Files to Modify
- `package.json` — Add `viem` dependency

## Acceptance Criteria
- [ ] `viem` is installed and listed in `package.json`
- [ ] `verifyPayment()` correctly validates a proof against on-chain data
- [ ] Reused tx hashes are rejected
- [ ] Stale proofs (older than 1 hour) are rejected
- [ ] `SessionStore` creates, retrieves, and prunes sessions correctly
- [ ] All code compiles with `tsc --noEmit`
- [ ] No secrets or private keys in source code
