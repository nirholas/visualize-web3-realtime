import type { X402NetworkConfig, X402TierConfig, X402Resource } from '@web3viz/core';

// ---------------------------------------------------------------------------
// Network configurations
// ---------------------------------------------------------------------------

export const X402_NETWORKS: Record<string, X402NetworkConfig> = {
  'base-sepolia': {
    network: 'base-sepolia',
    chainId: 84532,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    explorerUrl: 'https://sepolia.basescan.org',
  },
};

// ---------------------------------------------------------------------------
// Payment recipient
// ---------------------------------------------------------------------------

export const X402_PAY_TO = process.env.X402_PAY_TO_ADDRESS || '0x0000000000000000000000000000000000000000';

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------

export const X402_TIERS: Record<string, X402TierConfig> = {
  free: {
    tier: 'free',
    amount: '0',
    windowMs: 0,
    maxEventsPerSecond: 2,
    allowedProviders: ['pumpfun'],
    historicalAccess: false,
    maxConnections: 1,
  },
  basic: {
    tier: 'basic',
    amount: '100000',   // $0.10 USDC
    windowMs: 3600000,  // 1 hour
    maxEventsPerSecond: 10,
    allowedProviders: ['pumpfun', 'ethereum', 'base'],
    historicalAccess: false,
    maxConnections: 2,
  },
  premium: {
    tier: 'premium',
    amount: '1000000',  // $1.00 USDC
    windowMs: 86400000, // 24 hours
    maxEventsPerSecond: 50,
    allowedProviders: ['pumpfun', 'ethereum', 'base', 'agents', 'cex'],
    historicalAccess: true,
    maxConnections: 5,
  },
};

// ---------------------------------------------------------------------------
// Protected resources
// ---------------------------------------------------------------------------

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
