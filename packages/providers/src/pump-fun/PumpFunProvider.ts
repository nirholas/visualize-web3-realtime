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
import { BoundedMap, BoundedSet, WebSocketManager, safeJsonParse, isObject, getString, getNumber } from '../shared';

export interface PumpFunProviderOptions {
  rpcWsUrl?: string;
  maxEvents?: number;
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
  '7a027f010ebf0caf',
  'a537817004b3ca28',
  'e2d6f62107f293e5',
  'e8f5c2eeeada3a59',
]);

const GITHUB_CLAIM_DISCRIMINATOR = '3212c141edd2eaec';

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

  private eventListeners = new Set<(event: DataProviderEvent) => void>();
  private rawListeners = new Set<(event: RawEvent) => void>();
  private maxEvents: number;
  private maxTopTokens: number;
  private rpcWsUrl: string;
  private _paused = false;
  private _enabled = true;
  private tradesWsManager: WebSocketManager | null = null;
  private claimsWsManager: WebSocketManager | null = null;
  private tradesConnected = false;
  private claimsConnected = false;
  private tokenCache = new BoundedMap<string, { name: string; symbol: string }>(10_000);
  private tokenAcc = new BoundedMap<string, TopToken>(10_000);
  private traderAcc = new BoundedMap<string, TraderEdge>(50_000);
  private seenWallets = new BoundedSet<string>(50_000);
  private recentEvents: DataProviderEvent[] = [];
  private rawEvents: RawEvent[] = [];
  private counts = { launches: 0, agentLaunches: 0, trades: 0, claimsWallet: 0, claimsGithub: 0, claimsFirst: 0 };
  private totalVolumeSol = 0;
  private solanaSubIds: number[] = [];
  private solanaNextId = 1;

  constructor(options: PumpFunProviderOptions = {}) {
    this.maxEvents = options.maxEvents ?? 200;
    this.maxTopTokens = options.maxTopTokens ?? 8;
    this.rpcWsUrl = options.rpcWsUrl ?? DEFAULT_SOLANA_RPC_WS;
    const sourceConfig = SOURCE_CONFIGS.find((s) => s.id === 'pumpfun');
    this.sourceConfig = sourceConfig || ({ id: 'pumpfun', label: 'PumpFun', color: '#a78bfa', icon: '⚡', description: 'Solana token launches & trades via PumpPortal' } as SourceConfig);
    this.categories = getCategoriesForSource('pumpfun');
  }

  connect(): void { this.connectTrades(); this.connectClaims(); }
  disconnect(): void { this.disconnectTrades(); this.disconnectClaims(); }
  setPaused(paused: boolean): void { this._paused = paused; }
  isPaused(): boolean { return this._paused; }
  isEnabled(): boolean { return this._enabled; }
  setEnabled(enabled: boolean): void { this._enabled = enabled; }

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
      totalVolume: { solana: this.totalVolumeSol },
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
    return () => { this.eventListeners.delete(callback); };
  }

  onRawEvent(callback: (event: RawEvent) => void): () => void {
    this.rawListeners.add(callback);
    return () => { this.rawListeners.delete(callback); };
  }

  private emitEvent(event: DataProviderEvent): void {
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > this.maxEvents) this.recentEvents.pop();
    for (const listener of this.eventListeners) listener(event);
  }

  private emitRaw(event: RawEvent): void {
    this.rawEvents.unshift(event);
    if (this.rawEvents.length > this.maxEvents) this.rawEvents.pop();
    for (const listener of this.rawListeners) listener(event);
  }

  private connectTrades(): void {
    if (this.tradesWsManager?.isConnected) return;
    this.tradesWsManager?.disconnect();
    this.tradesWsManager = new WebSocketManager({
      url: PUMPFUN_WS_URL,
      baseReconnectMs: 3000,
      maxReconnectMs: 60000,
      onStateChange: (state) => {
        this.tradesConnected = state === 'connected';
      },
      onOpen: (ws) => {
        console.log('[PumpFunProvider] Trades WS connected');
        ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
        ws.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: ['allTrades'] }));
      },
      onMessage: (data) => {
        if (this._paused || !this._enabled) return;
        const raw = safeJsonParse(data);
        if (!isObject(raw)) return;
        const txType = getString(raw, 'txType', '');
        const mint = getString(raw, 'mint', '');
        const name = getString(raw, 'name', '');
        if (!txType && mint && name) this.handleTokenCreate(raw);
        else if (txType === 'buy' || txType === 'sell') this.handleTrade(raw);
      },
      onClose: (_code, _reason) => {
        console.warn('[PumpFunProvider] Trades WS closed — will reconnect');
      },
      onError: (err) => {
        console.warn('[PumpFunProvider] Trades WS error:', err.message);
      },
    });
    this.tradesWsManager.connect();
  }

  private disconnectTrades(): void {
    this.tradesWsManager?.disconnect();
    this.tradesWsManager = null;
    this.tradesConnected = false;
  }

  private handleTokenCreate(raw: Record<string, unknown>): void {
    const tokenName = getString(raw, 'name', 'Unknown');
    const tokenSymbol = getString(raw, 'symbol', '???');
    const isAgent = isAgentLaunch(tokenName, tokenSymbol);
    const mint = getString(raw, 'mint', '');
    if (!mint) return;
    this.tokenCache.set(mint, { name: tokenName, symbol: tokenSymbol });
    const category = isAgent ? 'agentLaunches' : 'launches';
    this.counts[category]++;
    const initialBuy = getNumber(raw, 'initialBuy', 0);
    const signature = getString(raw, 'signature', '');
    const traderPublicKey = getString(raw, 'traderPublicKey', '');

    this.emitEvent({
      id: signature || mint,
      providerId: this.id,
      category,
      chain: 'solana',
      timestamp: Date.now(),
      label: tokenSymbol,
      amount: initialBuy ? initialBuy / 1e9 : undefined,
      nativeSymbol: 'SOL',
      address: traderPublicKey,
      tokenAddress: mint,
    });

    this.emitRaw({
      type: 'tokenCreate',
      data: {
        tokenAddress: mint,
        name: tokenName,
        symbol: tokenSymbol,
        chain: 'solana',
        uri: getString(raw, 'uri', ''),
        creatorAddress: traderPublicKey,
        initialBuy,
        marketCap: getNumber(raw, 'marketCapSol', 0),
        nativeSymbol: 'SOL',
        signature,
        timestamp: Date.now(),
        isAgent,
      },
    });
  }

  private handleTrade(raw: Record<string, unknown>): void {
    const mint = getString(raw, 'mint', '');
    if (!mint) return;
    const cached = this.tokenCache.get(mint);
    const solAmount = getNumber(raw, 'solAmount', 0) / 1e9;
    const txType = getString(raw, 'txType', '');
    const signature = getString(raw, 'signature', '');
    const traderPublicKey = getString(raw, 'traderPublicKey', '');

    const existing = this.tokenAcc.get(mint);
    if (existing) {
      existing.trades++;
      existing.volume += solAmount;
      existing.volumeSol = (existing.volumeSol ?? 0) + solAmount;
      if (cached) { existing.name = cached.name; existing.symbol = cached.symbol; }
    } else {
      this.tokenAcc.set(mint, {
        tokenAddress: mint, name: cached?.name || mint.slice(0, 8), symbol: cached?.symbol || '???',
        chain: 'solana', trades: 1, volume: solAmount, nativeSymbol: 'SOL',
      });
    }

    const traderKey = `${traderPublicKey}:${mint}`;
    const existingEdge = this.traderAcc.get(traderKey);
    if (existingEdge) { existingEdge.trades++; existingEdge.volume += solAmount; }
    else {
      this.traderAcc.set(traderKey, {
        trader: traderPublicKey, tokenAddress: mint,
        chain: 'solana', trades: 1, volume: solAmount,
      });
    }

    this.counts.trades++;
    this.totalVolumeSol += solAmount;

    this.emitEvent({
      id: signature || `${mint}-${Date.now()}`,
      providerId: this.id,
      category: 'trades',
      chain: 'solana',
      timestamp: Date.now(),
      label: cached?.symbol || '???',
      amount: solAmount,
      nativeSymbol: 'SOL',
      address: traderPublicKey,
      tokenAddress: mint,
      meta: { txType },
    });

    this.emitRaw({
      type: 'trade',
      data: {
        tokenAddress: mint,
        chain: 'solana',
        signature,
        traderAddress: traderPublicKey,
        txType,
        tokenAmount: getNumber(raw, 'tokenAmount', 0),
        nativeAmount: solAmount,
        nativeSymbol: 'SOL',
        marketCap: getNumber(raw, 'marketCapSol', 0),
        timestamp: Date.now(),
        name: cached?.name,
        symbol: cached?.symbol,
      },
    });
  }

  private connectClaims(): void {
    if (this.claimsWsManager?.isConnected) return;
    if (!this.rpcWsUrl) { this.claimsConnected = false; return; }
    this.claimsWsManager?.disconnect();
    this.claimsWsManager = new WebSocketManager({
      url: this.rpcWsUrl,
      baseReconnectMs: 3000,
      maxReconnectMs: 60000,
      onStateChange: (state) => {
        this.claimsConnected = state === 'connected';
        if (state !== 'connected') this.solanaSubIds = [];
      },
      onOpen: (ws) => {
        console.log('[PumpFunProvider] Claims WS connected');
        for (const programId of [PUMP_PROGRAM_ID, PUMP_AMM_PROGRAM_ID, PUMP_FEE_PROGRAM_ID]) {
          const id = this.solanaNextId++;
          ws.send(JSON.stringify({ jsonrpc: '2.0', id, method: 'logsSubscribe', params: [{ mentions: [programId] }, { commitment: 'confirmed' }] }));
        }
      },
      onMessage: (data) => {
        if (this._paused || !this._enabled) return;
        const msg = safeJsonParse(data);
        if (!isObject(msg)) {
          console.warn('[PumpFunProvider] Claims WS received non-object message');
          return;
        }
        if (msg.result !== undefined && typeof msg.result === 'number') { this.solanaSubIds.push(msg.result); return; }
        if (getString(msg, 'method', '') === 'logsNotification') {
          const params = msg.params;
          if (!isObject(params)) return;
          const result = params.result;
          if (!isObject(result)) return;
          const value = result.value;
          if (!isObject(value)) return;
          if (value.err !== null) return;
          const logs = Array.isArray(value.logs) ? value.logs as string[] : [];
          const signature = getString(value, 'signature', '');
          const context = isObject(result.context) ? result.context : {};
          const slot = getNumber(context as Record<string, unknown>, 'slot', 0);
          this.parseAndHandleClaim(logs, signature, slot);
        }
      },
      onClose: (_code, _reason) => {
        console.warn('[PumpFunProvider] Claims WS closed — will reconnect');
      },
      onError: (err) => {
        console.warn('[PumpFunProvider] Claims WS error:', err.message);
      },
    });
    this.claimsWsManager.connect();
  }

  private disconnectClaims(): void {
    if (this.claimsWsManager) {
      for (const subId of this.solanaSubIds) {
        this.claimsWsManager.send(JSON.stringify({ jsonrpc: '2.0', id: this.solanaNextId++, method: 'logsUnsubscribe', params: [subId] }));
      }
      this.claimsWsManager.disconnect();
      this.claimsWsManager = null;
    }
    this.claimsConnected = false;
    this.solanaSubIds = [];
  }

  private parseAndHandleClaim(logs: string[], signature: string, slot: number): void {
    let claimType: 'wallet' | 'github' | null = null;
    let programId = '';
    for (const log of logs) {
      if (log.startsWith('Program data: ')) {
        try {
          const b64 = log.slice('Program data: '.length);
          const bytes = atob(b64);
          let disc = '';
          for (let i = 0; i < Math.min(8, bytes.length); i++) disc += bytes.charCodeAt(i).toString(16).padStart(2, '0');
          if (WALLET_CLAIM_DISCRIMINATORS.has(disc)) { claimType = 'wallet'; break; }
          if (disc === GITHUB_CLAIM_DISCRIMINATOR) { claimType = 'github'; break; }
        } catch (err) {
          console.warn('[PumpFunProvider] Failed to decode base64 claim data:', err instanceof Error ? err.message : String(err));
        }
      }
      if (log.includes(PUMP_FEE_PROGRAM_ID)) programId = PUMP_FEE_PROGRAM_ID;
      else if (log.includes(PUMP_AMM_PROGRAM_ID)) programId = PUMP_AMM_PROGRAM_ID;
      else if (log.includes(PUMP_PROGRAM_ID)) programId = PUMP_PROGRAM_ID;
    }
    if (!claimType) return;
    const claimer = signature.slice(0, 44);
    const isFirstClaim = !this.seenWallets.has(claimer);
    if (isFirstClaim) this.seenWallets.add(claimer);
    const isPrimary = claimType === 'github' ? 'claimsGithub' : 'claimsWallet';
    const primaryLabel = claimType === 'github' ? 'GitHub Claim' : 'Wallet Claim';

    this.counts[isPrimary]++;
    this.emitEvent({
      id: signature, providerId: this.id, category: isPrimary, chain: 'solana',
      timestamp: Date.now(), label: primaryLabel, address: claimer, meta: { programId, isFirstClaim },
    });
    this.emitRaw({
      type: 'claim',
      data: {
        signature, chain: 'solana', slot, timestamp: Date.now(), claimType,
        programId: programId || (claimType === 'github' ? PUMP_FEE_PROGRAM_ID : PUMP_PROGRAM_ID),
        claimer, isFirstClaim, logs,
      },
    });
    if (isFirstClaim) {
      this.counts.claimsFirst++;
      this.emitEvent({
        id: `${signature}-first`, providerId: this.id, category: 'claimsFirst', chain: 'solana',
        timestamp: Date.now(), label: `First ${claimType === 'github' ? 'GitHub' : 'Wallet'} Claim`,
        address: claimer, meta: { programId },
      });
    }
  }
}
