'use client';

// ============================================================================
// swarming — <Swarming /> component
//
// Batteries-included, single-component API. From npm install to a working
// 3D force graph in 3 lines of JSX:
//
//   import { Swarming } from 'swarming'
//   export default function App() {
//     return <Swarming source="wss://pumpportal.fun/api/data" />
//   }
// ============================================================================

import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { SwarmingConfig, SwarmingHandle, SwarmingNode, ThemeConfig } from './types';
import { dark } from './themes/dark';
import { light } from './themes/light';
import { useForceGraph } from './hooks/useForceGraph';
import { useMouseRepulsion } from './hooks/useMouseRepulsion';
import { SwarmingScene } from './core/ForceGraph';
import { CameraSetup, SnapshotHelper, type CameraApi } from './SwarmingCanvasHelpers';
import { PostProcessing } from './PostProcessing';
import { defaultMapEvent } from './defaults';
import { CollaborationProvider, useCollaboration } from './collaboration/CollaborationProvider';
import { CursorOverlay } from './collaboration/CursorOverlay';
import { usePresenterFollow } from './collaboration/PresenterMode';

// ---------------------------------------------------------------------------
// Theme resolution
// ---------------------------------------------------------------------------

function resolveTheme(theme: SwarmingConfig['theme']): ThemeConfig {
  if (!theme || theme === 'dark') return dark;
  if (theme === 'light') return light;
  return theme;
}

// ---------------------------------------------------------------------------
// SSR guard
// ---------------------------------------------------------------------------

function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  return isClient;
}

// ---------------------------------------------------------------------------
// Loading overlay
// ---------------------------------------------------------------------------

const LoadingOverlay = memo<{ color: string }>(({ color }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      pointerEvents: 'none',
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        border: `3px solid ${color}33`,
        borderTop: `3px solid ${color}`,
        borderRadius: '50%',
        animation: 'swarming-spin 0.8s linear infinite',
      }}
    />
    <style>{`@keyframes swarming-spin { to { transform: rotate(360deg) } }`}</style>
  </div>
));
LoadingOverlay.displayName = 'LoadingOverlay';

// ---------------------------------------------------------------------------
// Error overlay
// ---------------------------------------------------------------------------

const ErrorOverlay = memo<{ message: string; color: string; onRetry: () => void }>(
  ({ message, color, onRetry }) => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        zIndex: 10,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ color, fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>
        {message}
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: '6px 16px',
          border: `1px solid ${color}`,
          borderRadius: 6,
          background: 'transparent',
          color,
          cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13,
        }}
      >
        Retry
      </button>
    </div>
  ),
);
ErrorOverlay.displayName = 'ErrorOverlay';

// ---------------------------------------------------------------------------
// WebSocket data source with mapEvent support
// ---------------------------------------------------------------------------

function useWebSocketNodes(
  source: string | undefined,
  mapEvent: ((raw: Record<string, unknown>) => SwarmingNode) | undefined,
): { nodes: SwarmingNode[]; state: 'idle' | 'connecting' | 'connected' | 'error'; retry: () => void } {
  const [nodes, setNodes] = useState<SwarmingNode[]>([]);
  const [state, setState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const mapper = mapEvent ?? defaultMapEvent;

  useEffect(() => {
    if (!source) {
      setState('idle');
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let disposed = false;
    const buffer: SwarmingNode[] = [];

    function connect() {
      if (disposed) return;
      setState('connecting');

      try {
        ws = new WebSocket(source!);
      } catch {
        setState('error');
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        attempts = 0;
        setState('connected');
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;
        try {
          const raw = JSON.parse(event.data);
          const node = mapper(raw);
          buffer.push(node);
          // Batch updates — set at most ~30fps
          if (buffer.length === 1) {
            requestAnimationFrame(() => {
              setNodes((prev) => [...prev, ...buffer.splice(0)]);
            });
          }
        } catch {
          // Skip unparseable messages
        }
      };

      ws.onerror = () => {
        setState('error');
      };

      ws.onclose = () => {
        if (!disposed) scheduleReconnect();
      };
    }

    function scheduleReconnect() {
      if (disposed || attempts >= 10) {
        if (attempts >= 10) setState('error');
        return;
      }
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
      attempts++;
      reconnectTimer = setTimeout(connect, delay);
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.onopen = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, 'Unmount');
        }
      }
    };
  }, [source, mapper, retryCount]);

  const retry = useCallback(() => {
    setNodes([]);
    setRetryCount((n) => n + 1);
  }, []);

  return { nodes, state, retry };
}

// ---------------------------------------------------------------------------
// Inner scene component (needs R3F context)
// ---------------------------------------------------------------------------

const SwarmingInner = memo<{
  config: SwarmingConfig;
  theme: ThemeConfig;
  dataNodes: SwarmingNode[] | undefined;
  cameraApiRef: React.MutableRefObject<CameraApi | null>;
  snapshotRef: React.MutableRefObject<(() => string | null) | null>;
  simRef: React.MutableRefObject<ReturnType<typeof useForceGraph> | null>;
}>(({ config, theme, dataNodes, cameraApiRef, snapshotRef, simRef }) => {
  const sim = useForceGraph({
    source: config.mapEvent ? undefined : config.source,
    provider: config.provider,
    data: dataNodes ?? config.data,
    theme,
    physics: {
      maxNodes: config.nodes ?? 2000,
      hubCharge: config.chargeStrength ?? -200,
      hubLinkDistance: config.linkDistance ?? 25,
      centerStrength: config.centerPull ?? 0.03,
    },
  });

  // Expose sim to parent
  simRef.current = sim;

  useMouseRepulsion(sim, config.interactive !== false);

  return (
    <>
      <CameraSetup apiRef={cameraApiRef} initialPosition={[0, 55, 12]} />
      <SnapshotHelper snapshotRef={snapshotRef} />
      <SwarmingScene
        sim={sim}
        theme={theme}
        maxNodes={config.nodes ?? 2000}
        showLabels
      />
      {config.collaboration && <CollaborationScene />}
      <PostProcessing
        enabled={config.bloom !== false}
        bloomIntensity={theme.bloomIntensity}
        bloomThreshold={theme.bloomThreshold}
      />
    </>
  );
});
SwarmingInner.displayName = 'SwarmingInner';

// ---------------------------------------------------------------------------
// Collaboration scene elements (cursors, follow mode)
// ---------------------------------------------------------------------------

const CollaborationScene = memo(() => {
  const collab = useCollaboration();
  if (!collab) return null;

  const followingPeer = collab.followingPeerId
    ? collab.peers.find((p) => p.id === collab.followingPeerId) ?? null
    : null;

  return (
    <>
      <CursorOverlay peers={collab.peers} />
      <CollaborationFollow followingPeer={followingPeer} />
    </>
  );
});
CollaborationScene.displayName = 'CollaborationScene';

const CollaborationFollow = memo<{
  followingPeer: import('./collaboration/types').Peer | null;
}>(({ followingPeer }) => {
  usePresenterFollow({
    followingPeer,
    enabled: followingPeer !== null,
  });
  return null;
});
CollaborationFollow.displayName = 'CollaborationFollow';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * 3D force-directed graph visualization.
 *
 * @example
 * ```tsx
 * // Zero config — just a WebSocket URL
 * <Swarming source="wss://pumpportal.fun/api/data" />
 *
 * // Static data
 * <Swarming data={[
 *   { id: '1', label: 'Node A', group: 'servers', connections: ['2', '3'] },
 *   { id: '2', label: 'Node B', group: 'databases' },
 *   { id: '3', label: 'Node C', group: 'databases' },
 * ]} />
 *
 * // Custom data mapping
 * <Swarming
 *   source="wss://..."
 *   mapEvent={(raw) => ({
 *     id: raw.txHash as string,
 *     label: raw.token as string,
 *     group: raw.type as string,
 *   })}
 * />
 *
 * // Full customization
 * <Swarming
 *   source="wss://..."
 *   nodes={5000}
 *   theme="dark"
 *   chargeStrength={-50}
 *   linkDistance={80}
 *   interactive={true}
 *   onNodeClick={(node) => console.log(node)}
 * />
 * ```
 */
const Swarming = forwardRef<SwarmingHandle, SwarmingConfig>(function Swarming(
  props,
  ref,
) {
  const isClient = useIsClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraApiRef = useRef<CameraApi | null>(null);
  const snapshotRef = useRef<(() => string | null) | null>(null);
  const simRef = useRef<ReturnType<typeof useForceGraph> | null>(null);

  const theme = useMemo(() => resolveTheme(props.theme), [props.theme]);

  // Use custom mapEvent for WebSocket data when provided
  const { nodes: wsNodes, state: wsState, retry } = useWebSocketNodes(
    props.mapEvent ? props.source : undefined,
    props.mapEvent,
  );

  // Combine static data with WebSocket mapped data
  const dataNodes = useMemo(() => {
    if (!props.mapEvent) return props.data;
    const base = props.data ?? [];
    return [...base, ...wsNodes];
  }, [props.data, props.mapEvent, wsNodes]);

  useImperativeHandle(ref, () => ({
    animateCameraTo: async (position, lookAt = [0, 0, 0], durationMs = 1200) => {
      const api = cameraApiRef.current;
      if (!api) return;
      await api.animateTo(position, lookAt, durationMs);
    },
    focusGroup: async (index, durationMs = 1200) => {
      const api = cameraApiRef.current;
      if (!api) return;
      const sim = simRef.current;
      if (sim) {
        const hubs = sim.nodes.filter((n) => n.type === 'hub');
        const hub = hubs[index];
        if (hub) {
          const hx = hub.x ?? 0;
          const hy = hub.y ?? 0;
          const hz = hub.z ?? 0;
          await api.animateTo([hx, hy + 15, hz + 12], [hx, hy, hz], durationMs);
          return;
        }
      }
      await api.animateTo([0, 15 + index * 5, 12], [0, 0, 0], durationMs);
    },
    getCanvasElement: () =>
      containerRef.current?.querySelector('canvas') ?? null,
    takeSnapshot: () => snapshotRef.current?.() ?? null,
    reheat: (alpha?: number) => simRef.current?.reheat(alpha),
  }));

  // SSR: render nothing on server
  if (!isClient) return null;

  const { width = '100%', height = '100%', className, style, onReady } = props;
  const showLoading = wsState === 'connecting';
  const showError = wsState === 'error' && !props.data && !props.provider;

  const errorColor = theme.background === '#ffffff' || theme.background === '#fff'
    ? '#dc2626' : '#ef4444';
  const loadingColor = theme.hubColors[0] ?? '#6366f1';

  const content = (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width,
        height,
        minHeight: style?.minHeight ?? (height === '100%' ? '100vh' : undefined),
        ...style,
      }}
    >
      {showLoading && <LoadingOverlay color={loadingColor} />}
      {showError && (
        <ErrorOverlay
          message={`Connection failed: ${props.source ?? 'unknown'}`}
          color={errorColor}
          onRetry={retry}
        />
      )}
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 500, position: [0, 55, 12] }}
        style={{ background: theme.background }}
        gl={{ antialias: false, alpha: false, stencil: false }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          onReady?.();
        }}
      >
        <SwarmingInner
          config={props}
          theme={theme}
          dataNodes={dataNodes}
          cameraApiRef={cameraApiRef}
          snapshotRef={snapshotRef}
          simRef={simRef}
        />
      </Canvas>
    </div>
  );

  // Wrap with CollaborationProvider when collaboration is configured
  if (props.collaboration) {
    return (
      <CollaborationProvider config={props.collaboration}>
        {content}
      </CollaborationProvider>
    );
  }

  return content;
});

const SwarmingMemo = memo(Swarming);
export { SwarmingMemo as Swarming };
