import type { DataProvider, DataProviderEvent, DataProviderStats } from '@web3viz/core';

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

export class MockProvider implements DataProvider {
  private listeners: Array<(event: DataProviderEvent) => void> = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private paused = false;
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
    this.paused = paused;
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

  onEvent(listener: (event: DataProviderEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: DataProviderEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private tick(): void {
    if (this.paused) return;

    const rand = Math.random();

    if (rand < 0.2) {
      // Create new token
      const token = randomEl(MOCK_TOKENS);
      this.totalTokens++;
      this.emit({
        type: 'tokenCreate',
        data: {
          mint: `${token.mint}-${Date.now()}`,
          name: token.name,
          symbol: token.symbol,
          uri: '',
          traderPublicKey: randomEl(MOCK_WALLETS),
          initialBuy: Math.random() * 1000000,
          marketCapSol: Math.random() * 100,
          signature: `sig-${Date.now()}`,
          timestamp: Date.now(),
          isAgent: token.symbol === 'AGENT' || token.symbol === 'SBOT',
        },
      });
    } else if (rand < 0.8) {
      // Trade
      const token = randomEl(MOCK_TOKENS);
      const solAmount = Math.random() * 10;
      this.totalTrades++;
      this.totalVolumeSol += solAmount;
      this.emit({
        type: 'trade',
        data: {
          mint: token.mint,
          signature: `sig-${Date.now()}`,
          traderPublicKey: randomEl(MOCK_WALLETS),
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
      // Claim
      const token = randomEl(MOCK_TOKENS);
      const solAmount = Math.random() * 5;
      this.totalClaims++;
      this.totalVolumeSol += solAmount;
      this.emit({
        type: 'claim',
        data: {
          wallet: randomEl(MOCK_WALLETS),
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
