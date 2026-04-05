// ============================================================================
// WebViewFallback — WebView-based renderer
//
// Renders the swarming visualization inside a WebView using the web bundle.
// Simpler setup, broader compatibility, but lower performance than GLRenderer.
// Communicates with the WebView via postMessage for node selection events.
// ============================================================================

import React, { useRef, useCallback, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import type { TopToken, TraderEdge } from '@web3viz/core';
import type { ThemeColors, PerformanceConfig } from './types';

interface WebViewFallbackProps {
  topTokens: TopToken[];
  traderEdges: TraderEdge[];
  themeColors: ThemeColors;
  performanceConfig: PerformanceConfig;
  style?: ViewStyle;
  /** URL of the hosted swarming web app (default: bundled inline HTML) */
  webAppUrl?: string;
  onNodeTap?: (index: number) => void;
  onReady?: () => void;
}

/** Try to dynamically import react-native-webview */
function tryGetWebView(): React.ComponentType<{
  ref?: React.Ref<unknown>;
  style?: ViewStyle;
  source: { html: string } | { uri: string };
  originWhitelist?: string[];
  javaScriptEnabled?: boolean;
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  onLoad?: () => void;
  injectedJavaScript?: string;
}> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-webview').default;
  } catch {
    return null;
  }
}

/** Generate inline HTML with a Canvas 2D force graph renderer */
function generateInlineHtml(
  themeColors: ThemeColors,
  performanceConfig: PerformanceConfig,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: ${themeColors.background}; overflow: hidden; touch-action: none; }
    canvas { width: 100vw; height: 100vh; display: block; }
  </style>
</head>
<body>
<canvas id="c"></canvas>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  let nodes = [];
  let edges = [];
  const targetFps = ${performanceConfig.targetFps};
  const interval = 1000 / targetFps;
  let lastFrame = 0;

  // Simple velocity-based force simulation
  function tick() {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    for (const node of nodes) {
      if (node.x === undefined) { node.x = cx + (Math.random() - 0.5) * 200; node.y = cy + (Math.random() - 0.5) * 200; node.vx = 0; node.vy = 0; }
      // Center gravity
      node.vx += (cx - node.x) * 0.0005;
      node.vy += (cy - node.y) * 0.0005;
      // Repulsion
      for (const other of nodes) {
        if (other === node) continue;
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 100) {
          const force = 0.5 / dist;
          node.vx += dx * force;
          node.vy += dy * force;
        }
      }
      node.vx *= 0.9;
      node.vy *= 0.9;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  function draw(time) {
    requestAnimationFrame(draw);
    if (time - lastFrame < interval) return;
    lastFrame = time;
    tick();

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // Edges
    ctx.strokeStyle = '${themeColors.edgeColor}';
    ctx.lineWidth = 1;
    for (const e of edges) {
      const src = nodes.find(n => n.id === e.source);
      const tgt = nodes.find(n => n.id === e.target);
      if (!src || !tgt) continue;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
    }

    // Nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      ctx.beginPath();
      const r = n.isHub ? 8 : 3;
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = n.isHub ? '${themeColors.hubGlow}' : '${themeColors.nodeColor}';
      ctx.fill();
    }
  }
  requestAnimationFrame(draw);

  // Tap detection
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const dx = x - n.x;
      const dy = y - n.y;
      if (dx * dx + dy * dy < 256) {
        window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'nodeTap', index: i, id: n.id }));
        break;
      }
    }
  });

  // Receive data from React Native
  window.addEventListener('message', (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'update') {
        if (msg.nodes) nodes = msg.nodes;
        if (msg.edges) edges = msg.edges;
      }
    } catch {}
  });

  // Signal ready
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'ready' }));
</script>
</body>
</html>`;
}

export function WebViewFallback({
  topTokens,
  traderEdges,
  themeColors,
  performanceConfig,
  style,
  webAppUrl,
  onNodeTap,
  onReady,
}: WebViewFallbackProps) {
  const webViewRef = useRef<unknown>(null);
  const WebView = tryGetWebView();

  const html = useMemo(
    () => generateInlineHtml(themeColors, performanceConfig),
    [themeColors, performanceConfig],
  );

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'nodeTap') onNodeTap?.(msg.index);
        if (msg.type === 'ready') onReady?.();
      } catch { /* ignore */ }
    },
    [onNodeTap, onReady],
  );

  // Convert topTokens/traderEdges to lightweight node/edge format for the WebView
  const updateScript = useMemo(() => {
    const nodes = topTokens.map((t) => ({
      id: t.tokenAddress,
      label: t.symbol,
      isHub: true,
    }));
    const edges = traderEdges.map((e) => ({
      source: typeof e.source === 'string' ? e.source : (e.source as { tokenAddress?: string })?.tokenAddress ?? '',
      target: typeof e.target === 'string' ? e.target : (e.target as { tokenAddress?: string })?.tokenAddress ?? '',
    }));
    return `window.postMessage(${JSON.stringify(JSON.stringify({ type: 'update', nodes, edges }))}, '*'); true;`;
  }, [topTokens, traderEdges]);

  if (!WebView) {
    return (
      <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, style]} />
    );
  }

  const source = webAppUrl ? { uri: webAppUrl } : { html };

  return (
    <WebView
      ref={webViewRef}
      style={[{ flex: 1 }, style]}
      source={source}
      originWhitelist={['*']}
      javaScriptEnabled
      onMessage={handleMessage}
      onLoad={onReady}
      injectedJavaScript={updateScript}
    />
  );
}
