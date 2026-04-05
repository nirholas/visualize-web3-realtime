# Task 36: Client-Side Wallet Connection & Payment

## Context
Tasks 32-35 built the server side. Now we need client-side code that connects a user's wallet, signs a USDC payment transaction, and submits the proof to unlock premium features.

The project uses:
- React 18 with Next.js 14 app router
- `viem` (installed in Task 33) for chain interaction
- Framer Motion for animations
- Tailwind CSS + custom design system (`packages/ui/`)
- Dark theme (`#0a0a12` background, `#d8d8e8` text)
- IBM Plex Mono font

We're targeting browser wallets (MetaMask, Coinbase Wallet, Rainbow) via EIP-1193. Do NOT install wagmi or RainbowKit — use viem's wallet client directly to keep the bundle small.

## What to Build

### 1. Wallet Hook (`hooks/useWallet.ts` — NEW)

```typescript
import { createWalletClient, custom, type WalletClient, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';

interface UseWalletReturn {
  /** Connected wallet address (null if disconnected) */
  address: Address | null;
  /** Chain ID the wallet is on */
  chainId: number | null;
  /** Whether currently connecting */
  isConnecting: boolean;
  /** Whether on the correct network */
  isCorrectNetwork: boolean;
  /** Error message if any */
  error: string | null;
  /** Connect wallet via EIP-1193 */
  connect: () => Promise<void>;
  /** Disconnect (clear local state) */
  disconnect: () => void;
  /** Request network switch to Base Sepolia */
  switchNetwork: () => Promise<void>;
  /** The viem wallet client (null if not connected) */
  walletClient: WalletClient | null;
}

export function useWallet(): UseWalletReturn {
  // 1. Check for window.ethereum
  // 2. Request accounts via eth_requestAccounts
  // 3. Create viem walletClient with custom transport
  // 4. Listen for accountsChanged and chainChanged events
  // 5. Auto-reconnect if previously connected (check localStorage)
  // 6. switchNetwork uses wallet_addEthereumChain / wallet_switchEthereumChain
}
```

### 2. Payment Hook (`hooks/useX402Payment.ts` — NEW)

```typescript
import type { X402PaymentProof, X402Resource, X402Tier } from '@web3viz/core';

interface UseX402PaymentReturn {
  /** Current session tier (null if no active session) */
  currentTier: X402Tier | null;
  /** Session expiry timestamp */
  expiresAt: number | null;
  /** Whether a payment is in progress */
  isPaying: boolean;
  /** Error from last payment attempt */
  paymentError: string | null;
  /** Initiate payment for a resource */
  pay: (resource: X402Resource) => Promise<void>;
  /** Check if we have an active session */
  checkSession: () => Promise<void>;
  /** Clear session (logout) */
  clearSession: () => void;
}

export function useX402Payment(): UseX402PaymentReturn {
  // 1. On mount, call /api/premium/session to check for active session (via cookie)
  // 2. pay() flow:
  //    a. Ensure wallet is connected and on correct network
  //    b. Build USDC transfer transaction (ERC-20 `transfer(to, amount)`)
  //    c. Send transaction via walletClient.writeContract()
  //    d. Wait for tx confirmation (1 block)
  //    e. Build X402PaymentProof object
  //    f. Sign the proof with personal_sign for integrity
  //    g. Base64-encode the proof JSON
  //    h. POST to the premium endpoint with X-402-Payment header
  //    i. If 200, session cookie is set automatically
  //    j. Update local state with tier info
  // 3. Auto-refresh: poll /api/premium/session every 60s to catch expiry
}
```

### 3. USDC Transfer Helper (`lib/x402/usdc.ts` — NEW)

```typescript
import { encodeFunctionData, type Address } from 'viem';

const ERC20_TRANSFER_ABI = [{
  type: 'function',
  name: 'transfer',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ type: 'bool' }],
  stateMutability: 'nonpayable',
}] as const;

/**
 * Build a USDC transfer transaction for x402 payment.
 * Returns the contract call params ready for walletClient.writeContract().
 */
export function buildUSDCTransfer(
  usdcAddress: Address,
  to: Address,
  amount: bigint,
) {
  return {
    address: usdcAddress,
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer' as const,
    args: [to, amount] as const,
  };
}
```

### 4. Proof Signer (`lib/x402/proof.ts` — NEW)

```typescript
import type { X402PaymentProof } from '@web3viz/core';
import type { WalletClient } from 'viem';

/**
 * Build and sign a payment proof.
 * The signature covers the canonical JSON of the proof (sorted keys, no signature field).
 */
export async function buildSignedProof(
  params: Omit<X402PaymentProof, 'signature'>,
  walletClient: WalletClient,
): Promise<X402PaymentProof> {
  const message = JSON.stringify(params, Object.keys(params).sort());
  const signature = await walletClient.signMessage({
    account: params.from as `0x${string}`,
    message,
  });
  return { ...params, signature };
}

/**
 * Encode a payment proof for the X-402-Payment header.
 */
export function encodeProof(proof: X402PaymentProof): string {
  return btoa(JSON.stringify(proof));
}
```

## Files to Create
- `hooks/useWallet.ts` — **NEW** — Wallet connection hook
- `hooks/useX402Payment.ts` — **NEW** — Payment flow hook
- `lib/x402/usdc.ts` — **NEW** — USDC transfer builder
- `lib/x402/proof.ts` — **NEW** — Proof builder and signer

## Files to Modify
- None

## Acceptance Criteria
- [ ] `useWallet()` connects to MetaMask/Coinbase Wallet via EIP-1193
- [ ] `useWallet()` detects wrong network and offers `switchNetwork()`
- [ ] `useX402Payment().pay()` sends a USDC transfer and builds a signed proof
- [ ] Payment proof is base64-encoded and sent via `X-402-Payment` header
- [ ] Session state persists across page reloads via cookie
- [ ] `useX402Payment().checkSession()` polls for session expiry
- [ ] All code compiles — no `window` references at import time (SSR-safe with dynamic imports or `typeof window` checks)
- [ ] No private keys or secrets in client-side code
