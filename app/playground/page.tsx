'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { presets } from './presets';
import { defaultControls, readStateFromUrl } from './lib/sharing';
import type { ControlValues, PlaygroundState } from './lib/sharing';
import { PresetSelector } from './components/PresetSelector';
import { ShareButton } from './components/ShareButton';
import { ControlsPanel } from './components/ControlsPanel';

// Lazy-load heavy components
const PlaygroundEditor = dynamic(
  () => import('./components/PlaygroundEditor').then((m) => ({ default: m.PlaygroundEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm font-mono">
        Loading editor...
      </div>
    ),
  }
);

const PlaygroundPreview = dynamic(
  () => import('./components/PlaygroundPreview').then((m) => ({ default: m.PlaygroundPreview })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm font-mono">
        Loading preview...
      </div>
    ),
  }
);

export default function PlaygroundPage() {
  const [code, setCode] = useState(presets[0].code);
  const [currentPreset, setCurrentPreset] = useState(presets[0].name);
  const [controls, setControls] = useState<ControlValues>(defaultControls);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(45); // percentage
  const isDragging = useRef(false);

  // Restore state from URL hash on mount
  useEffect(() => {
    const saved = readStateFromUrl();
    if (saved) {
      setCode(saved.code);
      setCurrentPreset(saved.preset);
      setControls(saved.controls);
    }
  }, []);

  const handlePresetSelect = useCallback(
    (name: string) => {
      const preset = presets.find((p) => p.name === name);
      if (preset) {
        setCode(preset.code);
        setCurrentPreset(name);
        setError(null);
      }
    },
    []
  );

  const handleReset = useCallback(() => {
    const preset = presets.find((p) => p.name === currentPreset) || presets[0];
    setCode(preset.code);
    setControls(defaultControls);
    setError(null);
    window.history.replaceState(null, '', '/playground');
  }, [currentPreset]);

  const handleFullscreen = useCallback(() => {
    setIsFullscreen((v) => !v);
  }, []);

  const getState = useCallback(
    (): PlaygroundState => ({
      code,
      preset: currentPreset,
      controls,
    }),
    [code, currentPreset, controls]
  );

  const handleError = useCallback((err: string | null) => {
    setError(err);
  }, []);

  // Resizable split pane
  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setLeftPanelWidth(Math.max(20, Math.min(70, pct)));
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a12] text-slate-200 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0e0e1a] shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-semibold tracking-wider text-slate-300 hover:text-white transition-colors"
          >
            swarming
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-sm text-blue-400 font-mono tracking-wide">playground</span>
          <PresetSelector current={currentPreset} onSelect={handlePresetSelect} />
        </div>

        <div className="flex items-center gap-3">
          <ShareButton getState={getState} />

          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-mono text-slate-400 rounded
              border border-white/10 hover:bg-slate-700/50 hover:text-slate-200
              transition-all duration-200"
          >
            Reset
          </button>

          <button
            onClick={handleFullscreen}
            className="px-3 py-1.5 text-xs font-mono text-slate-400 rounded
              border border-white/10 hover:bg-slate-700/50 hover:text-slate-200
              transition-all duration-200"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}
          >
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Editor + Controls */}
        {!isFullscreen && (
          <>
            <div className="flex flex-col overflow-hidden" style={{ width: `${leftPanelWidth}%` }}>
              {/* Editor */}
              <div className="flex-1 overflow-hidden border-b border-white/10">
                <PlaygroundEditor code={code} onChange={setCode} error={error} />
              </div>

              {/* Controls */}
              <div className="h-[280px] shrink-0 overflow-y-auto border-t border-white/10 bg-[#0e0e1a]">
                <ControlsPanel controls={controls} onChange={setControls} />
              </div>
            </div>

            {/* Resize handle */}
            <div
              onMouseDown={handleMouseDown}
              className="w-1 cursor-col-resize bg-white/5 hover:bg-blue-500/30 transition-colors shrink-0"
            />
          </>
        )}

        {/* Right panel: Preview */}
        <div className="flex-1 overflow-hidden">
          <PlaygroundPreview code={code} controls={controls} onError={handleError} />
        </div>
      </div>
    </div>
  );
}
