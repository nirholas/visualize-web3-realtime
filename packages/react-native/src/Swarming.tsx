// ============================================================================
// Swarming — Main React Native component
//
// Usage:
//   import { Swarming } from '@swarming/react-native'
//
//   <Swarming source="wss://my-data-stream" theme="midnight" style={{ flex: 1 }} />
//
// Supports two rendering backends:
//   - 'webview' (default): Uses a WebView with an inline Canvas 2D renderer.
//     Broad compatibility, simpler setup.
//   - 'gl': Uses expo-gl for native GPU rendering. Better performance but
//     requires expo-gl as a peer dependency.
//
// Mobile-specific features:
//   - Haptic feedback on node tap (requires expo-haptics)
//   - Battery-aware performance scaling (requires expo-battery)
//   - Offline caching of last known graph state
//   - Pinch-to-zoom, drag-to-pan, tap-to-select gestures
// ============================================================================

import React, { useCallback, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import type { TopToken } from '@web3viz/core';
import type { SwarmingProps, NodeSelectEvent } from './types';
import { THEME_COLORS, PERFORMANCE_CONFIGS } from './themes';
import { GestureHandler } from './GestureHandler';
import { GLRenderer } from './GLRenderer';
import { WebViewFallback } from './WebViewFallback';
import { useWebSocketData, useBatteryAware, useOfflineCache } from './hooks';

export function Swarming({
  source,
  data,
  theme = 'dark',
  maxNodes,
  simulationConfig: _simulationConfig,
  style,
  renderer = 'webview',
  performance = 'medium',
  haptics = false,
  batteryAware = false,
  offlineCache = false,
  onNodeSelect,
  onReady,
  onConnectionChange,
  topTokens: externalTokens,
  traderEdges: externalEdges,
}: SwarmingProps) {
  // Resolve theme colors
  const themeColors = useMemo(() => THEME_COLORS[theme] ?? THEME_COLORS.dark, [theme]);

  // Battery-aware performance tier
  const effectiveTier = useBatteryAware(performance, batteryAware);
  const performanceConfig = useMemo(() => {
    const config = { ...PERFORMANCE_CONFIGS[effectiveTier] };
    if (maxNodes) config.maxNodes = maxNodes;
    return config;
  }, [effectiveTier, maxNodes]);

  // WebSocket data (only if source is provided and no external data)
  const wsData = useWebSocketData({
    source: externalTokens ? undefined : source,
    maxNodes: performanceConfig.maxNodes,
    onConnectionChange,
  });

  // Resolve data sources: external props > WebSocket > static data
  const rawTokens = externalTokens ?? wsData.topTokens;
  const rawEdges = externalEdges ?? wsData.traderEdges;

  // Convert static `data` prop to TopToken[] if no other source
  const staticTokens = useMemo<TopToken[]>(() => {
    if (rawTokens.length > 0 || !data) return [];
    return data.nodes.map((n) => ({
      tokenAddress: n.id,
      symbol: n.label,
      name: n.label,
      chain: 'static',
      trades: 0,
      volume: 0,
      lastTrade: Date.now(),
      color: n.color,
    }));
  }, [data, rawTokens.length]);

  const topTokens = rawTokens.length > 0 ? rawTokens : staticTokens;
  const traderEdges = rawEdges;

  // Offline cache
  const { cachedTokens, cachedEdges } = useOfflineCache(topTokens, traderEdges, offlineCache);
  const finalTokens = topTokens.length > 0 ? topTokens : cachedTokens;
  const finalEdges = traderEdges.length > 0 ? traderEdges : cachedEdges;

  // Node tap handler
  const handleNodeTap = useCallback(
    (index: number) => {
      if (!onNodeSelect || index >= finalTokens.length) return;
      const event: NodeSelectEvent = { node: finalTokens[index], index };
      onNodeSelect(event);
    },
    [onNodeSelect, finalTokens],
  );

  // Gesture tap → find nearest node (for GL renderer)
  const handleGestureTap = useCallback(
    (_x: number, _y: number) => {
      // For GL renderer, hit testing happens in the GL render loop.
      // For WebView, hit testing happens inside the WebView JS.
      // This is a placeholder for the GL case — the GLRenderer
      // calls onNodeTap directly.
    },
    [],
  );

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: themeColors.background,
    ...(style as object),
  };

  const rendererElement =
    renderer === 'gl' ? (
      <GLRenderer
        topTokens={finalTokens}
        traderEdges={finalEdges}
        themeColors={themeColors}
        performanceConfig={performanceConfig}
        onNodeTap={handleNodeTap}
        onReady={onReady}
      />
    ) : (
      <WebViewFallback
        topTokens={finalTokens}
        traderEdges={finalEdges}
        themeColors={themeColors}
        performanceConfig={performanceConfig}
        onNodeTap={handleNodeTap}
        onReady={onReady}
      />
    );

  return (
    <View style={containerStyle}>
      <GestureHandler
        hapticsEnabled={haptics}
        onTap={handleGestureTap}
      >
        {rendererElement}
      </GestureHandler>
    </View>
  );
}
