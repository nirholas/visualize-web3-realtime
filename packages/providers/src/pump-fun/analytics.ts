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
import { PumpFunRestClient } from './pumpfun-rest';

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
  /** USD market cap from pump.fun REST API */
  usdMarketCap?: number;
  /** SOL market cap from pump.fun REST API */
  marketCap?: number;
  /** Whether the token graduated to Raydium */
  graduated?: boolean;
  /** Raydium pool address if graduated */
  raydiumPool?: string;
  /** Bonding curve progress 0–1 */
  bondingCurveProgress?: number;
  /** Number of comments/replies on pump.fun */
  replyCount?: number;
  /** King of the hill timestamp */
  kingOfTheHillTimestamp?: number;
  /** Token creator address */
  creator?: string;
  /** Token creation timestamp from pump.fun */
  createdTimestamp?: number;
  /** Total token supply */
  totalSupply?: number;
  /** Whether flagged NSFW on pump.fun */
  nsfw?: boolean;
  fetchedAt: number;
}

/**
 * Fetches and caches token metadata from the pump.fun REST API.
 * Uses the official `frontend-api-v3.pump.fun/coins/{mint}` endpoint
 * which returns image, description, social links, bonding curve state,
 * market cap in USD, graduation status, and more.
 */
export class TokenMetadataEnricher {
  private restClient = new PumpFunRestClient();
  private metaCache = new BoundedMap<string, TokenMetadata>(5_000);

  /**
   * Queue a metadata fetch for a token via the pump.fun REST API.
   * Returns immediately — metadata will be available via get() after fetch.
   */
  enqueue(mint: string, _uri?: string): void {
    if (!mint) return;
    this.restClient.enqueue(mint);
  }

  get(mint: string): TokenMetadata | undefined {
    // Check if REST client has fresh data we haven't converted yet
    const coin = this.restClient.get(mint);
    if (coin && !this.metaCache.has(mint)) {
      const meta: TokenMetadata = {
        mint,
        imageUrl: coin.imageUri || undefined,
        description: coin.description ? coin.description.slice(0, 500) : undefined,
        twitter: coin.twitter || undefined,
        telegram: coin.telegram || undefined,
        website: coin.website || undefined,
        usdMarketCap: coin.usdMarketCap || undefined,
        marketCap: coin.marketCap || undefined,
        graduated: coin.complete,
        raydiumPool: coin.raydiumPool || undefined,
        bondingCurveProgress: coin.bondingCurveProgress,
        replyCount: coin.replyCount || undefined,
        kingOfTheHillTimestamp: coin.kingOfTheHillTimestamp || undefined,
        creator: coin.creator || undefined,
        createdTimestamp: coin.createdTimestamp || undefined,
        totalSupply: coin.totalSupply || undefined,
        nsfw: coin.nsfw || undefined,
        fetchedAt: Date.now(),
      };
      this.metaCache.set(mint, meta);
    }
    return this.metaCache.get(mint);
  }

  /**
   * Fetch coin data synchronously (returns a Promise).
   * Useful for on-demand lookups (e.g. user clicks a token).
   */
  async fetchCoin(mint: string): Promise<TokenMetadata | null> {
    const coin = await this.restClient.fetchCoin(mint);
    if (!coin) return null;
    const meta: TokenMetadata = {
      mint,
      imageUrl: coin.imageUri || undefined,
      description: coin.description ? coin.description.slice(0, 500) : undefined,
      twitter: coin.twitter || undefined,
      telegram: coin.telegram || undefined,
      website: coin.website || undefined,
      usdMarketCap: coin.usdMarketCap || undefined,
      marketCap: coin.marketCap || undefined,
      graduated: coin.complete,
      raydiumPool: coin.raydiumPool || undefined,
      bondingCurveProgress: coin.bondingCurveProgress,
      replyCount: coin.replyCount || undefined,
      kingOfTheHillTimestamp: coin.kingOfTheHillTimestamp || undefined,
      creator: coin.creator || undefined,
      createdTimestamp: coin.createdTimestamp || undefined,
      totalSupply: coin.totalSupply || undefined,
      nsfw: coin.nsfw || undefined,
      fetchedAt: Date.now(),
    };
    this.metaCache.set(mint, meta);
    return meta;
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
