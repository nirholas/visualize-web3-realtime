/**
 * PumpFun Analytics — derived data sources
 *
 * Computes signals from existing trade/token data:
 * - Bonding curve progress (% toward graduation)
 * - Whale wallet detection (large holders)
 * - Sniper bot detection (same-block buys after creation)
 * - Social clustering (wallets that trade together)
 */

import type { DataProviderEvent } from '@web3viz/core';

// ---------------------------------------------------------------------------
// Bonding Curve Progress
// ---------------------------------------------------------------------------

/**
 * PumpFun bonding curve starts with ~1073M virtual tokens and ~30 SOL virtual.
 * A token "graduates" when ~800M tokens have been sold from the curve
 * (i.e. vTokensInBondingCurve drops to ~200M).
 * We track progress as the % of tokens sold from the bonding curve.
 */
const INITIAL_VIRTUAL_TOKEN_RESERVES = 1_073_000_000;
const GRADUATION_TOKEN_THRESHOLD = 200_000_000; // tokens left when graduated
const GRADUATION_RANGE = INITIAL_VIRTUAL_TOKEN_RESERVES - GRADUATION_TOKEN_THRESHOLD;

export interface BondingCurveState {
  mint: string;
  progress: number; // 0–1
  vTokens: number;
  vSol: number;
  graduated: boolean;
}

export class BondingCurveTracker {
  private curves = new Map<string, BondingCurveState>();
  private maxEntries = 10_000;

  update(mint: string, vTokens: number, vSol: number): BondingCurveState {
    const tokensSold = INITIAL_VIRTUAL_TOKEN_RESERVES - vTokens;
    const progress = Math.max(0, Math.min(1, tokensSold / GRADUATION_RANGE));
    const graduated = vTokens <= GRADUATION_TOKEN_THRESHOLD;

    const state: BondingCurveState = { mint, progress, vTokens, vSol, graduated };
    this.curves.set(mint, state);

    // Evict oldest if over capacity
    if (this.curves.size > this.maxEntries) {
      const firstKey = this.curves.keys().next().value;
      if (firstKey) this.curves.delete(firstKey);
    }

    return state;
  }

  get(mint: string): BondingCurveState | undefined {
    return this.curves.get(mint);
  }

  getAll(): BondingCurveState[] {
    return Array.from(this.curves.values());
  }
}

// ---------------------------------------------------------------------------
// Whale Wallet Detection
// ---------------------------------------------------------------------------

/**
 * A "whale" is a wallet whose total SOL volume across all trades exceeds a
 * threshold within a rolling window. We track cumulative volume per wallet.
 */
const WHALE_SOL_THRESHOLD = 50; // SOL traded to be flagged as whale
const MAX_WALLETS = 50_000;

interface WalletProfile {
  address: string;
  totalVolumeSol: number;
  tradeCount: number;
  firstSeen: number;
  lastSeen: number;
  tokens: Set<string>; // unique mints traded
  isWhale: boolean;
}

export class WhaleTracker {
  private wallets = new Map<string, WalletProfile>();
  /** Set of addresses currently classified as whales */
  readonly whales = new Set<string>();

  recordTrade(
    address: string,
    solAmount: number,
    mint: string,
    now: number,
  ): { isWhale: boolean; justBecameWhale: boolean } {
    let profile = this.wallets.get(address);
    const wasWhale = profile?.isWhale ?? false;

    if (profile) {
      profile.totalVolumeSol += solAmount;
      profile.tradeCount++;
      profile.lastSeen = now;
      profile.tokens.add(mint);
    } else {
      profile = {
        address,
        totalVolumeSol: solAmount,
        tradeCount: 1,
        firstSeen: now,
        lastSeen: now,
        tokens: new Set([mint]),
        isWhale: false,
      };
      this.wallets.set(address, profile);

      // Evict oldest if over capacity
      if (this.wallets.size > MAX_WALLETS) {
        const firstKey = this.wallets.keys().next().value;
        if (firstKey) {
          this.whales.delete(firstKey);
          this.wallets.delete(firstKey);
        }
      }
    }

    profile.isWhale = profile.totalVolumeSol >= WHALE_SOL_THRESHOLD;
    if (profile.isWhale) {
      this.whales.add(address);
    }

    return {
      isWhale: profile.isWhale,
      justBecameWhale: profile.isWhale && !wasWhale,
    };
  }

  getProfile(address: string): WalletProfile | undefined {
    return this.wallets.get(address);
  }

  getWhaleCount(): number {
    return this.whales.size;
  }
}

// ---------------------------------------------------------------------------
// Sniper Bot Detection
// ---------------------------------------------------------------------------

/**
 * A "sniper" is a wallet that buys a token within N milliseconds of its
 * creation. Since PumpFun tokens are created and traded on the same WS feed,
 * we timestamp token creation and flag early buyers.
 */
const SNIPER_WINDOW_MS = 3_000; // 3 seconds after token creation
const MAX_CREATION_CACHE = 20_000;

interface SniperHit {
  trader: string;
  mint: string;
  delayMs: number;
  timestamp: number;
}

export class SniperDetector {
  /** mint → creation timestamp */
  private creationTimes = new Map<string, number>();
  /** trader address → sniper hit count */
  private sniperScores = new Map<string, number>();
  /** Recent sniper hits for event emission */
  readonly recentHits: SniperHit[] = [];
  private maxHits = 500;
  /** Wallets flagged as repeat snipers (3+ snipes) */
  readonly confirmedSnipers = new Set<string>();

  recordTokenCreation(mint: string, timestamp: number): void {
    this.creationTimes.set(mint, timestamp);

    // Evict oldest if over capacity
    if (this.creationTimes.size > MAX_CREATION_CACHE) {
      const firstKey = this.creationTimes.keys().next().value;
      if (firstKey) this.creationTimes.delete(firstKey);
    }
  }

  checkTrade(
    trader: string,
    mint: string,
    txType: string,
    timestamp: number,
  ): SniperHit | null {
    if (txType !== 'buy') return null;

    const createdAt = this.creationTimes.get(mint);
    if (createdAt === undefined) return null;

    const delayMs = timestamp - createdAt;
    if (delayMs < 0 || delayMs > SNIPER_WINDOW_MS) return null;

    const hit: SniperHit = { trader, mint, delayMs, timestamp };

    // Track hit
    this.recentHits.push(hit);
    if (this.recentHits.length > this.maxHits) {
      this.recentHits.shift();
    }

    // Update sniper score
    const score = (this.sniperScores.get(trader) || 0) + 1;
    this.sniperScores.set(trader, score);
    if (score >= 3) {
      this.confirmedSnipers.add(trader);
    }

    return hit;
  }

  getSniperCount(): number {
    return this.confirmedSnipers.size;
  }
}

// ---------------------------------------------------------------------------
// Social Clustering
// ---------------------------------------------------------------------------

/**
 * Detects coordinated wallet groups by tracking which wallets trade the same
 * tokens. Two wallets that share N+ tokens are considered "socially linked".
 * We build a lightweight co-occurrence map: for each token, we record traders,
 * then look for wallet pairs that appear together frequently.
 */
const CLUSTER_TOKEN_THRESHOLD = 3; // shared tokens to be considered linked
const MAX_TOKENS_TRACKED = 5_000;
const MAX_TRADERS_PER_TOKEN = 200;
const MAX_CLUSTERS = 100;

export interface SocialCluster {
  id: string;
  wallets: string[];
  sharedTokens: number;
  totalVolumeSol: number;
}

export class SocialClusterDetector {
  /** mint → set of trader addresses */
  private tokenTraders = new Map<string, Set<string>>();
  /** "walletA:walletB" (sorted) → shared token count */
  private pairCounts = new Map<string, number>();
  /** Computed clusters (refreshed periodically) */
  private clusters: SocialCluster[] = [];
  private dirty = false;

  recordTrade(trader: string, mint: string): void {
    let traders = this.tokenTraders.get(mint);
    if (!traders) {
      traders = new Set();
      this.tokenTraders.set(mint, traders);

      // Evict oldest token if over capacity
      if (this.tokenTraders.size > MAX_TOKENS_TRACKED) {
        const firstKey = this.tokenTraders.keys().next().value;
        if (firstKey) this.tokenTraders.delete(firstKey);
      }
    }

    // If trader already recorded for this token, skip
    if (traders.has(trader)) return;

    // Before adding, compute pairs with existing traders for this token
    if (traders.size < MAX_TRADERS_PER_TOKEN) {
      for (const existing of traders) {
        const pairKey = [trader, existing].sort().join(':');
        const count = (this.pairCounts.get(pairKey) || 0) + 1;
        this.pairCounts.set(pairKey, count);
        if (count >= CLUSTER_TOKEN_THRESHOLD) {
          this.dirty = true;
        }
      }
      traders.add(trader);
    }
  }

  /**
   * Recompute clusters from pair data. Call periodically (not every trade).
   * Uses Union-Find to group wallets that share enough tokens.
   */
  computeClusters(): SocialCluster[] {
    if (!this.dirty && this.clusters.length > 0) return this.clusters;

    // Build adjacency from qualifying pairs
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();

    function find(x: string): string {
      let root = x;
      while (parent.get(root) !== root) {
        const p = parent.get(root);
        if (p === undefined) break;
        root = p;
      }
      // Path compression
      let current = x;
      while (current !== root) {
        const next = parent.get(current) ?? root;
        parent.set(current, root);
        current = next;
      }
      return root;
    }

    function union(a: string, b: string): void {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) return;
      const rankA = rank.get(ra) || 0;
      const rankB = rank.get(rb) || 0;
      if (rankA < rankB) {
        parent.set(ra, rb);
      } else if (rankA > rankB) {
        parent.set(rb, ra);
      } else {
        parent.set(rb, ra);
        rank.set(ra, rankA + 1);
      }
    }

    for (const [pairKey, count] of this.pairCounts) {
      if (count < CLUSTER_TOKEN_THRESHOLD) continue;
      const [a, b] = pairKey.split(':');
      if (!parent.has(a)) { parent.set(a, a); rank.set(a, 0); }
      if (!parent.has(b)) { parent.set(b, b); rank.set(b, 0); }
      union(a, b);
    }

    // Group by root
    const groups = new Map<string, Set<string>>();
    for (const wallet of parent.keys()) {
      const root = find(wallet);
      let group = groups.get(root);
      if (!group) { group = new Set(); groups.set(root, group); }
      group.add(wallet);
    }

    // Build cluster objects (only groups with 2+ wallets)
    this.clusters = Array.from(groups.entries())
      .filter(([, wallets]) => wallets.size >= 2)
      .map(([root, wallets], i) => ({
        id: `cluster-${i}-${root.slice(0, 8)}`,
        wallets: Array.from(wallets),
        sharedTokens: 0, // approximate
        totalVolumeSol: 0,
      }))
      .sort((a, b) => b.wallets.length - a.wallets.length)
      .slice(0, MAX_CLUSTERS);

    // Compute shared token counts per cluster
    for (const cluster of this.clusters) {
      const walletSet = new Set(cluster.wallets);
      let shared = 0;
      for (const [, traders] of this.tokenTraders) {
        let overlap = 0;
        for (const w of walletSet) {
          if (traders.has(w)) overlap++;
          if (overlap >= 2) break;
        }
        if (overlap >= 2) shared++;
      }
      cluster.sharedTokens = shared;
    }

    this.dirty = false;
    return this.clusters;
  }

  getClusters(): SocialCluster[] {
    return this.clusters;
  }

  getClusterCount(): number {
    return this.clusters.length;
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
    providerId: 'solana-pumpfun',
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
    meta: {
      progress: state.progress,
      vTokens: state.vTokens,
      vSol: state.vSol,
      graduated: state.graduated,
    },
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
    providerId: 'solana-pumpfun',
    category: 'whales',
    chain: 'solana',
    timestamp: Date.now(),
    label: `🐋 ${address.slice(0, 6)}… whale trade on ${symbol}`,
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
    providerId: 'solana-pumpfun',
    category: 'snipers',
    chain: 'solana',
    timestamp: Date.now(),
    label: `🎯 ${trader.slice(0, 6)}… sniped ${symbol} in ${delayMs}ms`,
    amount: 0,
    nativeSymbol: 'SOL',
    address: trader,
    tokenAddress: mint,
    meta: { delayMs, isSniper: true },
  };
}

export function makeClusterEvent(cluster: SocialCluster): DataProviderEvent {
  return {
    id: generateAnalyticsId(),
    providerId: 'solana-pumpfun',
    category: 'clusters',
    chain: 'solana',
    timestamp: Date.now(),
    label: `👥 Cluster of ${cluster.wallets.length} wallets (${cluster.sharedTokens} shared tokens)`,
    amount: 0,
    nativeSymbol: 'SOL',
    address: cluster.wallets[0] || '',
    meta: {
      clusterSize: cluster.wallets.length,
      sharedTokens: cluster.sharedTokens,
      wallets: cluster.wallets.slice(0, 10), // cap for event payload
    },
  };
}
