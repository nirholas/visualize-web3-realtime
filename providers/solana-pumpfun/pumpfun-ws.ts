/**
 * PumpFun WebSocket connection
 * Connects to wss://pumpportal.fun/api/data for token launches and trades
 */

import type { DataProviderEvent, RawEvent, TopToken, TraderEdge } from '@web3viz/core';
import {
  BondingCurveTracker,
  WhaleTracker,
  SniperDetector,
  SocialClusterDetector,
  makeBondingCurveEvent,
  makeWhaleEvent,
  makeSniperEvent,
  makeClusterEvent,
  type BondingCurveState,
  type SocialCluster,
} from './analytics';

export interface PumpFunWSConfig {
  onEvent: (event: DataProviderEvent) => void;
  onRawEvent: (raw: RawEvent) => void;
  isPaused: () => boolean;
  onTopTokensChanged?: (tokens: TopToken[], edges: TraderEdge[]) => void;
}

const WS_URL = 'wss://pumpportal.fun/api/data';
const MAX_TOP_TOKENS = 8;
const AGENT_KEYWORDS = /\b(agent|ai\b|gpt|bot|auto|llm|claude|openai|chatgpt|neural|sentient|autonomous)/i;

function isAgentLaunch(name: string, symbol: string): boolean {
  return AGENT_KEYWORDS.test(name) || AGENT_KEYWORDS.test(symbol);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export class PumpFunWebSocket {
  private ws: WebSocket | null = null;
  private connected = false;
  private config: PumpFunWSConfig;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // Caches and accumulators
  private tokenCache = new Map<string, { name: string; symbol: string }>();
  private tokenAcc = new Map<string, TopToken>();
  private traderAcc = new Map<string, TraderEdge>();

  // Analytics trackers
  readonly bondingCurve = new BondingCurveTracker();
  readonly whaleTracker = new WhaleTracker();
  readonly sniperDetector = new SniperDetector();
  readonly socialClusters = new SocialClusterDetector();
  private clusterComputeInterval: NodeJS.Timeout | null = null;

  constructor(config: PumpFunWSConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    // Periodically recompute social clusters (every 30s)
    if (!this.clusterComputeInterval) {
      this.clusterComputeInterval = setInterval(() => {
        const clusters = this.socialClusters.computeClusters();
        for (const cluster of clusters.slice(0, 5)) {
          if (cluster.wallets.length >= 3) {
            this.config.onEvent(makeClusterEvent(cluster));
          }
        }
      }, 30_000);
    }

    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
      // Subscribe to all new token creations and trades
      ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
      ws.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: ['allTrades'] }));
    };

    ws.onmessage = (event) => {
      if (this.config.isPaused()) return;

      try {
        const raw = JSON.parse(event.data);
        if (!raw || typeof raw !== 'object') return;

        // Detect event type
        if (raw.txType === undefined && raw.mint && raw.name) {
          // Token create
          this.handleTokenCreate(raw);
        } else if (raw.txType === 'buy' || raw.txType === 'sell') {
          // Trade event
          this.handleTrade(raw);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      this.connected = false;
      // Auto-reconnect after 3s
      this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.clusterComputeInterval) {
      clearInterval(this.clusterComputeInterval);
      this.clusterComputeInterval = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private handleTokenCreate(raw: Record<string, unknown>): void {
    const tokenName = (raw.name as string) || 'Unknown';
    const tokenSymbol = (raw.symbol as string) || '???';
    const mint = raw.mint as string;
    const now = Date.now();

    // Cache token metadata
    this.tokenCache.set(mint, { name: tokenName, symbol: tokenSymbol });

    // Record creation timestamp for sniper detection
    this.sniperDetector.recordTokenCreation(mint, now);

    const isAgent = isAgentLaunch(tokenName, tokenSymbol);

    // Emit raw event
    this.config.onRawEvent({
      type: 'tokenCreate',
      data: {
        tokenAddress: mint,
        name: tokenName,
        symbol: tokenSymbol,
        chain: 'solana',
        uri: (raw.uri as string) || '',
        creatorAddress: (raw.traderPublicKey as string) || '',
        initialBuy: (raw.initialBuy as number) || 0,
        marketCap: (raw.marketCapSol as number) || 0,
        nativeSymbol: 'SOL',
        signature: (raw.signature as string) || '',
        timestamp: Date.now(),
        isAgent,
      },
    });

    // Emit categorized event
    const category = isAgent ? 'agentLaunches' : 'launches';
    this.config.onEvent({
      id: generateId(),
      providerId: 'solana-pumpfun',
      category,
      chain: 'solana',
      timestamp: Date.now(),
      label: `${tokenSymbol} launched`,
      amount: (raw.marketCapSol as number) || 0,
      nativeSymbol: 'SOL',
      address: (raw.traderPublicKey as string) || '',
      tokenAddress: mint,
      meta: {
        name: tokenName,
        symbol: tokenSymbol,
        isAgent,
      },
    });
  }

  private handleTrade(raw: Record<string, unknown>): void {
    const mint = raw.mint as string;
    const cached = this.tokenCache.get(mint);
    const solAmount = ((raw.solAmount as number) || 0) / 1e9; // lamports → SOL
    const trader = (raw.traderPublicKey as string) || '';
    const txType = (raw.txType as string) || 'buy';
    const symbol = cached?.symbol || '???';
    const now = Date.now();

    // --- Analytics: Bonding Curve ---
    const vTokens = (raw.vTokensInBondingCurve as number) || 0;
    const vSol = (raw.vSolInBondingCurve as number) || 0;
    if (vTokens > 0) {
      const prevState = this.bondingCurve.get(mint);
      const prevPct = prevState ? prevState.progress * 100 : 0;
      const curveState = this.bondingCurve.update(mint, vTokens, vSol);
      const pct = curveState.progress * 100;

      // Emit event when crossing 25%, 50%, 75%, 90%, or graduation
      const thresholds = [25, 50, 75, 90];
      const crossedThreshold = thresholds.some((t) => pct >= t && prevPct < t);
      if (curveState.graduated || crossedThreshold) {
        this.config.onEvent(makeBondingCurveEvent(curveState, symbol));
      }
    }

    // --- Analytics: Whale Tracking ---
    if (trader) {
      const whaleResult = this.whaleTracker.recordTrade(trader, solAmount, mint, now);
      if (whaleResult.isWhale) {
        this.config.onEvent(makeWhaleEvent(trader, solAmount, mint, symbol));
      }
    }

    // --- Analytics: Sniper Detection ---
    if (trader) {
      const sniperHit = this.sniperDetector.checkTrade(trader, mint, txType, now);
      if (sniperHit) {
        this.config.onEvent(makeSniperEvent(trader, mint, sniperHit.delayMs, symbol));
      }
    }

    // --- Analytics: Social Clustering ---
    if (trader) {
      this.socialClusters.recordTrade(trader, mint);
    }

    // Emit raw event
    this.config.onRawEvent({
      type: 'trade',
      data: {
        tokenAddress: mint,
        chain: 'solana',
        signature: (raw.signature as string) || '',
        traderAddress: trader,
        txType,
        tokenAmount: (raw.tokenAmount as number) || 0,
        nativeAmount: solAmount,
        nativeSymbol: 'SOL',
        marketCap: (raw.marketCapSol as number) || 0,
        timestamp: now,
        name: cached?.name,
        symbol: cached?.symbol,
        meta: {
          newTokenBalance: (raw.newTokenBalance as number) || 0,
          bondingCurveKey: (raw.bondingCurveKey as string) || '',
          vTokensInBondingCurve: vTokens,
          vSolInBondingCurve: vSol,
          bondingCurveProgress: vTokens > 0
            ? this.bondingCurve.get(mint)?.progress ?? 0
            : undefined,
          isWhale: this.whaleTracker.whales.has(trader),
          isSniper: this.sniperDetector.confirmedSnipers.has(trader),
        },
      },
    });

    // Update accumulators
    const existing = this.tokenAcc.get(mint);
    if (existing) {
      existing.trades++;
      existing.volume += solAmount;
      if (cached) {
        existing.name = cached.name;
        existing.symbol = cached.symbol;
      }
    } else {
      this.tokenAcc.set(mint, {
        tokenAddress: mint,
        name: cached?.name || mint.slice(0, 8),
        symbol: cached?.symbol || '???',
        chain: 'solana',
        trades: 1,
        volume: solAmount,
        nativeSymbol: 'SOL',
      });
    }

    // Compute top tokens
    const sorted = Array.from(this.tokenAcc.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, MAX_TOP_TOKENS);

    // Build trader → token edges for top-token mints only
    const topAddrs = new Set(sorted.map((t) => t.tokenAddress));
    const traderKey = `${trader}:${mint}`;
    const existingEdge = this.traderAcc.get(traderKey);
    if (existingEdge) {
      existingEdge.trades++;
      existingEdge.volume += solAmount;
    } else {
      this.traderAcc.set(traderKey, {
        trader,
        tokenAddress: mint,
        chain: 'solana',
        trades: 1,
        volume: solAmount,
      });
    }

    // Snapshot trader edges for top tokens only (capped for perf)
    const traderEdges = Array.from(this.traderAcc.values())
      .filter((e) => topAddrs.has(e.tokenAddress))
      .slice(0, 5000);

    // Emit categorized event
    this.config.onEvent({
      id: generateId(),
      providerId: 'solana-pumpfun',
      category: 'trades',
      chain: 'solana',
      timestamp: now,
      label: `${symbol} ${txType}`,
      amount: solAmount,
      nativeSymbol: 'SOL',
      address: trader,
      tokenAddress: mint,
      meta: {
        symbol: cached?.symbol,
        txType,
        isWhale: this.whaleTracker.whales.has(trader),
        isSniper: this.sniperDetector.confirmedSnipers.has(trader),
      },
    });

    // Notify parent of top tokens change
    if (this.config.onTopTokensChanged) {
      this.config.onTopTokensChanged(sorted, traderEdges);
    }
  }
}
