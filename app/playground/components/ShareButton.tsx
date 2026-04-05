'use client';

import { useState, useCallback } from 'react';
import { buildShareUrl, generateStandaloneHtml } from '../lib/sharing';
import type { PlaygroundState } from '../lib/sharing';

interface ShareButtonProps {
  getState: () => PlaygroundState;
}

export function ShareButton({ getState }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const state = getState();
    const url = buildShareUrl(state);
    window.history.replaceState(null, '', `/playground#${url.split('#')[1]}`);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getState]);

  const handleExport = useCallback(() => {
    const state = getState();
    const html = generateStandaloneHtml(state.code);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'swarming-visualization.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [getState]);

  const handleCopy = useCallback(async () => {
    const state = getState();
    await navigator.clipboard.writeText(state.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getState]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleShare}
        className="px-3 py-1.5 text-xs font-mono bg-blue-600/20 text-blue-300 rounded
          border border-blue-500/30 hover:bg-blue-600/30 hover:border-blue-400/50
          transition-all duration-200"
      >
        {copied ? 'Copied!' : 'Share'}
      </button>

      <button
        onClick={handleCopy}
        className="px-3 py-1.5 text-xs font-mono bg-slate-700/50 text-slate-300 rounded
          border border-white/10 hover:bg-slate-600/50 hover:border-white/20
          transition-all duration-200"
      >
        Copy
      </button>

      <button
        onClick={handleExport}
        className="px-3 py-1.5 text-xs font-mono bg-slate-700/50 text-slate-300 rounded
          border border-white/10 hover:bg-slate-600/50 hover:border-white/20
          transition-all duration-200"
      >
        Export
      </button>
    </div>
  );
}
