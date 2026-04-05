# Task 40: X402 End-to-End Testing & Polish

## Context
Tasks 32-39 built the complete x402 payment protocol stack. This final task ties everything together with end-to-end verification, error handling, and polish.

## What to Build

### 1. End-to-End Flow Verification

Manually test the complete flow and fix any integration issues:

1. **Discovery:** `GET /.well-known/x402-manifest.json` returns valid manifest
2. **Pricing:** `GET /api/premium/pricing` returns tiers and resources
3. **402 Challenge:** `GET /api/premium/feed` without auth returns 402 with challenge body, correct headers (`X-402-Version`, `X-402-Manifest`, `Link`)
4. **Wallet Connect:** Click "Connect Wallet" → MetaMask popup → address shown in WalletButton
5. **Wrong Network:** If wallet is on wrong chain → "Switch to Base" button works
6. **Payment:** Click "Pay" on Basic tier → MetaMask confirms USDC transfer → tx submitted
7. **Verification:** Server verifies tx on-chain → session created → cookie set
8. **Access:** Subsequent requests to `/api/premium/feed` return SSE stream
9. **Session Badge:** Shows "BASIC · 59m" with countdown
10. **Provider Unlock:** Ethereum and Base providers become visible in sidebar
11. **Expiry:** After session expires, requests return 402 again
12. **Re-payment:** Can pay again to renew session

### 2. Error Handling Improvements

Add graceful error handling for every failure mode:

**Wallet errors:**
- No wallet extension installed → Show "Install MetaMask" link
- User rejects connection → Show "Connection rejected" with retry
- User rejects transaction → Show "Transaction cancelled" with retry

**Payment errors:**
- Insufficient USDC balance → Show "Insufficient balance" with link to USDC faucet (testnet)
- Transaction reverts → Show "Transaction failed" with tx link
- Network congestion → Show "Waiting for confirmation..." with spinner

**Verification errors:**
- Proof validation fails → Show reason from server
- Session expired during use → Auto-show paywall with "Session expired" message
- Server unreachable → Show "Server unavailable" with retry

**Rate limiting:**
- Show a subtle "Rate limited" indicator when events are being throttled
- Show "Connection limit reached" if max connections exceeded

### 3. Loading States

Ensure all async operations have proper loading indicators:
- Wallet connecting: spinner in WalletButton
- Payment pending: spinner + "Confirming..." in PaywallOverlay
- Session checking: skeleton state for SessionBadge
- Provider loading: existing loading patterns from other providers

### 4. Testnet Faucet Link

Since we're on Base Sepolia, add a helper for users to get test USDC:
- Add a small "Get test USDC" link in the PaywallOverlay footer
- Link to Base Sepolia faucet or USDC faucet URL

### 5. Keyboard Accessibility

- PaywallOverlay: close on Escape, trap focus within
- WalletButton: keyboard navigable
- Tier cards: selectable via keyboard (arrow keys + Enter)

### 6. Mobile Responsiveness

- PaywallOverlay: tier cards stack vertically on narrow screens
- WalletButton: show just icon on mobile, full text on desktop
- SessionBadge: abbreviate tier name on mobile

### 7. Clean Up & Code Quality

- Ensure all `lib/x402/` files have JSDoc on exported functions
- Ensure all components have proper TypeScript prop types (no `any`)
- Remove any `console.log` debugging statements
- Ensure no unused imports or dead code in x402 files
- Verify barrel exports in `features/X402Flow/index.ts` include all components

### 8. Environment Documentation

Update `.env.example` with the complete set of x402 env vars and comments:

```env
# ─── X402 Payment Protocol ───────────────────────────────────
# Network RPC (Base Sepolia testnet)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Recipient wallet address for payments
# IMPORTANT: Set to a real address before deploying to production
X402_PAY_TO_ADDRESS=0x0000000000000000000000000000000000000000

# Session encryption secret
X402_SESSION_SECRET=change-me-in-production

# Public app URL (used in manifest)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Files to Modify
- `features/X402Flow/PaywallOverlay.tsx` — Error states, loading, faucet link, keyboard a11y
- `features/X402Flow/WalletButton.tsx` — Error states, mobile, keyboard
- `features/X402Flow/SessionBadge.tsx` — Mobile, skeleton loading
- `features/X402Flow/PaymentReceipt.tsx` — Error display
- `hooks/useWallet.ts` — Error handling for all wallet failure modes
- `hooks/useX402Payment.ts` — Error handling, auto-show paywall on expiry
- `lib/x402/middleware.ts` — Edge case error responses
- `.env.example` — Complete documentation

## Acceptance Criteria
- [ ] Full payment flow works end-to-end (wallet → pay → verify → access → expiry)
- [ ] All error states show user-friendly messages with recovery actions
- [ ] Loading spinners appear during wallet connection, payment, and verification
- [ ] PaywallOverlay is keyboard accessible (Escape to close, focus trap)
- [ ] Tier cards are responsive on mobile screens
- [ ] "Get test USDC" link is present for testnet
- [ ] No `console.log` in production code, no `any` types in x402 files
- [ ] `.env.example` documents all x402 environment variables
- [ ] Session expiry automatically re-shows the paywall
- [ ] All x402 components and hooks are exported from their barrel files
