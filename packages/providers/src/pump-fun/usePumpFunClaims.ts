'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Claim, RawEvent } from '@web3viz/core';

// ============================================================================
// Types
// ============================================================================

export interface PumpFunClaimsStats {
  totalClaims: number;
  totalClaimSol: number;
  recentClaims: RawEvent[];
}

// ============================================================================
// Constants
// ============================================================================

const MAINNET_WS = 'wss://atlas-mainnet.helius-rpc.com?api-key=1ff59bc0-129d-4e60-b065-bf0434be42a4';
const CLAIMS_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const MAX_CLAIMS = 200;

function parseClaimInstruction(raw: unknown): Claim | null {
  if (!raw || typeof raw !== 'object') return null;
  const msg = raw as Record<string, unknown>;
  const params = msg.params as Record<string, unknown> | undefined;
  if (!params) return null;

  const result = params.result as Record<string, unknown> | undefined;
  if (!result) return null;

  const value = result.value as Record<string, unknown> | undefined;
  if (!value) return null;

  const transaction = value.transaction as Record<string, unknown> | undefined;
  if (!transaction?.meta || !transaction.transaction) return null;

  const meta = transaction.meta as Record<string, unknown>;
  const innerTx = transaction.transaction as Record<string, unknown>;

  const preBalances = meta.preBalances as number[] | undefined;
  const postBalances = meta.postBalances as number[] | undefined;

  if (!preBalances?.length || !postBalances?.length) return null;
  const lamportChange = postBalances[0] - preBalances[0];
  const solAmount = Math.abs(lamportChange) / 1e9;
  if (solAmount < 0.001) return null;

  const message = innerTx.message as Record<string, unknown> | undefined;
  const accountKeys = message?.accountKeys as string[] | undefined;
  const wallet = accountKeys?.[0] || '';

  const signature = (value.signature as string) || '';
  const slot = (value.slot as number) || 0;

  const preTokenBalances = meta.preTokenBalances as Array<Record<string, unknown>> | undefined;
  const postTokenBalances = meta.postTokenBalances as Array<Record<string, unknown>> | undefined;

  let mint = '';
  let tokenAmount = 0;
  if (preTokenBalances?.length && postTokenBalances?.length) {
    const pre = preTokenBalances[0];
    const post = postTokenBalances[0];
    mint = (pre.mint as string) || (post.mint as string) || '';
    const preAmt = Number(
      (pre.uiTokenAmount as Record<string, unknown>)?.uiAmount || 0
    );
    const postAmt = Number(
      (post.uiTokenAmount as Record<string, unknown>)?.uiAmount || 0
    );
    tokenAmount = Math.abs(postAmt - preAmt);
  }

  return {
    wallet,
    mint,
    solAmount,
    tokenAmount,
    signature,
    slot,
    timestamp: Date.now(),
    claimType: 'wallet',
    programId: 'pump-fun',
    isFirstClaim: false,
  };
}

// ============================================================================
// Hook
// ============================================================================

export function usePumpFunClaims({ paused = false }: { paused?: boolean } = {}) {
  const [stats, setStats] = useState<PumpFunClaimsStats>({
    totalClaims: 0,
    totalClaimSol: 0,
    recentClaims: [],
  });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(MAINNET_WS);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'logsSubscribe',
          params: [
            { mentions: [CLAIMS_PROGRAM] },
            { commitment: 'confirmed' },
          ],
        })
      );
    };

    ws.onmessage = (event) => {
      if (pausedRef.current) return;

      try {
        const raw = JSON.parse(event.data);
        if (raw.method !== 'logsNotification') return;

        const claim = parseClaimInstruction(raw);
        if (!claim) return;

        setStats((prev) => ({
          totalClaims: prev.totalClaims + 1,
          totalClaimSol: prev.totalClaimSol + (claim.solAmount ?? 0),
          recentClaims: [
            { type: 'claim' as const, data: claim },
            ...prev.recentClaims,
          ].slice(0, MAX_CLAIMS),
        }));
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
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
