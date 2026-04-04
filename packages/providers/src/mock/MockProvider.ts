import type {
  DataProvider,
  DataProviderEvent,
  DataProviderStats,
  ConnectionState,
  CategoryConfig,
  SourceConfig,
  RawEvent,
  TraderEdge,
} from '@web3viz/core';
import { getCategoriesForSource } from '@web3viz/core';

// ============================================================================
// Mock Data Provider — generates fake data for development / testing
// ============================================================================

const MOCK_TOKENS = [
  { tokenAddress: 'mock1aaa', name: 'MockDog', symbol: 'MDOG' },
  { tokenAddress: 'mock2bbb', name: 'TestCoin', symbol: 'TEST' },
  { tokenAddress: 'mock3ccc', name: 'AIAgent', symbol: 'AGENT' },
  { tokenAddress: 'mock4ddd', name: 'DeFiYield', symbol: 'DEFI' },
  { tokenAddress: 'mock5eee', name: 'MemeKing', symbol: 'MEME' },
  { tokenAddress: 'mock6fff', name: 'SolBot', symbol: 'SBOT' },
];

const MOCK_WALLETS = [
  'Wa11et1111111111111111111111111111111111111',
  'Wa11et2222222222222222222222222222222222222',
  'Wa11et3333333333333333333333333333333333333',
  'Wa11et4444444444444444444444444444444444444',
];

function randomEl<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let idCounter = 0;

export class MockProvider implements DataProvider {
  readonly id = 'mock';
  readonly name = 'Mock Provider';
  readonly chains = ['mock'];
  readonly sourceConfig: SourceConfig = {
    id: 'mock',
    label: 'Mock',
    color: '#a78bfa',
    icon: '\u2699',
    description: 'Simulated data for development',
  };
  readonly categories: CategoryConfig[] = getCategoriesForSource('pumpfun');

  private eventListeners: Array<(event: DataProviderEvent) => void> = [];
  private rawListeners: Array<(event: RawEvent) => void> = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private _paused = false;
  private _enabled = true;
  private totalTokens = 0;
  private totalTrades = 0;
  private totalClaims = 0;
  private totalVolume = 0;
  private tokenAcc = new Map<string, { name: string; symbol: string; volume: number; trades: number }>();
  private traderEdges: TraderEdge[] = [];

  constructor(private intervalMs = 500) {}

  connect(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), this.intervalMs);
  }

  disconnect(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setPaused(paused: boolean): void {
    this._paused = paused;
  }

  isPaused(): boolean {
    return this._paused;
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  getStats(): DataProviderStats {
    let topTokens = Array.from(this.tokenAcc.entries())
      .map(([addr, token]) => ({
        tokenAddress: addr,
        mint: addr,
        name: token.name,
        symbol: token.symbol,
        chain: 'mock',
        trades: token.trades,
        volume: token.volume,
        volumeSol: token.volume,
        nativeSymbol: 'SOL',
        source: 'mock',
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);

    // If no tokens yet, provide a starter token to ensure page loads
    if (topTokens.length === 0) {
      topTokens = [
        {
          tokenAddress: 'mock1aaa',
          mint: 'mock1aaa',
          name: 'MockDog',
          symbol: 'MDOG',
          chain: 'mock',
          trades: 0,
          volume: 0,
          volumeSol: 0,
          nativeSymbol: 'SOL',
          source: 'mock',
        },
      ];
    }

    return {
      counts: {
        tokens: this.totalTokens,
        trades: this.totalTrades,
        claims: this.totalClaims,
      },
      totalTransactions: this.totalTrades + this.totalClaims,
      totalAgents: 0,
      totalVolume: { mock: this.totalVolume },
      recentEvents: [],
      topTokens,
      traderEdges: this.traderEdges.slice(0, 5000),
      rawEvents: [],
    };
  }

  getConnections(): ConnectionState[] {
    return [{ name: 'Mock WebSocket', connected: this.intervalId !== null }];
  }

  onEvent(listener: (event: DataProviderEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  onRawEvent(listener: (event: RawEvent) => void): () => void {
    this.rawListeners.push(listener);
    return () => {
      this.rawListeners = this.rawListeners.filter((l) => l !== listener);
    };
  }

  private emitEvent(event: DataProviderEvent): void {
    for (const listener of this.eventListeners) listener(event);
  }

  private emitRaw(event: RawEvent): void {
    for (const listener of this.rawListeners) listener(event);
  }

  private tick(): void {
    if (this._paused || !this._enabled) return;

    const rand = Math.random();

    if (rand < 0.2) {
      const token = randomEl(MOCK_TOKENS);
      const isAgent = token.symbol === 'AGENT' || token.symbol === 'SBOT';
      const wallet = randomEl(MOCK_WALLETS);
      const tokenAddress = token.tokenAddress;
      this.totalTokens++;

      // Track token data
      if (!this.tokenAcc.has(tokenAddress)) {
        this.tokenAcc.set(tokenAddress, { name: token.name, symbol: token.symbol, volume: 0, trades: 0 });
      }

      this.emitEvent({
        id: `mock-${++idCounter}`,
        category: isAgent ? 'agentLaunches' : 'launches',
        providerId: 'mock',
        chain: 'mock',
        timestamp: Date.now(),
        label: token.symbol,
        address: wallet,
        tokenAddress,
      });

      this.emitRaw({
        type: 'tokenCreate',
        data: {
          tokenAddress,
          name: token.name,
          symbol: token.symbol,
          chain: 'solana',
          uri: '',
          creatorAddress: wallet,
          initialBuy: Math.random() * 1000000,
          marketCap: Math.random() * 100,
          nativeSymbol: 'SOL',
          signature: `sig-${Date.now()}`,
          timestamp: Date.now(),
          isAgent,
        },
      });
    } else if (rand < 0.8) {
      const token = randomEl(MOCK_TOKENS);
      const solAmount = Math.random() * 10;
      const wallet = randomEl(MOCK_WALLETS);
      const tokenAddress = token.tokenAddress;
      this.totalTrades++;
      this.totalVolume += solAmount;

      // Track token data
      const tokenData = this.tokenAcc.get(tokenAddress) || { name: token.name, symbol: token.symbol, volume: 0, trades: 0 };
      tokenData.trades++;
      tokenData.volume += solAmount;
      this.tokenAcc.set(tokenAddress, tokenData);

      // Track trader edge
      const edgeKey = `${wallet}:${tokenAddress}`;
      const edge = this.traderEdges.find((e) => `${e.trader}:${e.tokenAddress}` === edgeKey);
      if (edge) {
        edge.trades++;
        edge.volume += solAmount;
      } else {
        this.traderEdges.push({ trader: wallet, tokenAddress, mint: tokenAddress, chain: 'mock', trades: 1, volume: solAmount, volumeSol: solAmount, source: 'mock' });
      }

      this.emitEvent({
        id: `mock-${++idCounter}`,
        category: 'trades',
        providerId: 'mock',
        chain: 'mock',
        timestamp: Date.now(),
        label: token.symbol,
        amount: solAmount,
        address: wallet,
        tokenAddress,
        meta: { txType: Math.random() > 0.5 ? 'buy' : 'sell' },
      });

      this.emitRaw({
        type: 'trade',
        data: {
          tokenAddress,
          chain: 'solana',
          signature: `sig-${Date.now()}`,
          traderAddress: wallet,
          txType: Math.random() > 0.5 ? 'buy' : 'sell',
          tokenAmount: Math.random() * 100000,
          nativeAmount: solAmount * 1e9,
          nativeSymbol: 'SOL',
          marketCap: Math.random() * 200,
          timestamp: Date.now(),
          name: token.name,
          symbol: token.symbol,
        },
      });
    } else {
      const token = randomEl(MOCK_TOKENS);
      const solAmount = Math.random() * 5;
      const wallet = randomEl(MOCK_WALLETS);
      this.totalClaims++;
      this.totalVolume += solAmount;

      this.emitEvent({
        id: `mock-${++idCounter}`,
        category: 'claimsWallet',
        providerId: 'mock',
        chain: 'mock',
        timestamp: Date.now(),
        label: 'Wallet Claim',
        address: wallet,
        meta: { solAmount },
      });

      this.emitRaw({
        type: 'claim',
        data: {
          signature: `sig-${Date.now()}`,
          chain: 'solana',
          slot: Math.floor(Math.random() * 300000000),
          timestamp: Date.now(),
          claimType: 'wallet',
          programId: 'mock-program',
          claimer: wallet,
          isFirstClaim: false,
        },
      });
    }
  }
}
