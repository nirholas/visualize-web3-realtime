'use client';

import { memo } from 'react';
import type { Chain, DataSource, TxType } from '@/types/visualizer';
import { CHAINS, SOURCES, TX_TYPES } from '@/types/visualizer';
import { cn } from '@/lib/utils';

// ─── Dropdown ──────────────────────────────────────────────────────────

function FilterDropdown<T extends string>({
  label,
  options,
  selected,
  onChange,
  multi = false,
}: {
  label: string;
  options: { id: T; label: string; color?: string }[];
  selected: T[];
  onChange: (values: T[]) => void;
  multi?: boolean;
}) {
  const toggle = (id: T) => {
    if (!multi) {
      onChange([id]);
      return;
    }
    if (selected.includes(id)) {
      const next = selected.filter(v => v !== id);
      if (next.length > 0) onChange(next);
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[9px] font-mono uppercase tracking-[0.08em] text-text-muted">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map(opt => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={cn(
                'px-2.5 py-1 text-[11px] font-mono rounded-md border transition-all duration-150',
                active
                  ? 'border-white/20 text-white bg-white/8'
                  : 'border-white/5 text-text-secondary bg-white/[0.02] hover:bg-white/5 hover:border-white/10',
              )}
              style={active && opt.color ? { borderColor: `${opt.color}40`, color: opt.color } : undefined}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Rate slider ───────────────────────────────────────────────────────

function RateSlider({ rate, onChange }: { rate: number; onChange: (r: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono uppercase tracking-[0.08em] text-text-muted">Speed</span>
      <input
        type="range"
        min={1}
        max={20}
        value={rate}
        onChange={e => onChange(Number(e.target.value))}
        className="w-16 h-1 accent-accent-green bg-white/10 rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-accent-green [&::-webkit-slider-thumb]:appearance-none"
      />
      <span className="text-[10px] font-mono text-text-secondary">{rate}/s</span>
    </div>
  );
}

// ─── Main filters bar ──────────────────────────────────────────────────

interface ChainFiltersProps {
  selectedChains: Chain[];
  onChainsChange: (chains: Chain[]) => void;
  selectedSources: DataSource[];
  onSourcesChange: (sources: DataSource[]) => void;
  selectedTypes: TxType[];
  onTypesChange: (types: TxType[]) => void;
  rate: number;
  onRateChange: (rate: number) => void;
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
}

export const ChainFilters = memo<ChainFiltersProps>(({
  selectedChains,
  onChainsChange,
  selectedSources,
  onSourcesChange,
  selectedTypes,
  onTypesChange,
  rate,
  onRateChange,
  paused,
  onPausedChange,
}) => {
  return (
    <div className="absolute top-3 left-3 z-20 flex flex-col gap-3 p-3 rounded-lg
                    bg-black/60 backdrop-blur-md border border-white/[0.06] max-w-[320px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.1em] text-text-secondary">
          Filters
        </span>
        <button
          onClick={() => onPausedChange(!paused)}
          className={cn(
            'px-2 py-0.5 text-[10px] font-mono rounded border transition-all',
            paused
              ? 'border-accent-green/30 text-accent-green bg-accent-green-dim'
              : 'border-white/10 text-text-secondary bg-white/[0.03] hover:bg-white/5',
          )}
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>

      <FilterDropdown<Chain>
        label="Chains"
        options={CHAINS.map(c => ({ id: c.id, label: `${c.icon} ${c.label}`, color: c.color }))}
        selected={selectedChains}
        onChange={onChainsChange}
        multi
      />

      <FilterDropdown<DataSource>
        label="Source"
        options={SOURCES.map(s => ({ id: s.id, label: s.label }))}
        selected={selectedSources}
        onChange={onSourcesChange}
      />

      <FilterDropdown<TxType>
        label="Transaction Type"
        options={TX_TYPES.map(t => ({ id: t.id, label: t.label, color: t.color }))}
        selected={selectedTypes}
        onChange={onTypesChange}
        multi
      />

      <RateSlider rate={rate} onChange={onRateChange} />
    </div>
  );
});

ChainFilters.displayName = 'ChainFilters';
