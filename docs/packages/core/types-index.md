# @web3viz/core - Types Index

## File Path

```
packages/core/src/types/index.ts
```

## Purpose

Central type definition module for the Web3 visualization SDK. Contains all shared, framework-agnostic type definitions used across the entire system -- from raw blockchain data models (tokens, trades, claims) through graph visualization types to camera/3D and theming types.

---

## Module Dependencies

| Import | Source | Description |
|---|---|---|
| `AgentEvent` | `./agent` | Type-only import of the `AgentEvent` interface, used in the `RawEvent` discriminated union (line 159). |

No external (npm) dependencies. This module is pure TypeScript type definitions.

---

## Exported Members

### Source Identification

#### `BuiltInSource` (type, line 16-22)

```ts
export type BuiltInSource =
  | 'pumpfun'
  | 'ethereum'
  | 'base'
  | 'agents'
  | 'erc8004'
  | 'cex';
```

A string literal union identifying all built-in data sources. Each value corresponds to a registered `DataProvider` implementation. Plugin/custom providers use arbitrary string IDs outside this union.

| Value | Description |
|---|---|
| `'pumpfun'` | Solana PumpFun token launcher |
| `'ethereum'` | Ethereum mainnet |
| `'base'` | Base L2 (Coinbase) |
| `'agents'` | AI agent activity (SperaxOS) |
| `'erc8004'` | ERC-8004 native asset issuance protocol |
| `'cex'` | Centralized exchange volume aggregator |

---

### Token & Trade Types

#### `Token` (interface, lines 29-56)

Represents an on-chain token entity (e.g., from PumpFun launches, Uniswap deployments).

| Property | Type | Required | Description |
|---|---|---|---|
| `tokenAddress` | `string` | No | Token contract address (mint on Solana, contract on EVM) |
| `mint` | `string` | No | Solana mint address (backward-compat alias) |
| `name` | `string` | **Yes** | Human-readable token name |
| `symbol` | `string` | **Yes** | Token ticker symbol |
| `chain` | `string` | No | Chain identifier (e.g., `'solana'`, `'ethereum'`, `'base'`) |
| `uri` | `string` | No | Metadata URI (e.g., IPFS link) |
| `creatorAddress` | `string` | No | Normalized creator/deployer address |
| `traderPublicKey` | `string` | No | Backward-compat alias for `creatorAddress` (Solana) |
| `initialBuy` | `number` | No | Initial buy amount at launch |
| `marketCap` | `number` | No | Market capitalization |
| `marketCapSol` | `number` | No | Market cap denominated in SOL |
| `nativeSymbol` | `string` | No | Native currency symbol for marketCap (e.g., `'SOL'`, `'ETH'`) |
| `signature` | `string` | No | Transaction signature |
| `timestamp` | `number` | **Yes** | Event timestamp (ms since epoch) |
| `isAgent` | `boolean` | No | Whether this token appears to be an AI agent launch |
| `source` | `string` | No | Which data source produced this token |
| `meta` | `Record<string, unknown>` | No | Arbitrary provider-specific metadata |

#### `Trade` (interface, lines 59-92)

Represents an on-chain trade event (buy, sell, swap).

| Property | Type | Required | Description |
|---|---|---|---|
| `tokenAddress` | `string` | No | Token contract address |
| `mint` | `string` | No | Solana mint address |
| `chain` | `string` | No | Chain identifier |
| `signature` | `string` | **Yes** | Transaction signature (unique identifier) |
| `traderAddress` | `string` | No | Normalized trader address |
| `traderPublicKey` | `string` | No | Backward-compat alias for `traderAddress` (Solana) |
| `txType` | `'buy' \| 'sell' \| 'swap' \| string` | **Yes** | Transaction type. Core types are `buy`, `sell`, `swap`; providers may extend with custom strings. |
| `tokenAmount` | `number` | **Yes** | Amount of tokens traded |
| `nativeAmount` | `number` | No | Normalized native currency amount |
| `solAmount` | `number` | No | Backward-compat alias for `nativeAmount` (SOL, in lamports) |
| `nativeSymbol` | `string` | No | Native currency symbol |
| `usdAmount` | `number` | No | USD equivalent if available |
| `marketCap` | `number` | No | Current market cap at time of trade |
| `marketCapSol` | `number` | No | Market cap in SOL |
| `timestamp` | `number` | **Yes** | Event timestamp (ms since epoch) |
| `name` | `string` | No | Token name |
| `symbol` | `string` | No | Token symbol |
| `newTokenBalance` | `number` | No | Solana-specific: new token balance after trade |
| `bondingCurveKey` | `string` | No | Solana-specific: bonding curve account key |
| `vTokensInBondingCurve` | `number` | No | Solana-specific: virtual tokens in bonding curve |
| `vSolInBondingCurve` | `number` | No | Solana-specific: virtual SOL in bonding curve |
| `source` | `string` | No | Which data source produced this trade |
| `meta` | `Record<string, unknown>` | No | Arbitrary provider-specific metadata |

#### `TopToken` (interface, lines 95-113)

A token or entity ranked by activity. Used as a **hub node** in the force-directed graph visualization.

| Property | Type | Required | Description |
|---|---|---|---|
| `mint` | `string` | **Yes** | Solana mint address or EVM contract address (primary key) |
| `tokenAddress` | `string` | No | Normalized alias for `mint` (multi-chain) |
| `symbol` | `string` | **Yes** | Token ticker symbol |
| `name` | `string` | **Yes** | Human-readable token name |
| `chain` | `string` | No | Chain identifier |
| `trades` | `number` | **Yes** | Total number of trades |
| `volumeSol` | `number` | **Yes** | Total volume in the chain's native currency |
| `volume` | `number` | No | Normalized alias for `volumeSol` |
| `nativeSymbol` | `string` | No | Native currency symbol |
| `volumeUsd` | `number` | No | USD volume if available |
| `source` | `string` | No | Source provider that produced this entry |

#### `TraderEdge` (interface, lines 116-130)

An edge between a participant (trader/user) and a hub (token) in the graph visualization.

| Property | Type | Required | Description |
|---|---|---|---|
| `trader` | `string` | **Yes** | Participant address |
| `mint` | `string` | **Yes** | Solana mint address or EVM contract address |
| `tokenAddress` | `string` | No | Normalized alias for `mint` |
| `chain` | `string` | No | Chain identifier |
| `trades` | `number` | **Yes** | Number of trades between this participant and token |
| `volumeSol` | `number` | **Yes** | Total volume in native currency |
| `volume` | `number` | No | Normalized alias for `volumeSol` |
| `source` | `string` | No | Source provider |

#### `Claim` (interface, lines 133-153)

A claim event (e.g., fee claims, social claims on Solana).

| Property | Type | Required | Description |
|---|---|---|---|
| `signature` | `string` | **Yes** | Transaction signature |
| `chain` | `string` | No | Chain identifier |
| `slot` | `number` | No | Solana slot number |
| `timestamp` | `number` | **Yes** | Event timestamp (ms since epoch) |
| `claimType` | `string` | **Yes** | Type of claim (e.g., `'wallet'`, `'github'`, `'first'`) |
| `programId` | `string` | **Yes** | Program/contract that processed the claim |
| `claimer` | `string` | No | Normalized claimer address |
| `wallet` | `string` | No | Backward-compat alias for `claimer` (Solana wallet) |
| `mint` | `string` | No | Solana token mint associated with the claim |
| `isFirstClaim` | `boolean` | **Yes** | Whether this is the first claim by this address |
| `logs` | `string[]` | No | Transaction logs |
| `solAmount` | `number` | No | SOL amount claimed |
| `tokenAmount` | `number` | No | Token amount associated with the claim |
| `meta` | `Record<string, unknown>` | No | Arbitrary provider-specific metadata |

---

### Event Types

#### `RawEvent` (type, lines 162-167)

A discriminated union representing raw events from data sources before normalization.

```ts
export type RawEvent =
  | { type: 'tokenCreate'; data: Token }
  | { type: 'trade'; data: Trade }
  | { type: 'claim'; data: Claim }
  | { type: 'custom'; data: Record<string, unknown> }
  | { type: 'agentEvent'; data: AgentEvent };
```

| Variant | `type` Discriminant | `data` Type | Description |
|---|---|---|---|
| Token creation | `'tokenCreate'` | `Token` | A new token was deployed |
| Trade | `'trade'` | `Trade` | A trade occurred |
| Claim | `'claim'` | `Claim` | A claim was processed |
| Custom | `'custom'` | `Record<string, unknown>` | Provider-specific custom event |
| Agent event | `'agentEvent'` | `AgentEvent` | An AI agent lifecycle event |

#### `DataProviderEvent` (interface, lines 173-194)

The **canonical event type** that all providers emit after normalizing raw events. This is the unified format consumed by the visualization engine and UI.

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | **Yes** | Unique event identifier |
| `providerId` | `string` | No | Which provider emitted this event |
| `source` | `string` | No | Backward-compat alias for `providerId` |
| `category` | `string` | **Yes** | Category within the source (e.g., `'launches'`, `'trades'`, `'swaps'`) |
| `chain` | `string` | No | Chain identifier |
| `timestamp` | `number` | **Yes** | Event timestamp (ms since epoch) |
| `label` | `string` | **Yes** | Human-readable event label |
| `amount` | `number` | No | Event amount in native currency |
| `nativeSymbol` | `string` | No | Native currency symbol |
| `amountUsd` | `number` | No | USD equivalent |
| `address` | `string` | **Yes** | Participant address |
| `tokenAddress` | `string` | No | Token contract address |
| `mint` | `string` | No | Backward-compat alias for `tokenAddress` (Solana) |
| `meta` | `Record<string, unknown>` | No | Arbitrary metadata |

---

### Graph Types

#### `GraphNode` (interface, lines 200-218)

A node in the force-directed graph visualization.

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | **Yes** | Unique node identifier |
| `type` | `'hub' \| 'agent'` | **Yes** | Node type: `hub` for token/entity hubs, `agent` for participants |
| `label` | `string` | **Yes** | Display label |
| `radius` | `number` | **Yes** | Visual radius |
| `color` | `string` | **Yes** | CSS color string |
| `chain` | `string` | No | Chain identifier |
| `hubTokenAddress` | `string` | No | Token address for hub nodes |
| `hubMint` | `string` | No | Backward-compat alias for `hubTokenAddress` (Solana) |
| `source` | `string` | No | Source provider |
| `x` | `number` | No | Current x position (set by simulation) |
| `y` | `number` | No | Current y position (set by simulation) |
| `vx` | `number` | No | Current x velocity |
| `vy` | `number` | No | Current y velocity |
| `fx` | `number \| null` | No | Fixed x position (if pinned) |
| `fy` | `number \| null` | No | Fixed y position (if pinned) |

#### `GraphEdge` (interface, lines 220-225)

An edge connecting two nodes in the graph.

| Property | Type | Required | Description |
|---|---|---|---|
| `sourceId` | `string` | **Yes** | Source node ID |
| `targetId` | `string` | **Yes** | Target node ID |
| `source` | `string \| GraphNode` | **Yes** | Source reference (string before simulation resolves, `GraphNode` after) |
| `target` | `string \| GraphNode` | **Yes** | Target reference (same behavior as `source`) |

---

### Stats & Aggregation Types

#### `DataProviderStats` (interface, lines 232-244)

Aggregate statistics from a single data provider.

| Property | Type | Required | Description |
|---|---|---|---|
| `counts` | `Record<string, number>` | **Yes** | Event counts by category |
| `totalVolumeSol` | `number` | No | Total volume in SOL (Solana-native) |
| `totalVolume` | `Record<string, number>` | No | Total volume per chain, e.g., `{ solana: 123.4, ethereum: 56.7 }` |
| `totalTransactions` | `number` | **Yes** | Total transaction count |
| `totalAgents` | `number` | **Yes** | Total unique agents seen |
| `recentEvents` | `DataProviderEvent[]` | **Yes** | Buffer of recent normalized events |
| `topTokens` | `TopToken[]` | **Yes** | Ranked list of most active tokens |
| `traderEdges` | `TraderEdge[]` | **Yes** | Participant-to-token edges |
| `rawEvents` | `RawEvent[]` | **Yes** | Buffer of raw events |

#### `MergedStats` (interface, lines 247-250)

Combined statistics from all active providers. Extends `DataProviderStats`.

| Property | Type | Required | Description |
|---|---|---|---|
| *(inherits all from `DataProviderStats`)* | | | |
| `bySource` | `Record<string, DataProviderStats>` | **Yes** | Per-source breakdown of stats |

---

### Share / Theming Types

#### `ShareColors` (interface, lines 257-261)

Color palette for share/screenshot customization.

| Property | Type | Required | Description |
|---|---|---|---|
| `background` | `string` | **Yes** | Background color |
| `protocol` | `string` | **Yes** | Protocol/hub node color |
| `user` | `string` | **Yes** | User/agent node color |

#### `EmbedConfig` (interface, lines 264-269)

Configuration for the embeddable widget.

| Property | Type | Required | Description |
|---|---|---|---|
| `bg` | `string` | **Yes** | Background color |
| `width` | `number` | **Yes** | Widget width in pixels |
| `height` | `number` | **Yes** | Widget height in pixels |
| `title` | `string` | **Yes** | Widget title |

---

### Camera / 3D Types

#### `Vec3` (type, line 275)

```ts
export type Vec3 = [number, number, number];
```

A 3-element tuple representing a point or vector in 3D space: `[x, y, z]`.

#### `CameraAnimationRequest` (interface, lines 277-281)

Parameters for animating the 3D camera.

| Property | Type | Required | Description |
|---|---|---|---|
| `position` | `Vec3` | **Yes** | Target camera position |
| `lookAt` | `Vec3` | No | Target look-at point |
| `durationMs` | `number` | No | Animation duration in milliseconds |

#### `GraphHandle` (interface, lines 284-290)

Imperative API exposed by graph renderer components (e.g., via React `useImperativeHandle`).

| Method | Signature | Description |
|---|---|---|
| `animateCameraTo` | `(request: CameraAnimationRequest) => Promise<void>` | Animate the camera to a target position |
| `focusHub` | `(index: number, durationMs?: number) => Promise<void>` | Focus camera on a hub node by index |
| `getCanvasElement` | `() => HTMLCanvasElement \| null` | Get the underlying canvas DOM element |
| `getHubCount` | `() => number` | Return the number of hub nodes |
| `setOrbitEnabled` | `(enabled: boolean) => void` | Enable or disable orbit controls |

---

## Usage Example

```ts
import type { Token, Trade, TopToken, DataProviderEvent, GraphNode } from '@web3viz/core';

// Create a token
const token: Token = {
  name: 'My Token',
  symbol: 'MTK',
  timestamp: Date.now(),
  chain: 'ethereum',
  tokenAddress: '0x...',
};

// Create a top token for graph visualization
const topToken: TopToken = {
  mint: '0x...',
  symbol: 'MTK',
  name: 'My Token',
  trades: 150,
  volumeSol: 42.5,
};
```
