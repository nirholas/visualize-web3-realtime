/**
 * PumpFun REST API client.
 *
 * Uses the official pump.fun frontend-api-v3 to fetch coin metadata,
 * bonding-curve state, market cap, and social links for any token by mint.
 *
 * Responses are cached in a BoundedMap and fetches are rate-limited.
 */

import { BoundedMap, BoundedSet, isObject, getString, getNumber, getBoolean } from '../shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PumpFunCoinResponse {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  imageUri: string;
  metadataUri: string;
  twitter: string;
  telegram: string;
  website: string;
  showName: boolean;
  creator: string;
  createdTimestamp: number;
  usdMarketCap: number;
  marketCap: number;
  /** Whether the token has graduated (bonded to Raydium) */
  complete: boolean;
  /** Raydium pool address, present when graduated */
  raydiumPool: string;
  /** Virtual SOL reserves in the bonding curve */
  virtualSolReserves: number;
  /** Virtual token reserves in the bonding curve */
  virtualTokenReserves: number;
  /** Real SOL reserves */
  realSolReserves: number;
  /** Real token reserves */
  realTokenReserves: number;
  totalSupply: number;
  bondingCurve: string;
  associatedBondingCurve: string;
  kingOfTheHillTimestamp: number;
  replyCount: number;
  /** Computed bonding curve progress 0–1 */
  bondingCurveProgress: number;
  /** Whether the token is flagged as NSFW */
  nsfw: boolean;
  /** Whether the token was launched from a mobile device */
  isMobile: boolean;
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

const INITIAL_VIRTUAL_TOKEN_RESERVES = 1_073_000_000;
const GRADUATION_TOKEN_THRESHOLD = 200_000_000;
const GRADUATION_RANGE = INITIAL_VIRTUAL_TOKEN_RESERVES - GRADUATION_TOKEN_THRESHOLD;

function parseCoinResponse(raw: Record<string, unknown>): PumpFunCoinResponse {
  const virtualTokenReserves = getNumber(raw, 'virtual_token_reserves', 0);
  const tokensSold = INITIAL_VIRTUAL_TOKEN_RESERVES - virtualTokenReserves;
  const bondingCurveProgress = Math.max(0, Math.min(1, tokensSold / GRADUATION_RANGE));

  return {
    mint: getString(raw, 'mint'),
    name: getString(raw, 'name'),
    symbol: getString(raw, 'symbol'),
    description: getString(raw, 'description'),
    imageUri: getString(raw, 'image_uri'),
    metadataUri: getString(raw, 'metadata_uri'),
    twitter: getString(raw, 'twitter'),
    telegram: getString(raw, 'telegram'),
    website: getString(raw, 'website'),
    showName: getBoolean(raw, 'show_name'),
    creator: getString(raw, 'creator'),
    createdTimestamp: getNumber(raw, 'created_timestamp', 0),
    usdMarketCap: getNumber(raw, 'usd_market_cap', 0),
    marketCap: getNumber(raw, 'market_cap', 0),
    complete: getBoolean(raw, 'complete'),
    raydiumPool: getString(raw, 'raydium_pool'),
    virtualSolReserves: getNumber(raw, 'virtual_sol_reserves', 0),
    virtualTokenReserves,
    realSolReserves: getNumber(raw, 'real_sol_reserves', 0),
    realTokenReserves: getNumber(raw, 'real_token_reserves', 0),
    totalSupply: getNumber(raw, 'total_supply', 0),
    bondingCurve: getString(raw, 'bonding_curve'),
    associatedBondingCurve: getString(raw, 'associated_bonding_curve'),
    kingOfTheHillTimestamp: getNumber(raw, 'king_of_the_hill_timestamp', 0),
    replyCount: getNumber(raw, 'reply_count', 0),
    bondingCurveProgress,
    nsfw: getBoolean(raw, 'nsfw'),
    isMobile: getBoolean(raw, 'is_mobile', false),
  };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const BASE_URL = 'https://frontend-api-v3.pump.fun';

export interface PumpFunRestClientOptions {
  /** Max cached coin responses (default 5000) */
  maxCacheSize?: number;
  /** Min ms between fetches for the same mint (default 60_000) */
  cacheTtlMs?: number;
  /** Concurrent fetch limit (default 3) */
  concurrency?: number;
  /** Delay between batches in ms (default 300) */
  batchDelayMs?: number;
  /** Per-request timeout in ms (default 5000) */
  requestTimeoutMs?: number;
}

export class PumpFunRestClient {
  private cache = new BoundedMap<string, PumpFunCoinResponse>(5_000);
  private fetchTimestamps = new BoundedMap<string, number>(5_000);
  private pending = new BoundedSet<string>(1_000);
  private fetchQueue: string[] = [];
  private processing = false;
  private cacheTtlMs: number;
  private concurrency: number;
  private batchDelayMs: number;
  private requestTimeoutMs: number;

  constructor(options: PumpFunRestClientOptions = {}) {
    if (options.maxCacheSize) {
      this.cache = new BoundedMap<string, PumpFunCoinResponse>(options.maxCacheSize);
      this.fetchTimestamps = new BoundedMap<string, number>(options.maxCacheSize);
    }
    this.cacheTtlMs = options.cacheTtlMs ?? 60_000;
    this.concurrency = options.concurrency ?? 3;
    this.batchDelayMs = options.batchDelayMs ?? 300;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 5_000;
  }

  /**
   * Get a cached coin response, or undefined if not yet fetched.
   */
  get(mint: string): PumpFunCoinResponse | undefined {
    return this.cache.get(mint);
  }

  /**
   * Queue a coin for background fetching. Non-blocking.
   * If the mint is already cached and within TTL, it won't re-fetch.
   */
  enqueue(mint: string): void {
    if (!mint || this.pending.has(mint)) return;
    const lastFetch = this.fetchTimestamps.get(mint);
    if (lastFetch && Date.now() - lastFetch < this.cacheTtlMs) return;
    this.pending.add(mint);
    this.fetchQueue.push(mint);
    this.processBatch();
  }

  /**
   * Fetch a single coin synchronously (returns a Promise).
   * Uses cache if available and within TTL.
   */
  async fetchCoin(mint: string): Promise<PumpFunCoinResponse | null> {
    const lastFetch = this.fetchTimestamps.get(mint);
    if (lastFetch && Date.now() - lastFetch < this.cacheTtlMs) {
      return this.cache.get(mint) ?? null;
    }
    return this.doFetch(mint);
  }

  private async processBatch(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.fetchQueue.length > 0) {
      const batch = this.fetchQueue.splice(0, this.concurrency);
      await Promise.allSettled(batch.map((mint) => this.doFetch(mint)));
      if (this.fetchQueue.length > 0) {
        await new Promise((r) => setTimeout(r, this.batchDelayMs));
      }
    }

    this.processing = false;
  }

  private async doFetch(mint: string): Promise<PumpFunCoinResponse | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

      const url = `${BASE_URL}/coins/${encodeURIComponent(mint)}`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return null;
      }

      const json: unknown = await res.json();
      if (!isObject(json)) return null;

      const coin = parseCoinResponse(json);
      this.cache.set(mint, coin);
      this.fetchTimestamps.set(mint, Date.now());
      return coin;
    } catch {
      // Network/timeout errors — best-effort
      return null;
    } finally {
      this.pending.delete(mint);
    }
  }
}
