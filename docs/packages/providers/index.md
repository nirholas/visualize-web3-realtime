# @web3viz/providers - Package Entry Point

## File Path

`packages/providers/src/index.ts`

## Purpose

Public API barrel file for the `@web3viz/providers` package. This module consolidates and re-exports all data provider hooks, class implementations, and TypeScript type definitions from the package's internal modules. It serves as the single import surface for consumers of this package.

## Module Dependencies

This file has no external dependencies. It exclusively re-exports from internal sibling modules:

| Internal Module | Items Re-exported |
|---|---|
| `./pump-fun/usePumpFun` | `usePumpFun` (hook), `PumpFunStats` (type) |
| `./pump-fun/usePumpFunClaims` | `usePumpFunClaims` (hook), `PumpFunClaimsStats` (type) |
| `./pump-fun/PumpFunProvider` | `PumpFunProvider` (class), `PumpFunProviderOptions` (type) |
| `./mock/MockProvider` | `MockProvider` (class) |
| `./useDataProvider` | `useDataProvider` (hook), `UnifiedEvent` (type), `AggregateStats` (type) |
| `./useProviders` | `useProviders` (hook), `UseProvidersOptions` (type), `UseProvidersReturn` (type) |

## Line-by-Line Documentation

### Line 1 - Package Comment

```typescript
// @web3viz/providers -- Data provider hooks and implementations
```

Descriptive comment identifying the package scope and purpose. This is the monorepo package that encapsulates all real-time data provider logic.

### Lines 2-7 - Value Exports

```typescript
export { usePumpFun } from './pump-fun/usePumpFun';
export { usePumpFunClaims } from './pump-fun/usePumpFunClaims';
export { PumpFunProvider } from './pump-fun/PumpFunProvider';
export { MockProvider } from './mock/MockProvider';
export { useDataProvider } from './useDataProvider';
export { useProviders } from './useProviders';
```

Named re-exports of runtime values (hooks and classes). These are the primary constructs consumers instantiate or call:

- **`usePumpFun`** - React hook that connects to the PumpPortal WebSocket for real-time trades and token launches.
- **`usePumpFunClaims`** - React hook that connects to Solana RPC WebSocket for real-time claim event monitoring.
- **`PumpFunProvider`** - Framework-agnostic class implementing the `DataProvider` interface for PumpFun data (trades, launches, claims).
- **`MockProvider`** - Class implementing `DataProvider` that generates synthetic data for development and testing.
- **`useDataProvider`** - Deprecated React hook that aggregates PumpFun trades and claims into a unified event stream.
- **`useProviders`** - React hook that manages multiple `DataProvider` instances, providing merged stats, event filtering, and provider/category toggling.

### Lines 9-13 - Type-Only Exports

```typescript
export type { PumpFunStats } from './pump-fun/usePumpFun';
export type { PumpFunClaimsStats } from './pump-fun/usePumpFunClaims';
export type { PumpFunProviderOptions } from './pump-fun/PumpFunProvider';
export type { UnifiedEvent, AggregateStats } from './useDataProvider';
export type { UseProvidersOptions, UseProvidersReturn } from './useProviders';
```

Type-only re-exports using the `export type` syntax. These are erased at compile time and produce no runtime JavaScript. They allow consumers to type-annotate variables and function parameters without importing runtime code.

- **`PumpFunStats`** - Interface describing the statistics shape returned by `usePumpFun`.
- **`PumpFunClaimsStats`** - Interface describing the statistics shape returned by `usePumpFunClaims`.
- **`PumpFunProviderOptions`** - Configuration options interface for `PumpFunProvider` constructor.
- **`UnifiedEvent`** - Normalized event interface combining events from all data sources.
- **`AggregateStats`** - Extended statistics interface with per-category counts and unified event arrays.
- **`UseProvidersOptions`** - Options interface for the `useProviders` hook.
- **`UseProvidersReturn`** - Return type interface for the `useProviders` hook.

## Exported Members Summary

| Export | Kind | Description |
|---|---|---|
| `usePumpFun` | Hook | PumpPortal WebSocket hook for trades/launches |
| `usePumpFunClaims` | Hook | Solana RPC WebSocket hook for claims |
| `PumpFunProvider` | Class | Framework-agnostic PumpFun DataProvider |
| `MockProvider` | Class | Mock DataProvider for development |
| `useDataProvider` | Hook | Deprecated unified data aggregation hook |
| `useProviders` | Hook | Multi-provider management hook |
| `PumpFunStats` | Type | Stats shape from `usePumpFun` |
| `PumpFunClaimsStats` | Type | Stats shape from `usePumpFunClaims` |
| `PumpFunProviderOptions` | Type | Config options for `PumpFunProvider` |
| `UnifiedEvent` | Type | Normalized event interface |
| `AggregateStats` | Type | Extended aggregate statistics interface |
| `UseProvidersOptions` | Type | Options for `useProviders` |
| `UseProvidersReturn` | Type | Return type of `useProviders` |

## Usage Examples

```typescript
// Import hooks and classes
import {
  useProviders,
  PumpFunProvider,
  MockProvider,
} from '@web3viz/providers';

// Import types for annotation
import type {
  UseProvidersReturn,
  PumpFunProviderOptions,
} from '@web3viz/providers';
```
