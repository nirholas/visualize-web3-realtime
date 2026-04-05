/**
 * PumpFun Analytics — derived data signals
 *
 * Computes from existing trade/token data:
 * - Bonding curve progress (% toward graduation)
 * - Whale wallet detection (large holders)
 * - Sniper bot detection (same-block buys after creation)
 * - Token metadata enrichment (image, description, social links)
 */

import type { DataProviderEvent } from '@web3viz/core';
import { BoundedMap, BoundedSet } from '../shared';

// ---------------------------------------------------------------------------
// Bonding Curve Progress
// ---------------------------------------------------------------------------

const INITIAL_VIRTUAL_TOKEN_RESERVES = 1_073_000_000;
const GRADUATION_TOKEN_THRESHOLD = 200_000_000;
const GRADUATION_RANGE = INITIAL_VIRTUAL_TOKEN_RESERVES - GRADUATION_TOKEN_THRESHOLD;

export interface BondingCurveState {
  mint: string;
  progress: number; // 0–1
  vTokens: number;
  vSol: number;
  graduated: boolean;
}

export class BondingCurveTracker {
  private curves = new BoundedMap<string, BondingCurveState>(10_000);

  update(mint: string, vTokens: number, vSol: number): BondingCurveState {
    const tokensSold = INITIAL_VIRTUAL_TOKEN_RESERVES - vTokens;
    const progress = Math.max(0, Math.min(1, tokensSold / GRADUATION_RANGE));
    const graduated = vTokens <= GRADUATION_TOKEN_THRESHOLD;

    const state: BondingCurveState = { mint, progress, vTokens, vSol, graduated };
    this.curves.set(mint, state);
    return state;
  }

  get(mint: string): BondingCurveState | undefined {
    return this.curves.get(mint);
  }
}

// ---------------------------------------------------------------------------
// Whale Wallet Detection
// ---------------------------------------------------------------------------

const WHALE_SOL_THRESHOLD = 50;

interface WalletProfile {
  address: string;
  totalVolumeSol: number;
  tradeCount: number;
  firstSeen: number;
  lastSeen: number;
  tokenCount: number;
  isWhale: boolean;
}

export class WhaleTracker {
  private wallets = new BoundedMap<string, WalletProfile>(50_000);
  private walletTokens = new BoundedMap<string, BoundedSet<string>>(50_000);
  readonly whales = new BoundedSet<string>(10_000);

  recordTrade(
    address: string,
    solAmount: number,
    mint: string,
    now: number,
  ): { isWhale: boolean; justBecameWhale: boolean } {
    let profile = this.wallets.get(address);
    const wasWhale = profile?.isWhale ?? false;

    // Track unique tokens per wallet
    let tokens = this.walletTokens.get(address);
    if (!tokens) {
      tokens = new BoundedSet<string>(500);
      this.walletTokens.set(address, tokens);
    }
    tokens.add(mint);

    if (profile) {
      profile.totalVolumeSol += solAmount;
      profile.tradeCount++;
      profile.lastSeen = now;
      profile.tokenCount = tokens.size;
    } else {
      profile = {
        address,
        totalVolumeSol: solAmount,
        tradeCount: 1,
        firstSeen: now,
        lastSeen: now,
        tokenCount: 1,
        isWhale: false,
      };
      this.wallets.set(address, profile);
    }

    profile.isWhale = profile.totalVolumeSol >= WHALE_SOL_THRESHOLD;
    if (profile.isWhale) this.whales.add(address);

    return { isWhale: profile.isWhale, justBecameWhale: profile.isWhale && !wasWhale };
  }

  isWhale(address: string): boolean {
    return this.whales.has(address);
  }

  getWhaleCount(): number {
    return this.whales.size;
  }
}

// ---------------------------------------------------------------------------
// Sniper Bot Detection
// ---------------------------------------------------------------------------

const SNIPER_WINDOW_MS = 3_000;

export interface SniperHit {
  trader: string;
  mint: string;
  delayMs: number;
  timestamp: number;
}

export class SniperDetector {
  private creationTimes = new BoundedMap<string, number>(20_000);
  private sniperScores = new BoundedMap<string, number>(50_000);
  readonly confirmedSnipers = new BoundedSet<string>(10_000);

  recordTokenCreation(mint: string, timestamp: number): void {
    this.creationTimes.set(mint, timestamp);
  }

  checkTrade(trader: string, mint: string, txType: string, timestamp: number): SniperHit | null {
    if (txType !== 'buy') return null;
    const createdAt = this.creationTimes.get(mint);
    if (createdAt === undefined) return null;
    const delayMs = timestamp - createdAt;
    if (delayMs < 0 || delayMs > SNIPER_WINDOW_MS) return null;

    const hit: SniperHit = { trader, mint, delayMs, timestamp };
    const score = (this.sniperScores.get(trader) || 0) + 1;
    this.sniperScores.set(trader, score);
    if (score >= 3) this.confirmedSnipers.add(trader);

    return hit;
  }

  isSniper(address: string): boolean {
    return this.confirmedSnipers.has(address);
  }

  getSniperCount(): number {
    return this.confirmedSnipers.size;
  }
}

// ---------------------------------------------------------------------------
// Token Metadata Enrichment
// ---------------------------------------------------------------------------

export interface TokenMetadata {
  mint: string;
  imageUrl?: string;
  description?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  fetchedAt: number;
}

/**
 * Fetches and caches token metadata from PumpFun's metadata URI.
 * PumpPortal token create messages include a `uri` field pointing to
 * an IPFS/Arweave JSON with image, description, and social links.
 */
export class TokenMetadataEnricher {
  private cache = new BoundedMap<string, TokenMetadata>(5_000);
  private pending = new BoundedSet<string>(1_000);
  private fetchQueue: Array<{ mint: string; uri: string }> = [];
  private processing = false;
  private batchSize = 5;
  private batchDelayMs = 500;

  /**
   * Queue a metadata fetch for a newly created token.
   * Returns immediately — metadata will be available via get() after fetch.
   */
  enqueue(mint: string, uri: string): void {
    if (!uri || this.cache.has(mint) || this.pending.has(mint)) return;
    this.pending.add(mint);
    this.fetchQueue.push({ mint, uri });
    this.processBatch();
  }

  get(mint: string): TokenMetadata | undefined {
    return this.cache.get(mint);
  }

  private async processBatch(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.fetchQueue.length > 0) {
      const batch = this.fetchQueue.splice(0, this.batchSize);
      await Promise.allSettled(
        batch.map(({ mint, uri }) => this.fetchMetadata(mint, uri)),
      );
      // Rate-limit: wait between batches
      if (this.fetchQueue.length > 0) {
        await new Promise((r) => setTimeout(r, this.batchDelayMs));
      }
    }

    this.processing = false;
  }

  private async fetchMetadata(mint: string, uri: string): Promise<void> {
    try {
      // Validate URI before fetching - only allow https and ipfs gateway URLs
      if (!uri.startsWith('https://')) {
        this.pending.delete(mint);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(uri, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        this.pending.delete(mint);
        return;
      }

      const json = await res.json() as Record<string, unknown>;
      const meta: TokenMetadata = {
        mint,
        imageUrl: typeof json.image === 'string' ? json.image : undefined,
        description: typeof json.description === 'string' ? json.description.slice(0, 500) : undefined,
        twitter: typeof json.twitter === 'string' ? json.twitter : undefined,
        telegram: typeof json.telegram === 'string' ? json.telegram : undefined,
        website: typeof json.website === 'string' ? json.website : undefined,
        fetchedAt: Date.now(),
      };

      this.cache.set(mint, meta);
    } catch {
      // Silently fail — metadata is best-effort enrichment
    } finally {
      this.pending.delete(mint);
    }
  }
}

// ---------------------------------------------------------------------------
// Event generator helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
function generateAnalyticsId(): string {
  return `a${(++_idCounter).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function makeBondingCurveEvent(state: BondingCurveState, symbol: string): DataProviderEvent {
  return {
    id: generateAnalyticsId(),
    providerId: 'pumpfun',
    category: 'bondingCurve',
    chain: 'solana',
    timestamp: Date.now(),
    label: state.graduated
      ? `${symbol} graduated!`
      : `${symbol} ${(state.progress * 100).toFixed(0)}% bonded`,
    amount: state.vSol,
    nativeSymbol: 'SOL',
    address: state.mint,
    tokenAddress: state.mint,
    meta: { progress: state.progress, graduated: state.graduated },
  };
}

export function makeWhaleEvent(
  address: string,
  solAmount: number,
  mint: string,
  symbol: string,
): DataProviderEvent {
  return {
    id: generateAnalyticsId(),
    providerId: 'pumpfun',
    category: 'whales',
    chain: 'solana',
    timestamp: Date.now(),
    label: `${address.slice(0, 6)}… whale trade on ${symbol}`,
    amount: solAmount,
    nativeSymbol: 'SOL',
    address,
    tokenAddress: mint,
    meta: { isWhale: true },
  };
}

export function makeSniperEvent(
  trader: string,
  mint: string,
  delayMs: number,
  symbol: string,
): DataProviderEvent {
  return {
    id: generateAnalyticsId(),
    providerId: 'pumpfun',
    category: 'snipers',
    chain: 'solana',
    timestamp: Date.now(),
    label: `${trader.slice(0, 6)}… sniped ${symbol} in ${delayMs}ms`,
    amount: 0,
    nativeSymbol: 'SOL',
    address: trader,
    tokenAddress: mint,
    meta: { delayMs, isSniper: true },
  };
}
