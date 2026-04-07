'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePumpFunSocket } from '@/app/pumpfun/usePumpFunSocket';
import { useDemoData } from '@/app/pumpfun/useDemoData';
import { useGraphMetrics } from '@/app/pumpfun/useGraphMetrics';
import { PumpForceGraph } from '@/app/pumpfun/PumpForceGraph';
import { PumpDesktopShell } from '@/app/pumpfun/desktop/PumpDesktopShell';

/** Seconds to wait for live data before falling back to demo */
const FALLBACK_TIMEOUT_MS = 5_000;
const THEME_KEY = 'pumpfun-theme';

export default function PumpFunGraph() {
  const liveData = usePumpFunSocket();
  const demoData = useDemoData();

  // ---------------------------------------------------------------------------
  // Theme state — default dark, persisted in localStorage
  // ---------------------------------------------------------------------------
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light') setDarkMode(false);
    } catch {
      // SSR or blocked localStorage
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Data source fallback
  // ---------------------------------------------------------------------------
  const [useDemo, setUseDemo] = useState(false);
  useEffect(() => {
    if (liveData.nodes.length > 0) {
      setUseDemo(false);
      return;
    }
    const id = setTimeout(() => {
      if (liveData.nodes.length === 0) setUseDemo(true);
    }, FALLBACK_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [liveData.nodes.length]);

  const graphData = useDemo ? demoData : liveData;
  const metrics = useGraphMetrics(graphData);

  const recentTokens = useMemo(
    () =>
      graphData.nodes
        .filter((n) => n.type === 'token' && n.ticker)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5),
    [graphData],
  );

  const recentTrades = useMemo(
    () =>
      graphData.nodes
        .filter((n) => n.type === 'trade')
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50),
    [graphData],
  );

  const isLive = !useDemo && graphData.nodes.length > 0;

  return (
    <>
      {/* 3D Force Graph */}
      <div className="absolute inset-0 z-0">
        <PumpForceGraph graphData={graphData} darkMode={darkMode} />
      </div>

      {/* Desktop Shell — taskbar, windows, start menu */}
      <PumpDesktopShell
        metrics={metrics}
        recentTokens={recentTokens}
        recentTrades={recentTrades}
        isLive={isLive}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        nodeCount={graphData.nodes.length}
        linkCount={graphData.links.length}
      />
    </>
  );
}
