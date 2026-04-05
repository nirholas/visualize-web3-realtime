// ============================================================================
// swarming-plugin-mock — Synthetic data for testing and demos
//
// Generates fake token launches and trades at a configurable rate.
// Perfect for development, testing, and demo environments.
// ============================================================================

import { definePlugin } from '../plugin';

export interface MockPluginConfig {
  /** Interval between events in ms (default: 500) */
  intervalMs?: number;
  /** Number of hub tokens to simulate (default: 5) */
  numTokens?: number;
  /** Chain name to use (default: 'mock') */
  chain?: string;
}

const MOCK_TOKENS = [
  { symbol: 'ALPHA', name: 'Alpha Protocol' },
  { symbol: 'BETA', name: 'Beta Network' },
  { symbol: 'GAMMA', name: 'Gamma Finance' },
  { symbol: 'DELTA', name: 'Delta DAO' },
  { symbol: 'OMEGA', name: 'Omega Labs' },
  { symbol: 'SIGMA', name: 'Sigma Chain' },
  { symbol: 'THETA', name: 'Theta Swap' },
  { symbol: 'ZETA', name: 'Zeta Bridge' },
];

function randomAddress(): string {
  const chars = '0123456789abcdef';
  let addr = '0x';
  for (let i = 0; i < 40; i++) addr += chars[Math.floor(Math.random() * 16)];
  return addr;
}

export const mockPlugin = definePlugin({
  name: 'swarming-plugin-mock',
  type: 'source',
  meta: {
    description: 'Synthetic data generator for testing and demos',
    author: 'swarming',
    icon: '🧪',
    tags: ['mock', 'testing', 'demo', 'development'],
  },
  config: {
    intervalMs: { type: 'number', label: 'Event Interval (ms)', default: 500 },
    numTokens: { type: 'number', label: 'Number of Tokens', default: 5 },
    chain: { type: 'string', label: 'Chain Name', default: 'mock' },
  },
  sourceConfig: {
    id: 'mock',
    label: 'Mock Data',
    color: '#a78bfa',
    icon: '🧪',
    description: 'Synthetic data for testing',
  },
  categories: [
    { id: 'mockLaunches', label: 'Mock Launches', icon: '⚡', color: '#a78bfa', sourceId: 'mock' },
    { id: 'mockTrades', label: 'Mock Trades', icon: '▲', color: '#60a5fa', sourceId: 'mock' },
  ],
  createProvider: {
    connect(config: MockPluginConfig, emit: (event: Record<string, unknown>) => void) {
      const interval = config.intervalMs ?? 500;
      const numTokens = Math.min(config.numTokens ?? 5, MOCK_TOKENS.length);
      const chain = config.chain ?? 'mock';

      // Generate stable token addresses
      const tokens = MOCK_TOKENS.slice(0, numTokens).map((t) => ({
        ...t,
        address: randomAddress(),
      }));

      // Emit initial launches
      tokens.forEach((token) => {
        emit({
          id: `mock-launch-${token.address}`,
          providerId: 'mock',
          category: 'mockLaunches',
          chain,
          timestamp: Date.now(),
          label: `${token.name} (${token.symbol})`,
          address: token.address,
          tokenAddress: token.address,
          nativeSymbol: 'MOCK',
        });
      });

      // Emit periodic trades
      let counter = 0;
      const timer = setInterval(() => {
        const token = tokens[Math.floor(Math.random() * tokens.length)];
        const isBuy = Math.random() > 0.4;
        const amount = Math.random() * 10;
        counter++;

        emit({
          id: `mock-trade-${counter}`,
          providerId: 'mock',
          category: 'mockTrades',
          chain,
          timestamp: Date.now(),
          label: `${isBuy ? 'Buy' : 'Sell'} ${token.symbol}`,
          address: randomAddress(),
          tokenAddress: token.address,
          amount,
          nativeSymbol: 'MOCK',
        });
      }, interval);

      return () => clearInterval(timer);
    },

    getHubs(config) {
      const numTokens = Math.min(config.numTokens ?? 5, MOCK_TOKENS.length);
      return MOCK_TOKENS.slice(0, numTokens).map((t) => ({
        tokenAddress: randomAddress(),
        symbol: t.symbol,
        name: t.name,
        chain: config.chain ?? 'mock',
        trades: Math.floor(Math.random() * 100),
        volume: Math.random() * 1000,
        nativeSymbol: 'MOCK',
      }));
    },
  },
});
