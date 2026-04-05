# Task 39: Update X402 Manifest & Discovery

## Context
The static `public/.well-known/x402-manifest.json` currently has a single placeholder entry with a null `payTo` address. Now that all premium endpoints exist (Tasks 35) and tiers are defined (Task 32), we need to update the manifest to declare all resources and serve it dynamically so it stays in sync with the config.

## What to Build

### 1. Dynamic Manifest Route (`app/.well-known/x402-manifest.json/route.ts` — NEW)

Replace the static manifest with a dynamic API route that generates it from the config:

```typescript
import { X402_RESOURCES, X402_PAY_TO, X402_NETWORKS } from '@/lib/x402/config';

export async function GET() {
  const manifest = {
    $schema: 'https://x402.org/schema/manifest.json',
    version: '1',
    info: {
      name: 'Visualize Web3 Realtime',
      description: 'Real-time visualization of Web3 network activity',
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://visualize-web3.app',
    },
    accepts: X402_RESOURCES.map(r => ({
      scheme: r.scheme,
      network: r.network,
      asset: r.asset,
      maxAmountRequired: r.amount,
      resource: r.resource,
      description: r.description,
      payTo: r.payTo,
    })),
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
```

### 2. Delete Static Manifest

Remove the old static file `public/.well-known/x402-manifest.json` since the dynamic route now handles it.

### 3. Update Config Resources (`lib/x402/config.ts`)

Ensure `X402_RESOURCES` declares all premium endpoints from Task 35:

```typescript
export const X402_RESOURCES: X402Resource[] = [
  {
    resource: '/api/premium/feed',
    description: 'Real-time premium data feed with all providers',
    scheme: 'exact',
    network: 'base-sepolia',
    asset: 'USDC',
    amount: '100000',    // $0.10 — Basic tier
    payTo: X402_PAY_TO,
  },
  {
    resource: '/api/premium/stats',
    description: 'Aggregated cross-provider statistics',
    scheme: 'exact',
    network: 'base-sepolia',
    asset: 'USDC',
    amount: '100000',    // $0.10 — Basic tier
    payTo: X402_PAY_TO,
  },
  {
    resource: '/api/premium/history',
    description: 'Historical event data and analytics',
    scheme: 'exact',
    network: 'base-sepolia',
    asset: 'USDC',
    amount: '1000000',   // $1.00 — Premium tier
    payTo: X402_PAY_TO,
  },
];
```

### 4. CORS Headers for Discovery

The manifest must be accessible cross-origin so external x402 clients can discover it. The dynamic route should include:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, OPTIONS`
- Handle OPTIONS preflight requests

### 5. Link Header in 402 Responses

Update `lib/x402/response.ts` to include a `Link` header pointing to the manifest:

```typescript
headers: {
  ...existing,
  'Link': '</.well-known/x402-manifest.json>; rel="payment-manifest"',
}
```

### 6. Update `payTo` Address

Update `.env.example` and document that `X402_PAY_TO_ADDRESS` must be set to a real wallet address before deploying. For local development, it can remain the null address.

## Files to Create
- `app/.well-known/x402-manifest.json/route.ts` — **NEW** — Dynamic manifest endpoint

## Files to Modify
- `lib/x402/config.ts` — Ensure all resources are declared
- `lib/x402/response.ts` — Add `Link` header to 402 responses
- `.env.example` — Document `X402_PAY_TO_ADDRESS` and `NEXT_PUBLIC_APP_URL`

## Files to Delete
- `public/.well-known/x402-manifest.json` — Replaced by dynamic route

## Acceptance Criteria
- [ ] `GET /.well-known/x402-manifest.json` returns dynamically generated manifest
- [ ] Manifest includes all premium resources with correct amounts
- [ ] CORS headers allow cross-origin access to the manifest
- [ ] 402 responses include `Link` header to manifest
- [ ] Static `public/.well-known/x402-manifest.json` is removed
- [ ] `payTo` address is sourced from environment variable
- [ ] Manifest `$schema` and `version` fields are correct per x402 spec
