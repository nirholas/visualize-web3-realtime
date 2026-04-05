'use client';

import { presets } from '../presets';

interface PresetSelectorProps {
  current: string;
  onSelect: (presetName: string) => void;
}

export function PresetSelector({ current, onSelect }: PresetSelectorProps) {
  return (
    <select
      value={current}
      onChange={(e) => onSelect(e.target.value)}
      className="bg-slate-800/80 text-slate-200 text-xs px-3 py-1.5 rounded border border-white/10
        focus:outline-none focus:border-blue-400/50 cursor-pointer font-mono
        hover:bg-slate-700/80 transition-colors"
    >
      {presets.map((p) => (
        <option key={p.name} value={p.name}>
          {p.name} — {p.description}
        </option>
      ))}
    </select>
  );
}
