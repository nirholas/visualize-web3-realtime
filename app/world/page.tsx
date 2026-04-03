'use client';

import { useState } from 'react';
import type { Chain, DataSource, TxType } from '@/types/visualizer';
import { TxVisualizer } from '@/components/world/tx-visualizer';
import { ChainFilters } from '@/components/world/chain-filters';
import { LiveFeed } from '@/components/world/live-feed';
import { StatsOverlay } from '@/components/world/stats-overlay';
import { useTxStream } from '@/hooks/useTxStream';

export default function WorldPage() {
  const [chains, setChains] = useState<Chain[]>(['solana']);
  const [sources, setSources] = useState<DataSource[]>(['pumpfun']);
  const [txTypes, setTxTypes] = useState<TxType[]>(['buy', 'sell', 'create']);
  const [rate, setRate] = useState(4);
  const [paused, setPaused] = useState(false);

  const { transactions, totalCount, totalVolume } = useTxStream({
    chains,
    sources,
    txTypes,
    rate,
    paused,
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#08080f' }}>
      {/* Canvas visualization */}
      <TxVisualizer transactions={transactions} />

      {/* Filter controls — top left */}
      <ChainFilters
        selectedChains={chains}
        onChainsChange={setChains}
        selectedSources={sources}
        onSourcesChange={setSources}
        selectedTypes={txTypes}
        onTypesChange={setTxTypes}
        rate={rate}
        onRateChange={setRate}
        paused={paused}
        onPausedChange={setPaused}
      />

      {/* Stats — top right */}
      <StatsOverlay
        transactions={transactions}
        totalCount={totalCount}
        totalVolume={totalVolume}
      />

      {/* Live feed — bottom right */}
      <LiveFeed transactions={transactions} />

      {/* Label */}
      <span className="absolute bottom-3 left-3 z-10 font-mono text-[9px] text-white/15
                       tracking-wider pointer-events-none select-none">
        Real-time Transaction Visualizer
      </span>
    </div>
  );
}
