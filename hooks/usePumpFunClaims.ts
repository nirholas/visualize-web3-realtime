'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// PumpFun Program IDs
// ---------------------------------------------------------------------------

const PUMP_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const PUMP_AMM_PROGRAM_ID = 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA';
const PUMP_FEE_PROGRAM_ID = 'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ';

// ---------------------------------------------------------------------------
// Claim event discriminators (from pumpfun-claims-bot)
// ---------------------------------------------------------------------------

/** Wallet claim discriminators (PUMP_PROGRAM & PUMP_AMM) */
const WALLET_CLAIM_DISCRIMINATORS = new Set([
  '7a027f010ebf0caf', // CollectCreatorFeeEvent
  'a537817004b3ca28', // DistributeCreatorFeesEvent
  'e2d6f62107f293e5', // ClaimCashbackEvent
  'e8f5c2eeeada3a59', // CollectCoinCreatorFeeEvent
]);

/** GitHub/social claim discriminator (PUMP_FEE_PROGRAM) */
const GITHUB_CLAIM_DISCRIMINATOR = '3212c141edd2eaec'; // SocialFeePdaClaimed

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClaimType = 'wallet' | 'github';

export interface PumpFunClaim {
  signature: string;
  slot: number;
  timestamp: number;
  claimType: ClaimType;
  programId: string;
  /** Claimer wallet address (extracted from account keys) */
  claimer: string;
  /** Whether this is the first claim we've seen for this claimer */
  isFirstClaim: boolean;
  /** Raw log lines for debugging */
  logs: string[];
}

export interface PumpFunClaimStats {
  totalClaims: number;
  walletClaims: number;
  githubClaims: number;
  firstClaims: number;
  recentClaims: PumpFunClaim[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOLANA_WS_URL = process.env.NEXT_PUBLIC_SOLANA_WS_URL || 'wss://api.mainnet-beta.solana.com';
const MAX_RECENT_CLAIMS = 200;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePumpFunClaims({ paused = false }: { paused?: boolean } = {}) {
  const [stats, setStats] = useState<PumpFunClaimStats>({
    totalClaims: 0,
    walletClaims: 0,
    githubClaims: 0,
    firstClaims: 0,
    recentClaims: [],
  });
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // First-claim tracking sets
  const seenWallets = useRef<Set<string>>(new Set());
  const subscriptionIds = useRef<number[]>([]);
  const nextId = useRef(1);

  // -------------------------------------------------------------------------
  // Parse transaction logs to detect claim events
  // -------------------------------------------------------------------------

  const parseClaimFromLogs = useCallback(
    (logs: string[], signature: string, slot: number, accountKeys: string[]): PumpFunClaim | null => {
      // Look for base64-encoded event data in logs
      let claimType: ClaimType | null = null;
      let programId = '';

      for (const log of logs) {
        // Program data lines contain base64-encoded event data
        if (log.startsWith('Program data: ')) {
          try {
            const b64 = log.slice('Program data: '.length);
            const bytes = atob(b64);
            // Extract first 8 bytes as hex discriminator
            let disc = '';
            for (let i = 0; i < Math.min(8, bytes.length); i++) {
              disc += bytes.charCodeAt(i).toString(16).padStart(2, '0');
            }

            if (WALLET_CLAIM_DISCRIMINATORS.has(disc)) {
              claimType = 'wallet';
              break;
            }
            if (disc === GITHUB_CLAIM_DISCRIMINATOR) {
              claimType = 'github';
              break;
            }
          } catch {
            // Ignore invalid base64
          }
        }

        // Detect which program emitted the log
        if (log.includes(PUMP_FEE_PROGRAM_ID)) {
          programId = PUMP_FEE_PROGRAM_ID;
        } else if (log.includes(PUMP_AMM_PROGRAM_ID)) {
          programId = PUMP_AMM_PROGRAM_ID;
        } else if (log.includes(PUMP_PROGRAM_ID)) {
          programId = PUMP_PROGRAM_ID;
        }
      }

      if (!claimType) return null;

      // The claimer is typically the fee payer (first account key)
      const claimer = accountKeys[0] || 'unknown';

      // First-claim detection
      const isFirstClaim = !seenWallets.current.has(claimer);
      if (isFirstClaim) {
        seenWallets.current.add(claimer);
      }

      return {
        signature,
        slot,
        timestamp: Date.now(),
        claimType,
        programId: programId || (claimType === 'github' ? PUMP_FEE_PROGRAM_ID : PUMP_PROGRAM_ID),
        claimer,
        isFirstClaim,
        logs,
      };
    },
    [],
  );

  // -------------------------------------------------------------------------
  // WebSocket connection
  // -------------------------------------------------------------------------

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(SOLANA_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);

      // Subscribe to logs for each PumpFun program
      const programs = [PUMP_PROGRAM_ID, PUMP_AMM_PROGRAM_ID, PUMP_FEE_PROGRAM_ID];
      for (const programId of programs) {
        const id = nextId.current++;
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            method: 'logsSubscribe',
            params: [
              { mentions: [programId] },
              { commitment: 'confirmed' },
            ],
          }),
        );
      }
    };

    ws.onmessage = (event) => {
      if (pausedRef.current) return;

      try {
        const msg = JSON.parse(event.data);

        // Handle subscription confirmations
        if (msg.result !== undefined && typeof msg.result === 'number') {
          subscriptionIds.current.push(msg.result);
          return;
        }

        // Handle log notifications
        if (msg.method === 'logsNotification' && msg.params?.result?.value) {
          const value = msg.params.result.value;
          const logs: string[] = value.logs || [];
          const signature: string = value.signature || '';
          const slot: number = msg.params.result.context?.slot || 0;

          // Extract account keys if available (err will be null for success)
          if (value.err !== null) return; // Skip failed transactions

          // We don't get account keys from logsSubscribe, so use signature as claimer identifier
          // For a production system we'd fetch the transaction, but for real-time viz the signature works
          const claim = parseClaimFromLogs(logs, signature, slot, [signature.slice(0, 44)]);
          if (!claim) return;

          setStats((prev) => ({
            totalClaims: prev.totalClaims + 1,
            walletClaims: prev.walletClaims + (claim.claimType === 'wallet' ? 1 : 0),
            githubClaims: prev.githubClaims + (claim.claimType === 'github' ? 1 : 0),
            firstClaims: prev.firstClaims + (claim.isFirstClaim ? 1 : 0),
            recentClaims: [claim, ...prev.recentClaims].slice(0, MAX_RECENT_CLAIMS),
          }));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      subscriptionIds.current = [];
      // Auto-reconnect after 5s (Solana WS can be rate-limited)
      setTimeout(connect, 5000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [parseClaimFromLogs]);

  useEffect(() => {
    connect();
    return () => {
      // Unsubscribe before closing
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        for (const subId of subscriptionIds.current) {
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: nextId.current++,
              method: 'logsUnsubscribe',
              params: [subId],
            }),
          );
        }
      }
      ws?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { stats, connected };
}
