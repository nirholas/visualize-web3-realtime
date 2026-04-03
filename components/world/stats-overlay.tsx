'use client';

import { memo, useMemo } from 'react';
import type { VisualizerTx, Chain, TxType } from '@/types/visualizer';
import { CHAIN_MAP, TX_TYPE_MAP } from '@/types/visualizer';

function fmt(n: number, prefix = ''): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${prefix}${(n / 1000).toFixed(1)}K`;
  return `${prefix}${Math.round(n)}`;
}

interface StatsOverlayProps {
  transactions: VisualizerTx[];
  totalCount: number;
  totalVolume: number;
}

export const StatsOverlay = memo<StatsOverlayProps>(({ transactions, totalCount, totalVolume }) => {
  const { chainBreakdown, typeBreakdown } = useMemo(() => {
    const chains = new Map<Chain, { count: number; volume: number }>();
    const types = new Map<TxType, { count: number; volume: number }>();

    for (const tx of transactions) {
      const c = chains.get(tx.chain) ?? { count: 0, volume: 0 };
      c.count++;
      c.volume += tx.amount;
      chains.set(tx.chain, c);

      const t = types.get(tx.type) ?? { count: 0, volume: 0 };
      t.count++;
      t.volume += tx.amount;
      types.set(tx.type, t);
    }

    return { chainBreakdown: chains, typeBreakdown: types };
  }, [transactions]);

  return (
    <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
      {/* Totals */}
      <div className="flex gap-1.5">
        <Pill label="Txs" value={fmt(totalCount)} />
        <Pill label="Volume" value={fmt(totalVolume, '$')} />
        <Pill label="Buffer" value={String(transactions.length)} />
      </div>

      {/* Chain breakdown */}
      <div className="flex gap-1">
        {Array.from(chainBreakdown.entries()).map(([chain, data]) => {
          const conf = CHAIN_MAP.get(chain);
          return (
            <span
              key={chain}
              className="flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px]
                         bg-white/[0.03] border border-white/[0.05] rounded"
              style={{ color: conf?.color ?? '#888' }}
            >
              {conf?.icon} {data.count}
            </span>
          );
        })}
      </div>

      {/* Type breakdown */}
      <div className="flex gap-1">
        {Array.from(typeBreakdown.entries()).map(([type, data]) => {
          const conf = TX_TYPE_MAP.get(type);
          return (
            <span
              key={type}
              className="flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px]
                         bg-white/[0.03] border border-white/[0.05] rounded"
              style={{ color: conf?.color ?? '#666' }}
            >
              {type} {data.count}
            </span>
          );
        })}
      </div>
    </div>
  );
});

StatsOverlay.displayName = 'StatsOverlay';

// ─── Pill ──────────────────────────────────────────────────────────────

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1 px-2 py-1 font-mono
                    bg-white/[0.03] border border-white/[0.05] rounded">
      <span className="text-[9px] uppercase tracking-wider text-white/25">{label}</span>
      <span className="text-[12px] font-semibold text-white/80">{value}</span>
    </div>
  );
}
