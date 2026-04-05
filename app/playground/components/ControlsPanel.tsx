'use client';

import type { ControlValues } from '../lib/sharing';

interface ControlsPanelProps {
  controls: ControlValues;
  onChange: (controls: ControlValues) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400 tracking-wider uppercase">{label}</label>
        <span className="text-xs text-slate-300 font-mono tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400
          [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(96,165,250,0.5)]
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-slate-400 tracking-wider uppercase">{label}</label>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
          checked ? 'bg-blue-500' : 'bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export function ControlsPanel({ controls, onChange }: ControlsPanelProps) {
  const update = (partial: Partial<ControlValues>) => {
    onChange({ ...controls, ...partial });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-xs font-semibold text-slate-300 tracking-widest uppercase border-b border-white/10 pb-2">
        Controls
      </h3>

      <Slider
        label="Max Nodes"
        value={controls.maxNodes}
        min={100}
        max={10000}
        step={100}
        onChange={(v) => update({ maxNodes: v })}
      />

      <Slider
        label="Charge Strength"
        value={controls.chargeStrength}
        min={-500}
        max={0}
        step={10}
        onChange={(v) => update({ chargeStrength: v })}
      />

      <Slider
        label="Link Distance"
        value={controls.linkDistance}
        min={5}
        max={200}
        step={5}
        onChange={(v) => update({ linkDistance: v })}
      />

      <Slider
        label="Center Pull"
        value={controls.centerPull}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => update({ centerPull: v })}
      />

      <Toggle
        label="Bloom"
        checked={controls.bloom}
        onChange={(v) => update({ bloom: v })}
      />

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 tracking-wider uppercase">Background</label>
        <div className="flex gap-2">
          {['#0a0a12', '#0d001a', '#001a0d', '#1a0a00', '#000000'].map((color) => (
            <button
              key={color}
              onClick={() => update({ background: color })}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                controls.background === color
                  ? 'border-blue-400 scale-110'
                  : 'border-slate-600 hover:border-slate-400'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
