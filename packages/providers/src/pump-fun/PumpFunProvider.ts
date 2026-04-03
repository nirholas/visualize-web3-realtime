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
  private totalVolumeSol = 0;

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
      .sort((a, b) => b.volumeSol - a.volumeSol)
      .slice(0, this.maxTopTokens);

    const topMints = new Set(topTokens.map((t) => t.mint));
    const traderEdges = Array.from(this.traderAcc.values())
      .filter((e) => topMints.has(e.mint))
      .slice(0, 5000);

    return {
      counts: { ...this.counts },
      totalVolumeSol: this.totalVolumeSol,
      totalTransactions: Object.values(this.counts).reduce((a, b) => a + b, 0),
      totalAgents: this.tokenAcc.size,
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

  private connectPumpPortal(): void {
    if (this.pumpPortalWs?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(PUMP_PORTAL_WS);
    this.pumpPortalWs = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
      ws.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: ['allTrades'] }));
    };

    ws.onmessage = (event) => {
      if (this._paused || !this._enabled) return;

      try {
        const raw = JSON.parse(event.data);
        if (!raw || typeof raw !== 'object') return;

        // Token launch event
        if (raw.txType === undefined && raw.mint && raw.name) {
          const tokenName = raw.name || 'Unknown';
          const tokenSymbol = raw.symbol || '???';
          const token: Token = {
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

          this.tokenCache.set(token.mint!, {
            name: token.name,
            symbol: token.symbol,
          });
          this.totalTokens++;

          const isAgent = token.isAgent;
          this.emitEvent({
            id: `pumpfun-${++globalIdCounter}`,
            category: isAgent ? 'agentLaunches' : 'launches',
            source: 'pumpfun',
            timestamp: Date.now(),
            label: token.symbol,
            address: token.traderPublicKey || '',
            mint: token.mint,
            meta: { token },
          });

          this.emitRaw({
            type: 'tokenCreate',
            data: token,
          });
        }
        // Trade event
        else if (raw.txType === 'buy' || raw.txType === 'sell') {
          const cached = this.tokenCache.get(raw.mint);
          const trade: Trade = {
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

          const solAmount = (trade.solAmount ?? 0) / 1e9;
          const tradeMint = trade.mint!;

          // Update top tokens accumulator
          const existing = this.tokenAcc.get(tradeMint);
          if (existing) {
            existing.trades++;
            existing.volumeSol += solAmount;
            if (cached) {
              existing.name = cached.name;
              existing.symbol = cached.symbol;
            }
          } else {
            this.tokenAcc.set(tradeMint, {
              mint: tradeMint,
              name: cached?.name || tradeMint.slice(0, 8),
              symbol: cached?.symbol || '???',
              trades: 1,
              volumeSol: solAmount,
            });
          }

          // Update trader edges
          const topTokens = Array.from(this.tokenAcc.values())
            .sort((a, b) => b.volumeSol - a.volumeSol)
            .slice(0, MAX_TOP_TOKENS);
          const topMints = new Set(topTokens.map((t) => t.mint));

          const traderPubkey = trade.traderPublicKey!;
          const traderKey = `${traderPubkey}:${tradeMint}`;
          const existingEdge = this.traderAcc.get(traderKey);
          if (existingEdge) {
            existingEdge.trades++;
            existingEdge.volumeSol += solAmount;
          } else {
            this.traderAcc.set(traderKey, {
              trader: traderPubkey,
              mint: tradeMint,
              trades: 1,
              volumeSol: solAmount,
            });
          }

          this.totalTrades++;
          this.totalVolumeSol += solAmount;

          this.emitEvent({
            id: `pumpfun-${++globalIdCounter}`,
            category: 'trades',
            source: 'pumpfun',
            timestamp: Date.now(),
            label: trade.symbol || 'Trade',
            amount: solAmount,
            address: trade.traderPublicKey || '',
            mint: trade.mint,
            meta: { txType: trade.txType },
          });

          this.emitRaw({
            type: 'trade',
            data: trade,
          });
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      const timeoutId = setTimeout(() => this.connectPumpPortal(), 3000);
      this.reconnectTimeoutIds.push(timeoutId);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  private connectHelius(): void {
    if (this.heliusWs?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(HELIUS_WS);
    this.heliusWs = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'logsSubscribe',
          params: [{ mentions: [CLAIMS_PROGRAM] }, { commitment: 'confirmed' }],
        })
      );
    };

    ws.onmessage = (event) => {
      if (this._paused || !this._enabled) return;

      try {
        const raw = JSON.parse(event.data);
        if (raw.method !== 'logsNotification') return;

        const claim = parseClaimInstruction(raw);
        if (!claim) return;

        this.totalClaims++;
        this.totalVolumeSol += claim.solAmount ?? 0;

        this.emitEvent({
          id: `pumpfun-${++globalIdCounter}`,
          category: 'claimsWallet',
          source: 'pumpfun',
          timestamp: Date.now(),
          label: 'Wallet Claim',
          address: claim.wallet || '',
          meta: { solAmount: claim.solAmount },
        });

        this.emitRaw({
          type: 'claim',
          data: claim,
        });
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      const timeoutId = setTimeout(() => this.connectHelius(), 3000);
      this.reconnectTimeoutIds.push(timeoutId);
    };

    ws.onerror = () => {
      ws.close();
    };
  }
}
