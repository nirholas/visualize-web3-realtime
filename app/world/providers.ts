'use client';

import { PumpFunProvider, MockProvider, AgentProvider, CexVolumeProvider } from '@web3viz/providers';

// ---------------------------------------------------------------------------
// Data Provider Registration
//
// To add a new real-time data source:
//
// 1. Create a class implementing DataProvider from @web3viz/core
//    (see PumpFunProvider and MockProvider for reference patterns)
//
// 2. Your provider must declare:
//    - id, name, sourceConfig, categories
//    - connect() / disconnect() for WebSocket/API lifecycle
//    - onEvent(cb) to emit DataProviderEvent objects
//    - getStats() returning DataProviderStats
//    - getConnections() returning ConnectionState[]
//
// 3. Add your provider instance to this array:
//    new MyChainProvider({ wsUrl: '...' }),
//
// Your provider's categories will automatically appear in the filter sidebar,
// events will appear in the LiveFeed, and stats will aggregate into the dashboard.
// ---------------------------------------------------------------------------

export const providers = [
  new PumpFunProvider({
    rpcWsUrl: process.env.NEXT_PUBLIC_SOLANA_WS_URL || undefined,
  }),
  new CexVolumeProvider(),
  new AgentProvider(),
];
