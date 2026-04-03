'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Chain, DataSource, TxType, VisualizerTx } from '@/types/visualizer';

// ─── Demo token names ──────────────────────────────────────────────────

const PUMP_TOKENS = ['BONK', 'DOGE420', 'PEPE2', 'WOJAK', 'GIGACHAD', 'BRETT', 'WIF', 'POPCAT', 'MYRO', 'MOODENG', 'PNUT', 'GOAT', 'FWOG', 'BOOP'];
const EVM_TOKENS = ['PEPE', 'SHIB', 'FLOKI', 'TURBO', 'AIDOGE', 'LADYS', 'BOB', 'TOSHI', 'DEGEN', 'HIGHER'];
const BNB_TOKENS = ['CAKE', 'BAKE', 'BURGER', 'BABYDOGE', 'SAFEMOON', 'FLOKI', 'CATGIRL'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomWallet(): string {
  const chars = '0123456789abcdef';
  const pre = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 16)]).join('');
  const suf = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 16)]).join('');
  return `${pre}...${suf}`;
}

function generateTx(
  chains: Chain[],
  sources: DataSource[],
  txTypes: TxType[],
): VisualizerTx {
  const chain = pickRandom(chains);
  const validSources = sources.filter(s => {
    if (s === 'all') return true;
    if (s === 'pumpfun' || s === 'raydium') return chain === 'solana';
    if (s === 'uniswap') return ['ethereum', 'base', 'arbitrum'].includes(chain);
    if (s === 'pancakeswap') return chain === 'bnbchain';
    return true;
  });
  const source = validSources.length ? pickRandom(validSources) : 'all';
  const type = pickRandom(txTypes);

  let token: string;
  if (chain === 'solana') token = pickRandom(PUMP_TOKENS);
  else if (chain === 'bnbchain') token = pickRandom(BNB_TOKENS);
  else token = pickRandom(EVM_TOKENS);

  // Amounts follow a power-law distribution — lots of small, few large
  const base = Math.random() * Math.random() * 50000;
  const amount = type === 'create' ? Math.random() * 2 + 0.1 : Math.max(0.5, base);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    chain,
    source: source === 'all' ? getDefaultSource(chain) : source,
    type,
    token,
    amount: Math.round(amount * 100) / 100,
    wallet: randomWallet(),
    timestamp: Date.now(),
  };
}

function getDefaultSource(chain: Chain): DataSource {
  switch (chain) {
    case 'solana': return pickRandom(['pumpfun', 'raydium'] as DataSource[]);
    case 'ethereum': case 'base': case 'arbitrum': return 'uniswap';
    case 'bnbchain': return 'pancakeswap';
    default: return 'pumpfun';
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────

interface UseTxStreamOptions {
  chains: Chain[];
  sources: DataSource[];
  txTypes: TxType[];
  /** Transactions per second (demo mode) */
  rate?: number;
  /** Max transactions to keep in buffer */
  maxBuffer?: number;
  paused?: boolean;
}

export function useTxStream({
  chains,
  sources,
  txTypes,
  rate = 4,
  maxBuffer = 200,
  paused = false,
}: UseTxStreamOptions) {
  const [transactions, setTransactions] = useState<VisualizerTx[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const addTx = useCallback((tx: VisualizerTx) => {
    setTransactions(prev => {
      const next = [tx, ...prev];
      return next.length > maxBuffer ? next.slice(0, maxBuffer) : next;
    });
    setTotalCount(c => c + 1);
    setTotalVolume(v => v + tx.amount);
  }, [maxBuffer]);

  useEffect(() => {
    if (paused || chains.length === 0 || txTypes.length === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Variable interval for natural feel
    const tick = () => {
      const tx = generateTx(chains, sources, txTypes);
      addTx(tx);
    };

    // Generate initial batch
    for (let i = 0; i < 8; i++) {
      const tx = generateTx(chains, sources, txTypes);
      tx.timestamp = Date.now() - (8 - i) * 2000;
      addTx(tx);
    }

    const baseInterval = 1000 / rate;
    intervalRef.current = setInterval(() => {
      // Random jitter ±40%
      const jitter = baseInterval * (0.6 + Math.random() * 0.8);
      setTimeout(tick, Math.random() * jitter * 0.3);
      tick();
    }, baseInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [chains, sources, txTypes, rate, paused, addTx]);

  const clear = useCallback(() => {
    setTransactions([]);
    setTotalCount(0);
    setTotalVolume(0);
  }, []);

  return { transactions, totalCount, totalVolume, clear };
}
