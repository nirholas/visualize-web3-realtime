'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VisualizerTx } from '@/types/visualizer';
import { CHAIN_MAP, TX_TYPE_MAP } from '@/types/visualizer';
import { cn } from '@/lib/utils';

// ─── Helpers ───────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return 'now';
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

function formatAmount(amount: number): string {
  if (amount >= 10000) return `$${(amount / 1000).toFixed(1)}k`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}k`;
  if (amount >= 1) return `$${amount.toFixed(2)}`;
  return `$${amount.toFixed(3)}`;
}

// ─── TX Card ───────────────────────────────────────────────────────────

const TxCard = memo<{ tx: VisualizerTx; isNew: boolean }>(({ tx, isNew }) => {
  const chain = CHAIN_MAP.get(tx.chain);
  const txType = TX_TYPE_MAP.get(tx.type);

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, x: 12 } : false}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[11px]
                 bg-white/[0.03] border border-white/[0.05] rounded-md"
    >
      {/* Type indicator dot */}
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: txType?.color ?? '#666' }}
      />

      {/* Type label */}
      <span
        className="shrink-0 text-[9px] uppercase tracking-wide font-semibold"
        style={{ color: txType?.color ?? '#666' }}
      >
        {tx.type}
      </span>

      {/* Token */}
      <span className="flex-1 truncate text-white/70">{tx.token}</span>

      {/* Chain badge */}
      <span
        className="shrink-0 text-[8px] uppercase tracking-wider px-1 py-0.5 rounded
                   bg-white/[0.04] border border-white/[0.06]"
        style={{ color: chain?.color ?? '#888' }}
      >
        {chain?.icon} {tx.chain === 'bnbchain' ? 'BNB' : tx.chain.slice(0, 3).toUpperCase()}
      </span>

      {/* Amount */}
      <span className={cn(
        'shrink-0 font-semibold',
        tx.type === 'sell' ? 'text-[#ff3b3b]' : 'text-[#00ff6a]',
      )}>
        {formatAmount(tx.amount)}
      </span>

      {/* Time */}
      <span className="shrink-0 text-[9px] text-white/20">{timeAgo(tx.timestamp)}</span>
    </motion.div>
  );
});

TxCard.displayName = 'TxCard';

// ─── Feed ──────────────────────────────────────────────────────────────

interface LiveFeedProps {
  transactions: VisualizerTx[];
  maxVisible?: number;
}

export const LiveFeed = memo<LiveFeedProps>(({ transactions, maxVisible = 15 }) => {
  const visible = transactions.slice(0, maxVisible);

  if (visible.length === 0) return null;

  return (
    <div className="absolute right-3 bottom-14 z-20 flex flex-col gap-1 w-[310px] max-h-[50vh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 py-1 font-mono text-[9px] font-semibold
                      uppercase tracking-[0.08em] text-white/30">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00ff6a] animate-pulse" />
        Live Transactions
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((tx) => (
          <TxCard key={tx.id} tx={tx} isNew={tx.timestamp > Date.now() - 2000} />
        ))}
      </AnimatePresence>
    </div>
  );
});

LiveFeed.displayName = 'LiveFeed';
