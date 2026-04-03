import type {
  DataProvider,
  DataProviderEvent,
  DataProviderStats,
  ConnectionState,
  CategoryConfig,
  SourceConfig,
  RawEvent,
} from '@web3viz/core';
import { getCategoriesForSource } from '@web3viz/core';

// ============================================================================
// Mock Data Provider — generates fake data for development / testing
// ============================================================================

const MOCK_TOKENS = [
  { mint: 'mock1aaa', name: 'MockDog', symbol: 'MDOG' },
  { mint: 'mock2bbb', name: 'TestCoin', symbol: 'TEST' },
  { mint: 'mock3ccc', name: 'AIAgent', symbol: 'AGENT' },
  { mint: 'mock4ddd', name: 'DeFiYield', symbol: 'DEFI' },
  { mint: 'mock5eee', name: 'MemeKing', symbol: 'MEME' },
  { mint: 'mock6fff', name: 'SolBot', symbol: 'SBOT' },
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
  private totalVolumeSol = 0;

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
    return {
      totalTokens: this.totalTokens,
      totalTrades: this.totalTrades,
      totalClaims: this.totalClaims,
      totalVolumeSol: this.totalVolumeSol,
      pumpFunConnected: true,
      claimsConnected: true,
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
      const mint = `${token.mint}-${Date.now()}`;
      this.totalTokens++;

      this.emitEvent({
        id: `mock-${++idCounter}`,
        category: isAgent ? 'agentLaunches' : 'launches',
        source: 'mock',
        timestamp: Date.now(),
        label: token.symbol,
        address: wallet,
        mint,
      });

      this.emitRaw({
        type: 'tokenCreate',
        data: {
          mint,
          name: token.name,
          symbol: token.symbol,
          uri: '',
          traderPublicKey: wallet,
          initialBuy: Math.random() * 1000000,
          marketCapSol: Math.random() * 100,
          signature: `sig-${Date.now()}`,
          timestamp: Date.now(),
          isAgent,
        },
      });
    } else if (rand < 0.8) {
      const token = randomEl(MOCK_TOKENS);
      const solAmount = Math.random() * 10;
      const wallet = randomEl(MOCK_WALLETS);
      this.totalTrades++;
      this.totalVolumeSol += solAmount;

      this.emitEvent({
        id: `mock-${++idCounter}`,
        category: 'trades',
        source: 'mock',
        timestamp: Date.now(),
        label: token.symbol,
        amount: solAmount,
        address: wallet,
        mint: token.mint,
        meta: { txType: Math.random() > 0.5 ? 'buy' : 'sell' },
      });

      this.emitRaw({
        type: 'trade',
        data: {
          mint: token.mint,
          signature: `sig-${Date.now()}`,
          traderPublicKey: wallet,
          txType: Math.random() > 0.5 ? 'buy' : 'sell',
          tokenAmount: Math.random() * 100000,
          solAmount: solAmount * 1e9,
          newTokenBalance: Math.random() * 500000,
          bondingCurveKey: 'bonding-curve-mock',
          vTokensInBondingCurve: Math.random() * 10000000,
          vSolInBondingCurve: Math.random() * 1000,
          marketCapSol: Math.random() * 200,
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
      this.totalVolumeSol += solAmount;

      this.emitEvent({
        id: `mock-${++idCounter}`,
        category: 'claimsWallet',
        source: 'mock',
        timestamp: Date.now(),
        label: 'Wallet Claim',
        address: wallet,
        meta: { solAmount },
      });

      this.emitRaw({
        type: 'claim',
        data: {
          wallet,
          mint: token.mint,
          solAmount,
          tokenAmount: Math.random() * 100000,
          signature: `sig-${Date.now()}`,
          slot: Math.floor(Math.random() * 300000000),
          timestamp: Date.now(),
        },
      });
    }
  }
}
