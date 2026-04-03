/**
 * Solana Claims WebSocket connection
 * Connects to Solana RPC WebSocket for fee claim events
 */

import type { DataProviderEvent } from '@web3viz/core';

export interface ClaimsWSConfig {
  onEvent: (event: DataProviderEvent) => void;
  isPaused: () => boolean;
}

const PUMP_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const PUMP_AMM_PROGRAM_ID = 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA';
const PUMP_FEE_PROGRAM_ID = 'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ';

const WALLET_CLAIM_DISCRIMINATORS = new Set([
  '7a027f010ebf0caf', // CollectCreatorFeeEvent
  'a537817004b3ca28', // DistributeCreatorFeesEvent
  'e2d6f62107f293e5', // ClaimCashbackEvent
  'e8f5c2eeeada3a59', // CollectCoinCreatorFeeEvent
]);

const GITHUB_CLAIM_DISCRIMINATOR = '3212c141edd2eaec'; // SocialFeePdaClaimed

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export class SolanaClaimsWebSocket {
  private ws: WebSocket | null = null;
  private connected = false;
  private config: ClaimsWSConfig;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private subscriptionIds: number[] = [];
  private nextId = 1;
  private seenWallets = new Set<string>();
  private solanaWsUrl: string;

  constructor(config: ClaimsWSConfig) {
    this.config = config;
    this.solanaWsUrl =
      typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SOLANA_WS_URL
        ? process.env.NEXT_PUBLIC_SOLANA_WS_URL
        : 'wss://api.mainnet-beta.solana.com';
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(this.solanaWsUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;

      // Subscribe to logs for each PumpFun program
      const programs = [PUMP_PROGRAM_ID, PUMP_AMM_PROGRAM_ID, PUMP_FEE_PROGRAM_ID];
      for (const programId of programs) {
        const id = this.nextId++;
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
      if (this.config.isPaused()) return;

      try {
        const msg = JSON.parse(event.data);

        // Handle subscription confirmations
        if (msg.result !== undefined && typeof msg.result === 'number') {
          this.subscriptionIds.push(msg.result);
          return;
        }

        // Handle log notifications
        if (msg.method === 'logsNotification' && msg.params?.result?.value) {
          const value = msg.params.result.value;
          const logs: string[] = value.logs || [];
          const signature: string = value.signature || '';
          const slot: number = msg.params.result.context?.slot || 0;

          // Skip failed transactions
          if (value.err !== null) return;

          const claim = this.parseClaimFromLogs(logs, signature, slot);
          if (!claim) return;

          // Emit categorized event
          const categoryMap: Record<string, string> = {
            wallet: 'claimsWallet',
            github: 'claimsGithub',
          };
          const category = categoryMap[claim.claimType] || 'claimsWallet';

          this.config.onEvent({
            id: generateId(),
            providerId: 'solana-pumpfun',
            category: claim.isFirstClaim ? 'claimsFirst' : category,
            chain: 'solana',
            timestamp: Date.now(),
            label: `${claim.claimType} claim`,
            amount: 0,
            nativeSymbol: 'SOL',
            address: claim.claimer,
            meta: {
              claimType: claim.claimType,
              isFirstClaim: claim.isFirstClaim,
              programId: claim.programId,
              slot,
            },
          });
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      this.connected = false;
      this.subscriptionIds = [];
      // Auto-reconnect after 5s (Solana WS can be rate-limited)
      this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
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

    const ws = this.ws;
    if (ws?.readyState === WebSocket.OPEN) {
      // Unsubscribe before closing
      for (const subId of this.subscriptionIds) {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: this.nextId++,
            method: 'logsUnsubscribe',
            params: [subId],
          }),
        );
      }
    }
    ws?.close();
    this.ws = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private parseClaimFromLogs(
    logs: string[],
    signature: string,
    slot: number,
  ): { claimType: string; isFirstClaim: boolean; claimer: string; programId: string } | null {
    let claimType: string | null = null;
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

    // Use signature-derived ID as claimer identifier
    const claimer = signature.slice(0, 44);

    // First-claim detection
    const isFirstClaim = !this.seenWallets.has(claimer);
    if (isFirstClaim) {
      this.seenWallets.add(claimer);
    }

    return {
      claimType,
      isFirstClaim,
      claimer,
      programId: programId || (claimType === 'github' ? PUMP_FEE_PROGRAM_ID : PUMP_PROGRAM_ID),
    };
  }
}
