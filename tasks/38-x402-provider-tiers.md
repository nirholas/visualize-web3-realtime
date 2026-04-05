# Task 38: Provider-Level Access Control & Rate Limiting

## Context
Tasks 32-37 built the full x402 stack — types, verification, middleware, API, wallet, and UI. Now we wire provider access to the tier system so the visualization actually enforces payment tiers.

Currently, all providers (PumpFun, Ethereum, Base, Agents, CEX) stream data freely to any client. After this task:
- Free tier: only PumpFun at 2 events/sec
- Basic tier: PumpFun + Ethereum + Base at 10 events/sec
- Premium tier: all providers at 50 events/sec + historical data

The provider system lives in:
- `packages/core/src/providers/` — `DataProvider` interface, registry
- `packages/providers/src/` — Individual provider implementations
- `hooks/useAgentProvider.ts`, `packages/providers/src/useProviders.ts` — Client-side provider consumption

## What to Build

### 1. Client-Side Provider Gating (`lib/x402/provider-gate.ts` — NEW)

A function that filters which providers are available based on the current session tier:

```typescript
import type { X402Tier, X402TierConfig } from '@web3viz/core';
import { X402_TIERS } from './config';

/**
 * Given the user's current tier, return the list of allowed provider IDs.
 */
export function getAllowedProviders(tier: X402Tier): string[] {
  return X402_TIERS[tier].allowedProviders;
}

/**
 * Check if a specific provider is allowed for a tier.
 */
export function isProviderAllowed(providerId: string, tier: X402Tier): boolean {
  return X402_TIERS[tier].allowedProviders.includes(providerId);
}

/**
 * Get rate limit (events per second) for a tier.
 */
export function getEventRateLimit(tier: X402Tier): number {
  return X402_TIERS[tier].maxEventsPerSecond;
}
```

### 2. Event Rate Limiter (`lib/x402/rate-limiter.ts` — NEW)

A client-side token bucket rate limiter that controls how fast events flow into the visualization:

```typescript
export class EventRateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,     // events per second
    private refillRate: number,    // tokens per ms (maxTokens / 1000)
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /** Try to consume a token. Returns true if allowed, false if rate limited. */
  tryConsume(): boolean { /* token bucket logic */ }

  /** Update rate limit (e.g. when tier changes) */
  setRate(eventsPerSecond: number): void { /* reconfigure */ }
}
```

### 3. Integrate with `useProviders` Hook

Modify the provider consumption layer to respect tier access:

In `packages/providers/src/useProviders.ts` (or wherever providers are consumed):
- Accept the current tier from x402 context
- Filter out providers not in `allowedProviders` for the current tier
- Apply `EventRateLimiter` to throttle event throughput
- Show a lock icon / "Upgrade" prompt for gated providers in the sidebar

### 4. Sidebar Provider Lock UI

In the filter sidebar (`features/World/` or protocol filter component):
- Providers outside the current tier should show as locked (greyed out with lock icon)
- Clicking a locked provider opens the `PaywallOverlay` with the relevant tier highlighted
- Use the `showPaywall()` from `X402Provider` context

### 5. Server-Side Rate Limiting

In the premium API middleware (`lib/x402/middleware.ts`):
- Track request count per session per minute
- If a session exceeds its tier's rate limit on the `/api/premium/feed` SSE endpoint:
  - Slow down event emission (server-side throttle)
  - Include `X-402-RateLimit-Remaining` and `X-402-RateLimit-Reset` headers

### 6. Connection Limits

Enforce `maxConnections` from tier config:
- Track active SSE connections per session in `sessionStore`
- If a session tries to open more connections than allowed, return 429 Too Many Requests
- Include `Retry-After` header

## Files to Create
- `lib/x402/provider-gate.ts` — **NEW** — Provider access filtering
- `lib/x402/rate-limiter.ts` — **NEW** — Token bucket rate limiter

## Files to Modify
- `packages/providers/src/useProviders.ts` — Add tier-based filtering
- `lib/x402/middleware.ts` — Add server-side rate limiting and connection tracking
- `lib/x402/sessions.ts` — Track active connections per session
- Filter sidebar component — Add lock icon for gated providers

## Acceptance Criteria
- [ ] Free tier users only see PumpFun events in the visualization
- [ ] Basic tier users see PumpFun + Ethereum + Base events
- [ ] Premium tier users see all provider events
- [ ] Event rate is throttled per tier (2/10/50 events per second)
- [ ] Locked providers appear greyed out with lock icon in sidebar
- [ ] Clicking a locked provider opens paywall overlay
- [ ] Server-side SSE rate limiting works with proper headers
- [ ] Connection limits are enforced per session
- [ ] Upgrading tier immediately unlocks new providers (no page reload)
