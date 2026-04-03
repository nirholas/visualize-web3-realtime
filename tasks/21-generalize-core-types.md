# Task 21: Generalize Core Types to be Chain-Agnostic

## Goal
Refactor all shared types in `packages/core/src/types/index.ts` and `packages/core/src/categories/index.ts` to remove Solana-specific naming and support any blockchain. After this task, the type system should work for Solana, Ethereum, Base, or any future chain without modification.

## Context
Currently the types are Solana-centric:
- `Token.mint` → should be `tokenAddress` (works for any chain)
- `Trade.solAmount` → should be `nativeAmount` with a `chain` field
- `TopToken.volumeSol` → should be `volume` with a `nativeSymbol`
- `TraderEdge.volumeSol` → should be `volume`
- `DataProviderEvent` has no `chain` field
- `DataProviderStats.totalVolumeSol` → should be `totalVolume`
- Categories are PumpFun-only (launches, trades, claims)

## Files to Modify

### 1. `packages/core/src/types/index.ts`

Make these changes:

**Token interface:**
```typescript
export interface Token {
  /** Token contract address (mint on Solana, contract on EVM) */
  tokenAddress: string;
  name: string;
  symbol: string;
  /** Chain identifier: 'solana' | 'ethereum' | 'base' | string */
  chain: string;
  uri?: string;
  creatorAddress: string;
  initialBuy?: number;
  marketCap?: number;
  /** Native currency symbol for marketCap (e.g. 'SOL', 'ETH') */
  nativeSymbol?: string;
  signature?: string;
  timestamp: number;
  isAgent?: boolean;
  /** Arbitrary provider-specific metadata */
  meta?: Record<string, unknown>;
}
```

**Trade interface:**
```typescript
export interface Trade {
  tokenAddress: string;
  chain: string;
  signature: string;
  traderAddress: string;
  txType: 'buy' | 'sell' | 'swap' | string;
  tokenAmount: number;
  nativeAmount: number;
  nativeSymbol: string;
  /** USD equivalent if available */
  usdAmount?: number;
  marketCap?: number;
  timestamp: number;
  name?: string;
  symbol?: string;
  meta?: Record<string, unknown>;
}
```

**TopToken interface:**
```typescript
export interface TopToken {
  tokenAddress: string;
  symbol: string;
  name: string;
  chain: string;
  trades: number;
  volume: number;
  nativeSymbol: string;
  /** USD volume if available */
  volumeUsd?: number;
}
```

**TraderEdge interface:**
```typescript
export interface TraderEdge {
  trader: string;
  tokenAddress: string;
  chain: string;
  trades: number;
  volume: number;
}
```

**Claim interface:**
```typescript
export interface Claim {
  signature: string;
  chain: string;
  slot?: number;
  timestamp: number;
  claimType: string;
  programId: string;
  claimer: string;
  isFirstClaim: boolean;
  logs?: string[];
  meta?: Record<string, unknown>;
}
```

**RawEvent — add a generic type:**
```typescript
export type RawEvent =
  | { type: 'tokenCreate'; data: Token }
  | { type: 'trade'; data: Trade }
  | { type: 'claim'; data: Claim }
  | { type: 'custom'; data: Record<string, unknown> };
```

**DataProviderEvent — add chain:**
```typescript
export interface DataProviderEvent {
  id: string;
  /** Which provider emitted this */
  providerId: string;
  category: string;
  chain: string;
  timestamp: number;
  label: string;
  amount?: number;
  /** Native currency symbol */
  nativeSymbol?: string;
  /** USD equivalent */
  amountUsd?: number;
  address: string;
  tokenAddress?: string;
  meta?: Record<string, unknown>;
}
```

**DataProviderStats — generalize:**
```typescript
export interface DataProviderStats {
  counts: Record<string, number>;
  /** Total volume per chain: { solana: 123.4, ethereum: 56.7 } */
  totalVolume: Record<string, number>;
  totalTransactions: number;
  totalAgents: number;
  recentEvents: DataProviderEvent[];
  topTokens: TopToken[];
  traderEdges: TraderEdge[];
  rawEvents: RawEvent[];
}
```

**GraphNode — add chain:**
```typescript
export interface GraphNode {
  id: string;
  type: 'hub' | 'agent';
  label: string;
  radius: number;
  color: string;
  chain?: string;
  hubTokenAddress?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}
```

### 2. `packages/core/src/categories/index.ts`

Expand the built-in categories to cover multi-chain events. Keep existing PumpFun categories but add new ones:

```typescript
export const CATEGORIES = [
  // Solana / PumpFun
  'launches',
  'agentLaunches',
  'trades',
  'claimsWallet',
  'claimsGithub',
  'claimsFirst',
  // Ethereum
  'ethSwaps',
  'ethTransfers',
  'ethMints',
  // Base
  'baseSwaps',
  'baseTransfers',
  'baseMints',
  // AI Agents
  'agentDeploys',
  'agentInteractions',
  // ERC-8004
  'erc8004Mints',
  'erc8004Transfers',
  // CEX
  'cexSpotTrades',
  'cexLiquidations',
] as const;
```

Add corresponding `CATEGORY_CONFIGS` entries for each with distinct colors and icons:
- Ethereum categories: use blue-ish tones (#627EEA for ETH brand color as base)
- Base categories: use blue (#0052FF Base brand)
- Agent categories: use magenta/pink
- ERC-8004: use teal/cyan
- CEX: use gold/orange

### 3. `packages/core/src/providers/index.ts`

Update `CreateProviderConfig` to include `categories`:
```typescript
export interface CreateProviderConfig {
  id: string;
  name: string;
  /** Chain(s) this provider covers */
  chains: string[];
  /** Categories this provider emits events for */
  categories: CategoryConfig[];
  connect: () => void;
  disconnect: () => void;
  getStats: () => DataProviderStats;
  getConnections: () => ConnectionState[];
}
```

Update `createProvider` to accept and expose the new fields. Add `chains` and `categories` as readonly fields on the `DataProvider` interface:
```typescript
export interface DataProvider {
  readonly id: string;
  readonly name: string;
  readonly chains: string[];
  readonly categories: CategoryConfig[];
  // ... rest stays the same
}
```

### 4. `packages/core/src/index.ts`

Ensure all new types and exports are re-exported.

## Validation
- `cd packages/core && npx tsc --noEmit` should pass with zero errors
- No file outside `packages/core/` needs to compile yet (other tasks will update consumers)

## Important Notes
- Do NOT modify any files outside `packages/core/` — downstream consumers will be updated in later tasks
- Keep backward compatibility where possible by making new fields optional where the old field was required
- The `meta` field on events/tokens/trades is the escape hatch for provider-specific data
- Use `string` (not union) for `chain` field so providers can register any chain name
