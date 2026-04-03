'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// PumpFun WebSocket types
// ---------------------------------------------------------------------------

export interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  traderPublicKey: string;
  initialBuy: number;
  marketCapSol: number;
  signature: string;
  timestamp: number;
  /** Whether this token appears to be an AI agent launch */
  isAgent: boolean;
}

export interface PumpFunTrade {
  mint: string;
  signature: string;
  traderPublicKey: string;
  txType: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;
  newTokenBalance: number;
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
  timestamp: number;
  // Resolved from token creates
  name?: string;
  symbol?: string;
}

export type PumpFunEvent =
  | { type: 'tokenCreate'; data: PumpFunToken }
  | { type: 'trade'; data: PumpFunTrade };

export interface TopToken {
  mint: string;
  symbol: string;
  name: string;
  trades: number;
  volumeSol: number;
}

/** Per-trader → token edge info for the force graph */
export interface TraderEdge {
  trader: string;
  mint: string;
  trades: number;
  volumeSol: number;
}

export interface PumpFunStats {
  totalTokens: number;
  totalTrades: number;
  totalVolumeSol: number;
  recentEvents: PumpFunEvent[];
  topTokens: TopToken[];
  /** Per-trader edges to tokens (for ForceGraph agent nodes) */
  traderEdges: TraderEdge[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const WS_URL = 'wss://pumpportal.fun/api/data';
const MAX_EVENTS = 200;
const MAX_TOP_TOKENS = 8;

// ---------------------------------------------------------------------------
// Agent launch detection
// ---------------------------------------------------------------------------

const AGENT_KEYWORDS = /\b(agent|ai\b|gpt|bot|auto|llm|claude|openai|chatgpt|neural|sentient|autonomous)/i;

/** Heuristic: check if a token launch looks like an AI agent */
function isAgentLaunch(name: string, symbol: string): boolean {
  return AGENT_KEYWORDS.test(name) || AGENT_KEYWORDS.test(symbol);
}

export function usePumpFun({ paused = false }: { paused?: boolean } = {}) {
  const [stats, setStats] = useState<PumpFunStats>({
    totalTokens: 0,
    totalTrades: 0,
    totalVolumeSol: 0,
    recentEvents: [],
    topTokens: [],
    traderEdges: [],
  });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Token name cache: mint → { name, symbol }
  const tokenCache = useRef<Map<string, { name: string; symbol: string }>>(new Map());
  // Accumulator for top tokens: mint → { trades, volumeSol }
  const tokenAcc = useRef<Map<string, TopToken>>(new Map());
  // Accumulator for trader → token edges: "trader:mint" → { trades, volumeSol }
  const traderAcc = useRef<Map<string, TraderEdge>>(new Map());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Subscribe to all new token creations and trades
      ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
      ws.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: ['allTrades'] }));
    };

    ws.onmessage = (event) => {
      if (pausedRef.current) return;

      try {
        const raw = JSON.parse(event.data);
        if (!raw || typeof raw !== 'object') return;

        // Detect event type
        if (raw.txType === undefined && raw.mint && raw.name) {
          // Token create
          const tokenName = raw.name || 'Unknown';
          const tokenSymbol = raw.symbol || '???';
          const token: PumpFunToken = {
            mint: raw.mint,
            name: tokenName,
            symbol: tokenSymbol,
            uri: raw.uri || '',
            traderPublicKey: raw.traderPublicKey || '',
            initialBuy: raw.initialBuy || 0,
            marketCapSol: raw.marketCapSol || 0,
            signature: raw.signature || '',
            timestamp: Date.now(),
            isAgent: isAgentLaunch(tokenName, tokenSymbol),
          };
          tokenCache.current.set(token.mint, { name: token.name, symbol: token.symbol });

          setStats((prev) => ({
            ...prev,
            totalTokens: prev.totalTokens + 1,
            recentEvents: [{ type: 'tokenCreate' as const, data: token }, ...prev.recentEvents].slice(0, MAX_EVENTS),
          }));
        } else if (raw.txType === 'buy' || raw.txType === 'sell') {
          // Trade event
          const cached = tokenCache.current.get(raw.mint);
          const trade: PumpFunTrade = {
            mint: raw.mint,
            signature: raw.signature || '',
            traderPublicKey: raw.traderPublicKey || '',
            txType: raw.txType,
            tokenAmount: raw.tokenAmount || 0,
            solAmount: raw.solAmount || 0,
            newTokenBalance: raw.newTokenBalance || 0,
            bondingCurveKey: raw.bondingCurveKey || '',
            vTokensInBondingCurve: raw.vTokensInBondingCurve || 0,
            vSolInBondingCurve: raw.vSolInBondingCurve || 0,
            marketCapSol: raw.marketCapSol || 0,
            timestamp: Date.now(),
            name: cached?.name,
            symbol: cached?.symbol,
          };

          // Update accumulator
          const solAmount = trade.solAmount / 1e9; // lamports → SOL
          const existing = tokenAcc.current.get(trade.mint);
          if (existing) {
            existing.trades++;
            existing.volumeSol += solAmount;
            if (cached) {
              existing.name = cached.name;
              existing.symbol = cached.symbol;
            }
          } else {
            tokenAcc.current.set(trade.mint, {
              mint: trade.mint,
              name: cached?.name || trade.mint.slice(0, 8),
              symbol: cached?.symbol || '???',
              trades: 1,
              volumeSol: solAmount,
            });
          }

          // Compute top tokens
          const sorted = Array.from(tokenAcc.current.values())
            .sort((a, b) => b.volumeSol - a.volumeSol)
            .slice(0, MAX_TOP_TOKENS);

          // Build trader → token edges for top-token mints only
          const topMints = new Set(sorted.map((t) => t.mint));
          const traderKey = `${trade.traderPublicKey}:${trade.mint}`;
          const existingEdge = traderAcc.current.get(traderKey);
          if (existingEdge) {
            existingEdge.trades++;
            existingEdge.volumeSol += solAmount;
          } else {
            traderAcc.current.set(traderKey, {
              trader: trade.traderPublicKey,
              mint: trade.mint,
              trades: 1,
              volumeSol: solAmount,
            });
          }
          // Snapshot trader edges for top tokens only (capped for perf)
          const traderEdges = Array.from(traderAcc.current.values())
            .filter((e) => topMints.has(e.mint))
            .slice(0, 5000);

          setStats((prev) => ({
            ...prev,
            totalTrades: prev.totalTrades + 1,
            totalVolumeSol: prev.totalVolumeSol + solAmount,
            recentEvents: [{ type: 'trade' as const, data: trade }, ...prev.recentEvents].slice(0, MAX_EVENTS),
            topTokens: sorted,
            traderEdges,
          }));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 3s
      setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { stats, connected };
}
