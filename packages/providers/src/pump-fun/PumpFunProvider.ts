import type {
  DataProvider,
  DataProviderEvent,
  DataProviderStats,
  ConnectionState,
  CategoryConfig,
  SourceConfig,
  RawEvent,
  TopToken,
  TraderEdge,
} from '@web3viz/core';
import { getCategoriesForSource, SOURCE_CONFIGS } from '@web3viz/core';

// ============================================================================
// PumpFun Data Provider — Framework-agnostic implementation
// Consolidates trades/launches (PumpPortal) and claims (Solana RPC)
// ============================================================================

export interface PumpFunProviderOptions {
  /** Solana RPC WebSocket URL for claims monitoring */
  rpcWsUrl?: string;
  /** Max events kept in memory (default 200) */
  maxEvents?: number;
  /** Max top tokens tracked (default 8) */
  maxTopTokens?: number;
}

const PUMPFUN_WS_URL = 'wss://pumpportal.fun/api/data';
const DEFAULT_SOLANA_RPC_WS =
  process.env.NEXT_PUBLIC_SOLANA_WS_URL ||
  'wss://atlas-mainnet.helius-rpc.com?api-key=1be79a41-8a57-4498-a35f-3b77c53db786';

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

const AGENT_KEYWORDS = /\b(agent|ai\b|gpt|bot|auto|llm|claude|openai|chatgpt|neural|sentient|autonomous)/i;

function isAgentLaunch(name: string, symbol: string): boolean {
  return AGENT_KEYWORDS.test(name) || AGENT_KEYWORDS.test(symbol);
}

export class PumpFunProvider implements DataProvider {
  readonly id = 'pumpfun';
  readonly name = 'PumpFun';
  readonly chains = ['solana'];
  readonly sourceConfig: SourceConfig;
  readonly categories: CategoryConfig[];

  // Event listeners
  private eventListeners = new Set<(event: DataProviderEvent) => void>();
  private rawListeners = new Set<(event: RawEvent) => void>();

  // Config
  private maxEvents: number;
  private maxTopTokens: number;
  private rpcWsUrl: string;

  // Internal state
  private _paused = false;
  private _enabled = true;

  // WebSocket connections
  private tradesWs: WebSocket | null = null;
  private claimsWs: WebSocket | null = null;

  // Reconnect timers
  private tradesReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private claimsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Exponential backoff state
  private tradesReconnectAttempts = 0;
  private claimsReconnectAttempts = 0;
  private static readonly BASE_RECONNECT_MS = 3000;
  private static readonly MAX_RECONNECT_MS = 60000;

  // Connection state
  private tradesConnected = false;
  private claimsConnected = false;

  // Data accumulators
  private tokenCache = new Map<string, { name: string; symbol: string }>();
  private tokenAcc = new Map<string, TopToken>();
  private traderAcc = new Map<string, TraderEdge>();
  private seenWallets = new Set<string>();

  // Recent events ring buffer
  private recentEvents: DataProviderEvent[] = [];
  private rawEvents: RawEvent[] = [];

  // Stats per category
  private counts = {
    launches: 0,
    agentLaunches: 0,
    trades: 0,
    claimsWallet: 0,
    claimsGithub: 0,
    claimsFirst: 0,
  };
  private totalVolumeAcc = 0;

  // Solana RPC subscription IDs
  private solanaSubIds: number[] = [];
  private solanaNextId = 1;

  constructor(options: PumpFunProviderOptions = {}) {
    this.maxEvents = options.maxEvents ?? 200;
    this.maxTopTokens = options.maxTopTokens ?? 8;
    this.rpcWsUrl = options.rpcWsUrl ?? DEFAULT_SOLANA_RPC_WS;

    // Get pumpfun source config from core, or use fallback
    const sourceConfig = SOURCE_CONFIGS.find((s) => s.id === 'pumpfun');
    this.sourceConfig =
      sourceConfig ||
      ({
        id: 'pumpfun',
        label: 'PumpFun',
        color: '#a78bfa',
        icon: '⚡',
        description: 'Solana token launches & trades via PumpPortal',
      } as SourceConfig);

    // Get categories from core
    this.categories = getCategoriesForSource('pumpfun');
  }

  // =========================================================================
  // DataProvider interface
  // =========================================================================

  connect(): void {
    this.connectTrades();
    this.connectClaims();
  }

  disconnect(): void {
    this.disconnectTrades();
    this.disconnectClaims();
  }

  setPaused(paused: boolean): void {
    this._paused = paused;
  }

  isPaused(): boolean {
    return this._paused;
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  getStats(): DataProviderStats {
    const topTokens = Array.from(this.tokenAcc.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, this.maxTopTokens);

    const topAddresses = new Set(topTokens.map((t) => t.tokenAddress));
    const traderEdges = Array.from(this.traderAcc.values())
      .filter((e) => topAddresses.has(e.tokenAddress))
      .slice(0, 5000);

    return {
      counts: { ...this.counts },
      totalVolume: { solana: this.totalVolumeAcc },
      totalTransactions: Object.values(this.counts).reduce((a, b) => a + b, 0),
      totalAgents: topTokens.length,
      recentEvents: [...this.recentEvents],
      topTokens,
      traderEdges,
      rawEvents: [...this.rawEvents],
    };
  }

  getConnections(): ConnectionState[] {
    return [
      { name: 'PumpPortal', connected: this.tradesConnected },
      { name: 'Solana RPC', connected: this.claimsConnected },
    ];
  }

  onEvent(callback: (event: DataProviderEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => {
      this.eventListeners.delete(callback);
    };
  }

  onRawEvent(callback: (event: RawEvent) => void): () => void {
    this.rawListeners.add(callback);
    return () => {
      this.rawListeners.delete(callback);
    };
  }

  // =========================================================================
  // Event emission
  // =========================================================================

  private emitEvent(event: DataProviderEvent): void {
    // Add to ring buffer
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > this.maxEvents) {
      this.recentEvents.pop();
    }

    // Emit to listeners
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  private emitRaw(event: RawEvent): void {
    // Add to ring buffer
    this.rawEvents.unshift(event);
    if (this.rawEvents.length > this.maxEvents) {
      this.rawEvents.pop();
    }

    // Emit to listeners
    for (const listener of this.rawListeners) {
      listener(event);
    }
  }

  // =========================================================================
  // PumpPortal WebSocket (trades + launches)
  // =========================================================================

  private connectTrades(): void {
    if (this.tradesWs?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(PUMPFUN_WS_URL);
    this.tradesWs = ws;

    ws.onopen = () => {
      console.log('[PumpFunProvider] Trades WS connected');
      this.tradesConnected = true;
      this.tradesReconnectAttempts = 0;
      // Subscribe to new tokens and trades
      ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
      ws.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: ['allTrades'] }));
    };

    ws.onmessage = (event) => {
      if (this._paused || !this._enabled) return;

      try {
        const raw = JSON.parse(event.data);
        if (!raw || typeof raw !== 'object') return;

        // Token create event
        if (raw.txType === undefined && raw.mint && raw.name) {
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
      this.tradesConnected = false;
      this.tradesReconnectAttempts++;
      const delay = Math.min(
        PumpFunProvider.BASE_RECONNECT_MS * Math.pow(2, this.tradesReconnectAttempts - 1),
        PumpFunProvider.MAX_RECONNECT_MS,
      );
      console.warn(`[PumpFunProvider] Trades WS closed — reconnecting in ${(delay / 1000).toFixed(0)}s (attempt ${this.tradesReconnectAttempts})`);
      this.tradesReconnectTimer = setTimeout(() => this.connectTrades(), delay);
    };

    ws.onerror = () => {
      // onclose will fire after this, which handles reconnection
      ws.close();
    };
  }

  private disconnectTrades(): void {
    if (this.tradesReconnectTimer) {
      clearTimeout(this.tradesReconnectTimer);
      this.tradesReconnectTimer = null;
    }
    if (this.tradesWs) {
      this.tradesWs.close();
      this.tradesWs = null;
    }
    this.tradesConnected = false;
    this.tradesReconnectAttempts = 0;
  }

  private handleTokenCreate(raw: any): void {
    const tokenName = raw.name || 'Unknown';
    const tokenSymbol = raw.symbol || '???';
    const isAgent = isAgentLaunch(tokenName, tokenSymbol);

    const tokenAddress = raw.mint as string;
    this.tokenCache.set(tokenAddress, { name: tokenName, symbol: tokenSymbol });

    const category = isAgent ? 'agentLaunches' : 'launches';
    this.counts[category]++;

    const event: DataProviderEvent = {
      id: raw.signature || tokenAddress,
      category,
      providerId: 'pumpfun',
      chain: 'solana',
      timestamp: Date.now(),
      label: tokenSymbol,
      amount: raw.initialBuy ? raw.initialBuy / 1e9 : undefined,
      nativeSymbol: 'SOL',
      address: raw.traderPublicKey || '',
      tokenAddress,
    };

    this.emitEvent(event);

    const rawEvent: RawEvent = {
      type: 'tokenCreate',
      data: {
        tokenAddress,
        chain: 'solana',
        name: tokenName,
        symbol: tokenSymbol,
        uri: raw.uri || '',
        creatorAddress: raw.traderPublicKey || '',
        initialBuy: raw.initialBuy || 0,
        marketCap: raw.marketCapSol || 0,
        nativeSymbol: 'SOL',
        signature: raw.signature || '',
        timestamp: Date.now(),
        isAgent,
      },
    };

    this.emitRaw(rawEvent);
  }

  private handleTrade(raw: any): void {
    const tokenAddress = raw.mint as string;
    const cached = this.tokenCache.get(tokenAddress);
    const nativeAmount = raw.solAmount ? raw.solAmount / 1e9 : 0;

    // Update accumulator
    const existing = this.tokenAcc.get(tokenAddress);
    if (existing) {
      existing.trades++;
      existing.volume += nativeAmount;
      existing.volumeSol += nativeAmount;
      if (cached) {
        existing.name = cached.name;
        existing.symbol = cached.symbol;
      }
    } else {
      this.tokenAcc.set(tokenAddress, {
        tokenAddress,
        mint: tokenAddress,
        chain: 'solana',
        name: cached?.name || tokenAddress.slice(0, 8),
        symbol: cached?.symbol || '???',
        trades: 1,
        volume: nativeAmount,
        volumeSol: nativeAmount,
        nativeSymbol: 'SOL',
        source: 'pumpfun',
      });
    }

    // Update trader edges
    const traderKey = `${raw.traderPublicKey}:${tokenAddress}`;
    const existingEdge = this.traderAcc.get(traderKey);
    if (existingEdge) {
      existingEdge.trades++;
      existingEdge.volume += nativeAmount;
      existingEdge.volumeSol += nativeAmount;
    } else {
      this.traderAcc.set(traderKey, {
        trader: raw.traderPublicKey || '',
        tokenAddress,
        mint: tokenAddress,
        chain: 'solana',
        trades: 1,
        volume: nativeAmount,
        volumeSol: nativeAmount,
        source: 'pumpfun',
      });
    }

    this.counts.trades++;
    this.totalVolumeAcc += nativeAmount;

    const event: DataProviderEvent = {
      id: raw.signature || `${tokenAddress}-${Date.now()}`,
      category: 'trades',
      providerId: 'pumpfun',
      chain: 'solana',
      timestamp: Date.now(),
      label: cached?.symbol || '???',
      amount: nativeAmount,
      nativeSymbol: 'SOL',
      address: raw.traderPublicKey || '',
      tokenAddress,
      meta: { txType: raw.txType },
    };

    this.emitEvent(event);

    const rawEvent: RawEvent = {
      type: 'trade',
      data: {
        tokenAddress,
        chain: 'solana',
        signature: raw.signature || '',
        traderAddress: raw.traderPublicKey || '',
        txType: raw.txType,
        tokenAmount: raw.tokenAmount || 0,
        nativeAmount: raw.solAmount || 0,
        nativeSymbol: 'SOL',
        marketCap: raw.marketCapSol || 0,
        timestamp: Date.now(),
        name: cached?.name,
        symbol: cached?.symbol,
        meta: {
          newTokenBalance: raw.newTokenBalance || 0,
          bondingCurveKey: raw.bondingCurveKey || '',
          vTokensInBondingCurve: raw.vTokensInBondingCurve || 0,
          vSolInBondingCurve: raw.vSolInBondingCurve || 0,
        },
      },
    };

    this.emitRaw(rawEvent);
  }

  // =========================================================================
  // Solana RPC WebSocket (claims)
  // =========================================================================

  private connectClaims(): void {
    if (this.claimsWs?.readyState === WebSocket.OPEN) return;

    if (!this.rpcWsUrl) {
      console.warn('[PumpFunProvider] RPC WebSocket URL not configured, skipping claims connection');
      this.claimsConnected = false;
      return;
    }

    const ws = new WebSocket(this.rpcWsUrl);
    this.claimsWs = ws;

    ws.onopen = () => {
      console.log('[PumpFunProvider] Claims WS connected');
      this.claimsConnected = true;
      this.claimsReconnectAttempts = 0;
      // Subscribe to logs for each PumpFun program
      const programs = [PUMP_PROGRAM_ID, PUMP_AMM_PROGRAM_ID, PUMP_FEE_PROGRAM_ID];
      for (const programId of programs) {
        const id = this.solanaNextId++;
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            method: 'logsSubscribe',
            params: [{ mentions: [programId] }, { commitment: 'confirmed' }],
          }),
        );
      }
    };

    ws.onmessage = (event) => {
      if (this._paused || !this._enabled) return;

      try {
        const msg = JSON.parse(event.data);

        // Handle subscription confirmations
        if (msg.result !== undefined && typeof msg.result === 'number') {
          this.solanaSubIds.push(msg.result);
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

          this.parseAndHandleClaim(logs, signature, slot);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      this.claimsConnected = false;
      this.solanaSubIds = [];
      this.claimsReconnectAttempts++;
      const delay = Math.min(
        PumpFunProvider.BASE_RECONNECT_MS * Math.pow(2, this.claimsReconnectAttempts - 1),
        PumpFunProvider.MAX_RECONNECT_MS,
      );
      console.warn(`[PumpFunProvider] Claims WS closed — reconnecting in ${(delay / 1000).toFixed(0)}s (attempt ${this.claimsReconnectAttempts})`);
      this.claimsReconnectTimer = setTimeout(() => this.connectClaims(), delay);
    };

    ws.onerror = () => {
      // onclose will fire after this, which handles reconnection
      ws.close();
    };
  }

  private disconnectClaims(): void {
    if (this.claimsReconnectTimer) {
      clearTimeout(this.claimsReconnectTimer);
      this.claimsReconnectTimer = null;
    }

    const ws = this.claimsWs;
    if (ws?.readyState === WebSocket.OPEN) {
      for (const subId of this.solanaSubIds) {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: this.solanaNextId++,
            method: 'logsUnsubscribe',
            params: [subId],
          }),
        );
      }
    }

    if (this.claimsWs) {
      this.claimsWs.close();
      this.claimsWs = null;
    }

    this.claimsConnected = false;
    this.claimsReconnectAttempts = 0;
    this.solanaSubIds = [];
  }

  private parseAndHandleClaim(logs: string[], signature: string, slot: number): void {
    let claimType: 'wallet' | 'github' | null = null;
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

    if (!claimType) return;

    // Use signature slice as claimer identifier
    const claimer = signature.slice(0, 44);

    // First-claim detection
    const isFirstClaim = !this.seenWallets.has(claimer);
    if (isFirstClaim) {
      this.seenWallets.add(claimer);
    }

    // Determine category
    const isPrimary = claimType === 'github' ? 'claimsGithub' : 'claimsWallet';
    const primaryLabel = claimType === 'github' ? 'GitHub Claim' : 'Wallet Claim';

    // Emit primary claim event
    const event: DataProviderEvent = {
      id: signature,
      category: isPrimary,
      providerId: 'pumpfun',
      chain: 'solana',
      timestamp: Date.now(),
      label: primaryLabel,
      address: claimer,
      meta: { programId, isFirstClaim },
    };

    this.counts[isPrimary]++;
    this.emitEvent(event);

    const rawEvent: RawEvent = {
      type: 'claim',
      data: {
        signature,
        chain: 'solana',
        slot,
        timestamp: Date.now(),
        claimType,
        programId: programId || (claimType === 'github' ? PUMP_FEE_PROGRAM_ID : PUMP_PROGRAM_ID),
        claimer,
        isFirstClaim,
        logs,
      },
    };

    this.emitRaw(rawEvent);

    // Emit first-claim event if applicable
    if (isFirstClaim) {
      this.counts.claimsFirst++;

      const firstEvent: DataProviderEvent = {
        id: `${signature}-first`,
        category: 'claimsFirst',
        providerId: 'pumpfun',
        chain: 'solana',
        timestamp: Date.now(),
        label: `First ${claimType === 'github' ? 'GitHub' : 'Wallet'} Claim`,
        address: claimer,
        meta: { programId },
      };

      this.emitEvent(firstEvent);
    }
  }
}
