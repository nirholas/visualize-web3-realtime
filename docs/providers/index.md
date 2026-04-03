# Provider Registration Entry Point

## File Information

| Property | Value |
|----------|-------|
| **File Path** | `providers/index.ts` |
| **Purpose** | Central registration hub that imports all data provider modules, triggering their self-registration with the `@web3viz/core` provider registry |
| **Directive** | `'use client'` -- marks this as a client-side module for Next.js App Router |
| **Module Type** | Side-effect-only barrel file |

---

## Module Dependencies

| Import | Source | Type | Description |
|--------|--------|------|-------------|
| `'./ethereum'` | `providers/ethereum/index.ts` | Side-effect import | Importing this file causes the Ethereum provider to self-register via `registerProvider()` |

### Commented-out Future Imports

The following imports are commented out and mapped to planned implementation tasks:

| Import | Task | Description |
|--------|------|-------------|
| `'./solana-pumpfun'` | Task 23 | Solana PumpFun token launch and trade provider |
| `'./base'` | Task 25 | Base L2 transaction provider |
| `'./agents'` | Task 26 | AI agent event provider |
| `'./erc8004'` | Task 27 | ERC-8004 standard provider |
| `'./cex-volume'` | Task 28 | Centralized exchange volume provider |

---

## Line-by-Line Documentation

### Line 1: Client Directive
```typescript
'use client';
```
Next.js App Router directive. This file must run in the browser because the providers it imports establish WebSocket connections that require the browser `WebSocket` API.

### Lines 3-12: Module Documentation Block
```typescript
/**
 * Provider registration entry point.
 * Import this file once in the app layout/page to register all providers.
 * Each provider self-registers via registerProvider() from @web3viz/core.
 *
 * To add a new provider:
 * 1. Create a provider module in providers/<name>/
 * 2. Import it here
 * 3. That's it — useDataProvider discovers it automatically
 */
```
JSDoc comment explaining the purpose of this file and the convention for adding new providers. The architecture follows a self-registration pattern where each provider module calls `registerProvider()` as a side effect of being imported.

### Lines 14-20: Provider Imports
```typescript
// Register providers (each file calls registerProvider internally)
// import './solana-pumpfun';   // ← Task 23 will add this
import './ethereum';          // ← Task 24
// import './base';              // ← Task 25
// import './agents';            // ← Task 26
// import './erc8004';           // ← Task 27
// import './cex-volume';        // ← Task 28
```
Side-effect imports that trigger provider registration. Only Ethereum is currently active. Each commented line references a task number from the project's task tracking system.

### Line 22: Empty Export
```typescript
export {};
```
Empty export statement. This is required to make the file a valid ES module (rather than a script). Without this, TypeScript would treat the file as a script with global scope, which could cause declaration conflicts. Since the file's purpose is purely side-effect imports, there are no meaningful exports.

---

## Exported Members

| Export | Type | Description |
|--------|------|-------------|
| `{}` | Empty object | No named exports; the module exists solely for its import side effects |

---

## Data Flow

```
App Layout / Page
    │
    └── import 'providers/index.ts'
            │
            ├── import './ethereum'
            │       └── calls registerProvider(ethereumProvider)
            │               └── Provider added to @web3viz/core registry
            │
            ├── (future) import './solana-pumpfun'
            ├── (future) import './base'
            ├── (future) import './agents'
            ├── (future) import './erc8004'
            └── (future) import './cex-volume'
```

---

## Usage Example

```typescript
// In app/layout.tsx or app/page.tsx — import once at the top level
import '../providers';

// After this import, all registered providers are discoverable via:
import { useDataProvider } from '@web3viz/core';

function MyComponent() {
  const { providers } = useDataProvider();
  // providers now contains the registered EthereumProvider instance
}
```

---

## Architecture Notes

- **Self-Registration Pattern**: Each provider module instantiates its own provider class and calls `registerProvider()` from `@web3viz/core` as a module-level side effect. This decouples provider implementation from the registration mechanism.
- **Discovery**: Consumer code uses `useDataProvider()` from `@web3viz/core` to discover all registered providers without needing to know which specific providers exist.
- **Scalability**: Adding a new provider requires only two steps: (1) create the provider module, (2) add an import line to this file.
