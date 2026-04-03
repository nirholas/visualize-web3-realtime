# Task 29: Make All UI Components Provider-Aware and Dynamic

## Goal
Update every UI component in `features/World/` to work with the generic, multi-provider data system. Remove all PumpFun-specific hardcoding. Components should dynamically adapt to whatever providers are registered — if only Binance is active, the UI shows CEX data; if all 6 providers are active, it shows everything.

## Prerequisites
- Tasks 21-23 must be complete (core types, registry hook, PumpFun refactored)
- At least PumpFun provider (Task 23) should be working

## Context

### Current State
Components import PumpFun-specific types and constants:
- `import type { TopToken, TraderEdge } from '@/hooks/usePumpFun'`
- `import { CATEGORY_CONFIG_MAP } from '@/hooks/useDataProvider'`
- Hardcoded `'SOL'` currency labels
- `connected.pumpFun` / `connected.claims` status checks
- `stats.totalVolumeSol` for volume display
- `stats.rawPumpFunEvents` for live feed

### Target State
All components:
- Import types from `@web3viz/core` only
- Receive dynamic category configs as props (not static imports)
- Display multi-chain volume (SOL + ETH + USD)
- Show N connection status indicators dynamically
- Handle events with `nativeSymbol` for proper currency formatting
- Gracefully handle zero providers or one provider

## Files to Modify

### 1. `app/world/page.tsx` (WorldPage)

This is the main orchestrator. Key changes:

**Imports:**
```typescript
// Remove:
import { useDataProvider, CATEGORY_CONFIGS } from '@/hooks/useDataProvider';
import type { ForceGraphHandle } from '@/features/World/ForceGraph';

// Replace with:
import { useDataProvider } from '@/hooks/useDataProvider';
import '@/providers'; // Register all providers
```

**Data destructuring:**
```typescript
const {
  stats,
  filteredEvents,
  enabledCategories,
  toggleCategory,
  connections,        // Record<string, boolean> — dynamic connection states
  allCategories,      // CategoryConfig[] — from all providers
  categoryConfigMap,  // Record<string, CategoryConfig>
} = useDataProvider({ paused: !isPlaying });
```

**Connection status indicators:**
Replace the hardcoded PumpFun/Claims dots with a dynamic loop:
```tsx
{Object.entries(connections).map(([name, isConnected]) => (
  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: isConnected ? '#34d399' : '#ef4444',
    }} />
    <span style={{ fontSize: 10, opacity: 0.6 }}>{name}</span>
  </div>
))}
```

**Volume display:**
Replace `stats.totalVolumeSol` with multi-chain volume:
```typescript
// Format all volumes
function formatVolumes(totalVolume: Record<string, number>): string {
  const parts: string[] = [];
  for (const [chain, vol] of Object.entries(totalVolume)) {
    if (vol === 0) continue;
    const symbol = chain === 'cex' ? '$' : chain === 'solana' ? 'SOL' : 'ETH';
    const prefix = chain === 'cex' ? '$' : '';
    parts.push(`${prefix}${formatStat(vol)} ${symbol}`);
  }
  return parts.join(' · ') || '0';
}
```

**Category sidebar:**
Pass `allCategories` and `categoryConfigMap` to `ProtocolFilterSidebar` instead of top tokens. The sidebar should show category toggles, not just tokens.

Actually — keep both. The left sidebar can have two sections:
1. **Category filters** (toggleable by category) — uses `allCategories`
2. **Top tokens** (clickable to focus graph) — uses `stats.topTokens`

**Props passed to children:**
- `LiveFeed`: pass `categoryConfigMap` as prop, remove static import
- `StatsBar`: pass `stats.totalVolume` instead of `stats.totalVolumeSol`
- `ForceGraph`: already receives `topTokens` and `traderEdges` as props — just ensure types match

### 2. `features/World/LiveFeed.tsx`

**Remove static imports:**
```typescript
// Remove:
import type { PumpFunEvent } from '@/hooks/usePumpFun';
import { CATEGORY_CONFIG_MAP } from '@/hooks/useDataProvider';
```

**Accept via props:**
```typescript
interface LiveFeedProps {
  events: DataProviderEvent[];
  categoryConfigMap: Record<string, CategoryConfig>;
  // ... existing props
}
```

**Currency formatting:**
Replace the `formatSol` helper with a generic `formatAmount`:
```typescript
function formatAmount(amount: number, symbol?: string): string {
  const s = symbol || '';
  const prefix = s === 'USD' || s === '$' ? '$' : '';
  const suffix = prefix ? '' : ` ${s}`;
  
  if (amount < 0.001) return `${prefix}<0.001${suffix}`;
  if (amount >= 1_000_000) return `${prefix}${(amount / 1_000_000).toFixed(1)}M${suffix}`;
  if (amount >= 1000) return `${prefix}${(amount / 1000).toFixed(1)}k${suffix}`;
  if (amount >= 1) return `${prefix}${amount.toFixed(2)}${suffix}`;
  return `${prefix}${amount.toFixed(3)}${suffix}`;
}
```

In `UnifiedCard`, use `event.nativeSymbol` for formatting:
```typescript
const amount = event.amount != null
  ? formatAmount(event.amount, event.nativeSymbol)
  : event.amountUsd != null
    ? formatAmount(event.amountUsd, 'USD')
    : '';
```

**Chain badge:**
Optionally add a small chain indicator to each event card:
```typescript
const chainColors: Record<string, string> = {
  solana: '#9945FF',
  ethereum: '#627EEA',
  base: '#0052FF',
  cex: '#FFB300',
};

// In the card, add a small colored dot or label for the chain
<span style={{ 
  fontSize: 9, 
  color: chainColors[event.chain] || '#666',
  opacity: 0.7 
}}>
  {event.chain.toUpperCase()}
</span>
```

### 3. `features/World/StatsBar.tsx`

**Volume display:**
Replace the single SOL volume with multi-chain:
```typescript
interface StatsBarProps {
  // ... existing props
  totalVolume: Record<string, number>;  // replaces totalVolumeSol
  totalTransactions: number;
  totalAgents: number;
}
```

Show volume as separate stat pills or a combined display:
```
SOL: 123.4  |  ETH: 56.7  |  CEX: $12.3M  |  TXs: 45.6K
```

Or a single aggregated USD value if USD conversion is available.

**Remove PumpFun references:**
- No more `'SOL'` hardcoded
- `import type { ... } from '@/hooks/usePumpFun'` → remove

### 4. `features/World/ForceGraph.tsx`

**Import changes:**
```typescript
// Remove:
import type { TopToken, TraderEdge } from '@/hooks/usePumpFun';

// Replace with:
import type { TopToken, TraderEdge } from '@web3viz/core';
```

**Field name updates:**
- `token.mint` → `token.tokenAddress`
- `token.volumeSol` → `token.volume`
- `edge.mint` → `edge.tokenAddress`
- `edge.volumeSol` → `edge.volume`
- `hubMint` → `hubTokenAddress` (in ForceNode type)

**Chain-based coloring:**
Hub nodes should be colored by chain:
```typescript
const CHAIN_COLORS: Record<string, string> = {
  solana: '#9945FF',
  ethereum: '#627EEA',
  base: '#0052FF',
  cex: '#FFB300',
};

// When creating hub nodes, use chain color as base:
const hubColor = CHAIN_COLORS[token.chain] || COLOR_PALETTE[i % COLOR_PALETTE.length];
```

This gives visual distinction between chains in the graph.

**Multi-chain labels:**
When rendering `ProtocolLabel`, include the chain:
```typescript
label: `${token.symbol} (${token.chain})`
// or just show chain icon
```

### 5. `features/World/ProtocolFilterSidebar.tsx`

**Two-section design:**

The sidebar should now have two sections:

**Section 1: Category Filters (top)**
Show one button per category from `allCategories`. Each toggles that category on/off.
```typescript
interface CategoryFilterProps {
  categories: CategoryConfig[];
  enabledCategories: Set<string>;
  onToggle: (catId: string) => void;
}
```

Each button shows the category icon, colored circle, and tooltip with label.

**Section 2: Top Tokens (bottom)**
Keep the existing top-token buttons for graph focusing.
```typescript
interface TokenFilterProps {
  tokens: TopToken[];
  activeMint: string | null;  // rename to activeToken
  onToggle: (tokenAddress: string) => void;
}
```

Update `token.mint` → `token.tokenAddress` throughout.

**Combined sidebar:**
```tsx
<nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
  {/* Category toggles */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {categories.map(cat => (
      <CategoryButton key={cat.id} category={cat} enabled={enabledCategories.has(cat.id)} ... />
    ))}
  </div>
  
  {/* Divider */}
  <div style={{ height: 1, background: '#ddd', margin: '4px 0' }} />
  
  {/* Top tokens */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {tokens.map((token, i) => (
      <ProtocolButton key={token.tokenAddress} token={token} ... />
    ))}
  </div>
</nav>
```

### 6. `features/World/TimelineBar.tsx`

- If it imports PumpFun types, update to `@web3viz/core`
- No major changes expected unless it references PumpFun-specific data

### 7. `features/World/SharePanel.tsx` / `features/World/ShareOverlay.tsx`

- Update any `'SOL'` references to be dynamic
- Share text should mention "Web3 Visualization" not "PumpFun"

### 8. `features/World/constants.ts`

Add chain colors:
```typescript
export const CHAIN_COLORS: Record<string, string> = {
  solana: '#9945FF',
  ethereum: '#627EEA',
  base: '#0052FF',
  cex: '#FFB300',
  unknown: '#666666',
};
```

### 9. `features/World/InfoPopover.tsx` / `features/World/JourneyOverlay.tsx`

Update any text that says "PumpFun" to be generic ("Web3 data", "blockchain activity", etc.)

## Validation Checklist

After all changes:
1. `npx tsc --noEmit` passes with zero errors
2. Dev server starts without errors
3. With PumpFun provider only:
   - All existing functionality works
   - Live feed shows events with "SOLANA" chain badge
   - Volume shows as SOL
   - Categories show PumpFun categories
4. With all providers:
   - Multiple connection indicators
   - Events from all chains appear interleaved in live feed
   - Force graph shows hub nodes colored by chain
   - Category sidebar shows all categories across providers
   - Volume shows per-chain breakdown
   - Toggling categories filters events across all providers

## Important Notes
- Do NOT add new dependencies — use existing packages only
- Keep inline style approach (no CSS framework)
- IBM Plex Mono font throughout
- All provider-specific knowledge lives in the providers. UI components should be 100% generic.
- The `categoryConfigMap` prop pattern avoids static imports and makes components testable
- Maintain the existing visual design — this is a refactor, not a redesign
