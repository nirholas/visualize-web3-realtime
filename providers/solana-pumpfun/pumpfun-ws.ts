/**
 * PumpFun WebSocket connection
 * Connects to wss://pumpportal.fun/api/data for token launches and trades
 */

import type { DataProviderEvent, RawEvent, TopToken, TraderEdge } from '@web3viz/core';

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

  constructor(config: PumpFunWSConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

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

    // Cache token metadata
    this.tokenCache.set(mint, { name: tokenName, symbol: tokenSymbol });

    const isAgent = isAgentLaunch(tokenName, tokenSymbol);

    // Emit raw event
    this.config.onRawEvent({
      type: 'tokenCreate',
      data: {
        tokenAddress: mint,
        mint,
        name: tokenName,
        symbol: tokenSymbol,
        uri: (raw.uri as string) || '',
        creatorAddress: (raw.traderPublicKey as string) || '',
        traderPublicKey: (raw.traderPublicKey as string) || '',
        initialBuy: (raw.initialBuy as number) || 0,
        marketCap: (raw.marketCapSol as number) || 0,
        marketCapSol: (raw.marketCapSol as number) || 0,
        nativeSymbol: 'SOL',
        signature: (raw.signature as string) || '',
        timestamp: Date.now(),
        isAgent,
        source: 'solana-pumpfun',
      },
    });

    // Emit categorized event
    const category = isAgent ? 'agentLaunches' : 'launches';
    this.config.onEvent({
      id: generateId(),
      providerId: 'solana-pumpfun',
      source: 'solana-pumpfun',
      category,
      chain: 'solana',
      timestamp: Date.now(),
      label: `${tokenSymbol} launched`,
      amount: (raw.marketCapSol as number) || 0,
      nativeSymbol: 'SOL',
      address: (raw.traderPublicKey as string) || '',
      tokenAddress: mint,
      mint,
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

    // Emit raw event
    this.config.onRawEvent({
      type: 'trade',
      data: {
        tokenAddress: mint,
        mint,
        chain: 'solana',
        signature: (raw.signature as string) || '',
        traderAddress: (raw.traderPublicKey as string) || '',
        traderPublicKey: (raw.traderPublicKey as string) || '',
        txType: (raw.txType as string) || 'buy',
        tokenAmount: (raw.tokenAmount as number) || 0,
        nativeAmount: solAmount,
        solAmount: (raw.solAmount as number) || 0,
        nativeSymbol: 'SOL',
        marketCap: (raw.marketCapSol as number) || 0,
        marketCapSol: (raw.marketCapSol as number) || 0,
        timestamp: Date.now(),
        name: cached?.name,
        symbol: cached?.symbol,
        newTokenBalance: (raw.newTokenBalance as number) || 0,
        bondingCurveKey: (raw.bondingCurveKey as string) || '',
        vTokensInBondingCurve: (raw.vTokensInBondingCurve as number) || 0,
        vSolInBondingCurve: (raw.vSolInBondingCurve as number) || 0,
        source: 'solana-pumpfun',
      },
    });

    // Update accumulators
    const existing = this.tokenAcc.get(mint);
    if (existing) {
      existing.trades++;
      existing.volumeSol += solAmount;
      if (cached) {
        existing.name = cached.name;
        existing.symbol = cached.symbol;
      }
    } else {
      this.tokenAcc.set(mint, {
        mint,
        name: cached?.name || mint.slice(0, 8),
        symbol: cached?.symbol || '???',
        trades: 1,
        volumeSol: solAmount,
        source: 'solana-pumpfun',
      });
    }

    // Compute top tokens
    const sorted = Array.from(this.tokenAcc.values())
      .sort((a, b) => b.volumeSol - a.volumeSol)
      .slice(0, MAX_TOP_TOKENS);

    // Build trader → token edges for top-token mints only
    const topMints = new Set(sorted.map((t) => t.mint));
    const traderKey = `${raw.traderPublicKey}:${mint}`;
    const existingEdge = this.traderAcc.get(traderKey);
    if (existingEdge) {
      existingEdge.trades++;
      existingEdge.volumeSol += solAmount;
    } else {
      this.traderAcc.set(traderKey, {
        trader: (raw.traderPublicKey as string) || '',
        mint,
        trades: 1,
        volumeSol: solAmount,
        source: 'solana-pumpfun',
      });
    }

    // Snapshot trader edges for top tokens only (capped for perf)
    const traderEdges = Array.from(this.traderAcc.values())
      .filter((e) => topMints.has(e.mint))
      .slice(0, 5000);

    // Emit categorized event
    this.config.onEvent({
      id: generateId(),
      providerId: 'solana-pumpfun',
      source: 'solana-pumpfun',
      category: 'trades',
      chain: 'solana',
      timestamp: Date.now(),
      label: `${cached?.symbol || '???'} ${raw.txType}`,
      amount: solAmount,
      nativeSymbol: 'SOL',
      address: (raw.traderPublicKey as string) || '',
      tokenAddress: mint,
      mint,
      meta: {
        symbol: cached?.symbol,
        txType: raw.txType,
      },
    });

    // Notify parent of top tokens change
    if (this.config.onTopTokensChanged) {
      this.config.onTopTokensChanged(sorted, traderEdges);
    }
  }
}
