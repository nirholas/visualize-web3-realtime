# Task 34: X402 API Middleware

## Context
Tasks 32-33 built the type system and verification logic. Now we need Next.js middleware that intercepts API requests, checks for a valid x402 payment proof or active session, and returns proper HTTP 402 responses when payment is required.

The x402 protocol works like this:
1. Client requests a protected resource
2. Server checks for `X-402-Payment` header (base64-encoded JSON proof) or a session cookie
3. If no valid proof/session → respond with HTTP 402 + `X402Challenge` body
4. If valid proof → verify on-chain, create session, proceed with request
5. If active session → proceed with request

Existing API routes:
- `app/api/executor/route.ts` — Proxy to executor backend
- `app/api/world-chat/route.ts` — AI chat endpoint
- New premium routes will be added in Task 35

## What to Build

### 1. X402 Middleware Helper (`lib/x402/middleware.ts` — NEW)

Create a reusable middleware function that can wrap any Next.js API route handler:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import type { X402Challenge, X402Tier } from '@web3viz/core';
import { x402PaymentProofSchema } from '@web3viz/core';
import { verifyPayment } from './verify';
import { sessionStore } from './sessions';
import { X402_RESOURCES, X402_TIERS } from './config';

/**
 * Options for the x402 middleware
 */
interface X402MiddlewareOptions {
  /** Minimum tier required for this route */
  requiredTier: X402Tier;
  /** Override the resource path (defaults to request pathname) */
  resource?: string;
}

/**
 * Wraps a Next.js route handler with x402 payment enforcement.
 * 
 * Usage in a route:
 *   export const GET = withX402({ requiredTier: 'basic' }, async (req, session) => {
 *     return NextResponse.json({ data: '...' });
 *   });
 */
export function withX402(
  options: X402MiddlewareOptions,
  handler: (req: NextRequest, session: X402Session) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    // 1. Check for existing session via cookie or Authorization header
    // 2. If no session, check for X-402-Payment header
    // 3. If payment header exists, parse (base64 JSON), validate with Zod, verify on-chain
    // 4. If verification passes, create session, set cookie, call handler
    // 5. If no payment proof, return 402 challenge response
  };
}
```

### 2. HTTP 402 Response Builder (`lib/x402/response.ts` — NEW)

```typescript
import { NextResponse } from 'next/server';
import type { X402Challenge, X402Resource } from '@web3viz/core';

/**
 * Build a proper HTTP 402 Payment Required response per the x402 spec.
 * 
 * Response includes:
 * - Status: 402
 * - Header: X-402-Version: 1
 * - Header: X-402-Manifest: /.well-known/x402-manifest.json
 * - Header: Content-Type: application/json
 * - Body: X402Challenge JSON
 */
export function createPaymentRequiredResponse(resource: X402Resource): NextResponse {
  const challenge: X402Challenge = {
    version: '1',
    resource,
    manifestUrl: '/.well-known/x402-manifest.json',
    message: `Payment required: ${resource.description}. Send ${resource.amount} ${resource.asset} on ${resource.network} to ${resource.payTo}`,
  };

  return new NextResponse(JSON.stringify(challenge), {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      'X-402-Version': '1',
      'X-402-Manifest': '/.well-known/x402-manifest.json',
    },
  });
}
```

### 3. Session Cookie Handling

The middleware should:
- On successful payment verification, set a cookie: `x402_session=<sessionId>` with `HttpOnly`, `Secure`, `SameSite=Strict`, and an expiry matching the session's `expiresAt`
- On subsequent requests, read the cookie and look up the session in `sessionStore`
- Also support `Authorization: Bearer <sessionId>` header as an alternative (for API clients)

### 4. Request Logging

Add a simple request counter per session. The `sessionStore.recordRequest()` method (from Task 33) should be called on every successful authenticated request. This enables rate limiting in Task 38.

### 5. Free Tier Pass-through

If `requiredTier` is `'free'`, the middleware should allow the request without payment but still attach a free-tier session (create one lazily by IP/fingerprint). This lets the handler know the caller's tier for rate limiting.

## Files to Create
- `lib/x402/middleware.ts` — **NEW** — `withX402()` route wrapper
- `lib/x402/response.ts` — **NEW** — HTTP 402 response builder

## Files to Modify
- None yet (premium routes come in Task 35)

## Acceptance Criteria
- [ ] `withX402()` correctly returns 402 with challenge body when no payment proof is present
- [ ] Valid payment proof in `X-402-Payment` header is parsed, verified, and creates a session
- [ ] Session cookie is set on successful payment and read on subsequent requests
- [ ] `Authorization: Bearer <sessionId>` header works as an alternative to cookies
- [ ] Free tier requests pass through without payment
- [ ] 402 response includes correct `X-402-Version` and `X-402-Manifest` headers
- [ ] All code compiles with `tsc --noEmit`
