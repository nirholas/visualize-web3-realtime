# Task 37: X402 Payment Flow UI Components

## Context
Tasks 32-36 built the full backend and client-side payment logic. Now we create the UI components that let users see what's gated, connect their wallet, make a payment, and view their session status.

The project's UI conventions:
- Feature folders under `features/` (e.g. `features/World/`, `features/Agents/`)
- Design system in `packages/ui/` with `Button`, `Pill`, `Badge`, `Dialog`, `Input`
- Tailwind CSS + Framer Motion for animations
- Dark theme: `#0a0a12` bg, `#d8d8e8` text, accent colors from design tokens
- IBM Plex Mono monospace font
- Existing components: `FloatingPanel`, `InfoPopover`, `JourneyOverlay` for reference on overlay patterns

## What to Build

### 1. Feature Folder (`features/X402Flow/` — NEW)

Create the x402 UI as its own feature folder.

### 2. PaywallOverlay (`features/X402Flow/PaywallOverlay.tsx` — NEW)

A full-screen semi-transparent overlay shown when a user tries to access premium content without payment. Follows the existing `JourneyOverlay` pattern.

```
┌─────────────────────────────────────────────┐
│                                             │
│            🔒 Premium Access                │
│                                             │
│   Real-time feeds from all providers        │
│   Historical data & analytics               │
│   Up to 50 events/sec                       │
│                                             │
│   ┌─────────┐  ┌──────────┐  ┌──────────┐  │
│   │  Free   │  │  Basic   │  │ Premium  │  │
│   │  $0.00  │  │  $0.10   │  │  $1.00   │  │
│   │ 2 evt/s │  │ 10 evt/s │  │ 50 evt/s │  │
│   │ PumpFun │  │ +ETH,Base│  │ All+Hist │  │
│   │         │  │  1 hour  │  │ 24 hours │  │
│   │ [Active]│  │  [Pay]   │  │  [Pay]   │  │
│   └─────────┘  └──────────┘  └──────────┘  │
│                                             │
│   Powered by x402 · Base Sepolia · USDC     │
│                                             │
└─────────────────────────────────────────────┘
```

Props:
```typescript
interface PaywallOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Which resource triggered the paywall */
  resource?: string;
}
```

Features:
- Tier cards showing price, rate limits, and included providers
- "Pay" button on each tier triggers `useX402Payment().pay()`
- Shows wallet connection state (connected address or "Connect Wallet" button)
- Framer Motion `AnimatePresence` for enter/exit
- Loading spinner during payment
- Success checkmark animation on payment confirmation
- Error state with retry

### 3. WalletButton (`features/X402Flow/WalletButton.tsx` — NEW)

Compact button for the header/stats bar showing wallet connection state:

```
Disconnected:  [Connect Wallet]
Connecting:    [Connecting...]
Connected:     [0x1234...abcd ▾]  (truncated address, click to disconnect)
Wrong Network: [Switch to Base ⚠]
```

Uses `useWallet()` hook. Style consistent with existing `Button` from `packages/ui/`.

### 4. SessionBadge (`features/X402Flow/SessionBadge.tsx` — NEW)

A small badge/pill shown in the stats bar indicating current tier and time remaining:

```
Free tier:    [FREE]           (gray)
Basic tier:   [BASIC · 47m]   (blue, countdown)
Premium tier: [PREMIUM · 23h] (gold, countdown)
Expired:      [EXPIRED]       (red)
```

Uses `useX402Payment()` hook. Style consistent with existing `Badge`/`Pill` from `packages/ui/`.

### 5. PaymentReceipt (`features/X402Flow/PaymentReceipt.tsx` — NEW)

Shown after successful payment (inline in the PaywallOverlay or as a toast):

```
✓ Payment confirmed
  Tx: 0xabc1...ef23  [View on BaseScan ↗]
  Tier: Premium
  Expires: in 24 hours
  [Continue →]
```

### 6. X402Provider (`features/X402Flow/X402Provider.tsx` — NEW)

React context that wraps the app and provides x402 state to all components:

```typescript
interface X402Context {
  wallet: ReturnType<typeof useWallet>;
  payment: ReturnType<typeof useX402Payment>;
  showPaywall: (resource?: string) => void;
  hidePaywall: () => void;
  isPaywallOpen: boolean;
}

export function X402Provider({ children }: { children: React.ReactNode }) {
  // Manages paywall visibility state
  // Provides wallet + payment hooks via context
  // Renders <PaywallOverlay /> at the top level
}
```

### 7. Integration Points

Add `WalletButton` and `SessionBadge` to the existing UI:
- `features/World/desktop/Taskbar.tsx` or equivalent header — add `WalletButton` 
- Stats bar area — add `SessionBadge`

Wrap the app layout with `X402Provider`:
- `app/layout.tsx` — wrap children with `<X402Provider>`

## Files to Create
- `features/X402Flow/PaywallOverlay.tsx` — **NEW** — Tier selection + payment overlay
- `features/X402Flow/WalletButton.tsx` — **NEW** — Wallet connect/disconnect button
- `features/X402Flow/SessionBadge.tsx` — **NEW** — Tier + expiry badge
- `features/X402Flow/PaymentReceipt.tsx` — **NEW** — Post-payment confirmation
- `features/X402Flow/X402Provider.tsx` — **NEW** — React context provider
- `features/X402Flow/index.ts` — **NEW** — Barrel export

## Files to Modify
- `app/layout.tsx` — Wrap with `<X402Provider>`
- Stats bar / header component — Add `WalletButton` and `SessionBadge`

## Acceptance Criteria
- [ ] `PaywallOverlay` renders with tier cards, prices, and pay buttons
- [ ] Clicking "Pay" connects wallet (if needed) and initiates USDC payment
- [ ] Payment success shows `PaymentReceipt` with tx link to BaseScan
- [ ] `WalletButton` shows connect/disconnect/switch states correctly
- [ ] `SessionBadge` shows current tier with live countdown
- [ ] `X402Provider` context is accessible from any component
- [ ] All animations use Framer Motion and feel consistent with existing overlays
- [ ] Components are SSR-safe (no `window` access during server render)
- [ ] Dark theme styling matches existing design system
