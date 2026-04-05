# Task 35: Premium API Endpoints

## Context
Tasks 32-34 built the types, verification, and middleware. Now we create the actual premium API endpoints that are gated behind x402 payment. These endpoints serve enhanced data feeds that the visualization consumes.

Existing API routes pattern (Next.js app router):
- `app/api/executor/route.ts` — GET/POST proxy
- `app/api/world-chat/route.ts` — POST with Anthropic SDK

The existing data flow for the visualization is WebSocket-based (providers connect directly from the client). The premium API adds server-side endpoints that aggregate, enrich, and serve data with higher throughput.

## What to Build

### 1. Premium Feed Endpoint (`app/api/premium/feed/route.ts` — NEW)

Server-Sent Events (SSE) endpoint that streams real-time events from all enabled providers at the caller's tier rate.

```typescript
import { withX402 } from '@/lib/x402/middleware';
import { X402_TIERS } from '@/lib/x402/config';

export const GET = withX402({ requiredTier: 'basic' }, async (req, session) => {
  const tierConfig = X402_TIERS[session.tier];

  // Return SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // 1. Subscribe to all providers the tier allows (tierConfig.allowedProviders)
      // 2. Aggregate events from providers into a merged stream
      // 3. Rate limit to tierConfig.maxEventsPerSecond
      // 4. Send each event as SSE: `data: ${JSON.stringify(event)}\n\n`
      // 5. Send heartbeat every 30s to keep connection alive
      // 6. Clean up on close
    },
    cancel() {
      // Unsubscribe from providers
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-402-Tier': session.tier,
    },
  });
});
```

### 2. Premium History Endpoint (`app/api/premium/history/route.ts` — NEW)

Returns historical event data (last N events, filterable by provider/type).

```typescript
export const GET = withX402({ requiredTier: 'premium' }, async (req, session) => {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider');   // optional filter
  const type = searchParams.get('type');           // optional filter
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
  const offset = parseInt(searchParams.get('offset') || '0');

  // Query from in-memory event buffer (or future DB)
  // Return paginated results
  return NextResponse.json({
    events: [...],
    total: 0,
    limit,
    offset,
    tier: session.tier,
  });
});
```

### 3. Premium Stats Endpoint (`app/api/premium/stats/route.ts` — NEW)

Returns aggregated statistics across all providers the caller's tier can access.

```typescript
export const GET = withX402({ requiredTier: 'basic' }, async (req, session) => {
  const tierConfig = X402_TIERS[session.tier];

  // Aggregate stats from allowed providers
  // Include: event counts, volume, top tokens, active agents, etc.
  return NextResponse.json({
    tier: session.tier,
    expiresAt: session.expiresAt,
    providers: { /* per-provider stats */ },
    totals: { /* merged stats */ },
  });
});
```

### 4. Session Info Endpoint (`app/api/premium/session/route.ts` — NEW)

Returns the caller's current session info (tier, expiry, usage).

```typescript
export const GET = withX402({ requiredTier: 'free' }, async (req, session) => {
  return NextResponse.json({
    sessionId: session.sessionId,
    tier: session.tier,
    address: session.address,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    requestCount: session.requestCount,
  });
});
```

### 5. Event Buffer (`lib/x402/event-buffer.ts` — NEW)

An in-memory ring buffer that stores the last N events for the history endpoint:

```typescript
export class EventBuffer<T> {
  private buffer: T[];
  private head = 0;
  private size = 0;

  constructor(private capacity: number = 10000) {
    this.buffer = new Array(capacity);
  }

  push(event: T): void { /* ring buffer insert */ }
  query(filter?: (e: T) => boolean, limit?: number, offset?: number): T[] { /* filtered retrieval */ }
  get total(): number { return this.size; }
}

export const globalEventBuffer = new EventBuffer(10000);
```

Wire this into the provider system so events are buffered as they arrive.

### 6. Pricing Info Endpoint (`app/api/premium/pricing/route.ts` — NEW)

Public endpoint (no payment required) that returns available tiers and pricing:

```typescript
export async function GET() {
  return NextResponse.json({
    version: '1',
    network: 'base-sepolia',
    asset: 'USDC',
    tiers: X402_TIERS,
    resources: X402_RESOURCES,
    manifestUrl: '/.well-known/x402-manifest.json',
  });
}
```

## Files to Create
- `app/api/premium/feed/route.ts` — **NEW** — SSE premium data feed
- `app/api/premium/history/route.ts` — **NEW** — Historical event data
- `app/api/premium/stats/route.ts` — **NEW** — Aggregated statistics
- `app/api/premium/session/route.ts` — **NEW** — Session info
- `app/api/premium/pricing/route.ts` — **NEW** — Public pricing info
- `lib/x402/event-buffer.ts` — **NEW** — Ring buffer for event history

## Files to Modify
- None (providers will be wired in Task 38)

## Acceptance Criteria
- [ ] `/api/premium/pricing` returns tier and resource info without authentication
- [ ] `/api/premium/feed` returns 402 when accessed without payment
- [ ] `/api/premium/feed` returns SSE stream when accessed with valid session
- [ ] `/api/premium/history` returns paginated event data for premium tier
- [ ] `/api/premium/stats` returns aggregated provider stats
- [ ] `/api/premium/session` returns current session details
- [ ] `EventBuffer` correctly implements ring buffer with filtered queries
- [ ] All routes compile and respond with proper Content-Type headers
