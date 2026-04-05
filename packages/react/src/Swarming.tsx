// ============================================================================
// @swarming/react — React Wrapper
//
// Thin React component (~150 lines) wrapping @swarming/engine.
//
// Usage:
//   import { Swarming } from '@swarming/react'
//   <Swarming source="wss://..." theme="dark" onNodeClick={handleClick} />
// ============================================================================

import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from 'react';
import {
  createSwarming,
  type SwarmingConfig,
  type SwarmingInstance,
  type SwarmingNode,
  type ThemeInput,
  type PhysicsConfig,
} from '@swarming/engine';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SwarmingProps {
  /** WebSocket URL for real-time data */
  source?: string;
  /** Static data array */
  data?: SwarmingNode[];
  /** Maximum nodes. Default: 2000 */
  nodes?: number;
  /** Theme preset or config. Default: 'dark' */
  theme?: ThemeInput;
  /** Enable bloom. Default: true */
  bloom?: boolean;
  /** Physics config overrides */
  physics?: PhysicsConfig;
  /** Show hub labels. Default: true */
  showLabels?: boolean;
  /** Camera field of view. Default: 45 */
  fov?: number;
  /** Initial camera position. Default: [0, 55, 12] */
  cameraPosition?: [number, number, number];

  /** Called when a node is clicked */
  onNodeClick?: (node: SwarmingNode) => void;
  /** Called when hover state changes */
  onNodeHover?: (node: SwarmingNode | null) => void;
  /** Called when the visualization is ready */
  onReady?: () => void;
  /** Called on error */
  onError?: (error: Error) => void;

  /** Container width */
  width?: number | string;
  /** Container height */
  height?: number | string;
  /** CSS class for the container */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// Handle (imperative API via ref)
// ---------------------------------------------------------------------------

export interface SwarmingHandle {
  /** Reheat the physics simulation */
  reheat: (alpha?: number) => void;
  /** Add nodes programmatically */
  addNodes: (nodes: SwarmingNode[]) => void;
  /** Remove a node by ID */
  removeNode: (id: string) => void;
  /** Get the underlying engine instance */
  getInstance: () => SwarmingInstance | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Swarming = memo(
  forwardRef<SwarmingHandle, SwarmingProps>(function Swarming(props, ref) {
    const {
      source,
      data,
      nodes,
      theme = 'dark',
      bloom,
      physics,
      showLabels,
      fov,
      cameraPosition,
      onNodeClick,
      onNodeHover,
      onReady,
      onError,
      width = '100%',
      height = '100%',
      className,
      style,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<SwarmingInstance | null>(null);

    // Stable refs for callbacks
    const callbacksRef = useRef({ onNodeClick, onNodeHover, onReady, onError });
    callbacksRef.current = { onNodeClick, onNodeHover, onReady, onError };

    // Imperative handle
    useImperativeHandle(ref, () => ({
      reheat: (alpha?: number) => instanceRef.current?.reheat(alpha),
      addNodes: (n: SwarmingNode[]) => instanceRef.current?.addNodes(n),
      removeNode: (id: string) => instanceRef.current?.removeNode(id),
      getInstance: () => instanceRef.current,
    }));

    // Mount/unmount
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const config: SwarmingConfig = {
        source,
        data,
        nodes,
        theme,
        bloom,
        physics,
        showLabels,
        fov,
        cameraPosition,
      };

      const instance = createSwarming(el, config);
      instanceRef.current = instance;

      // Wire events
      instance.on('ready', () => callbacksRef.current.onReady?.());
      instance.on('error', (err) => callbacksRef.current.onError?.(err));
      instance.on('nodeClick', (node) => callbacksRef.current.onNodeClick?.(node));
      instance.on('nodeHover', (node) => callbacksRef.current.onNodeHover?.(node));

      return () => {
        instance.destroy();
        instanceRef.current = null;
      };
      // Intentional: only re-mount when source changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [source]);

    // Reactive theme changes
    useEffect(() => {
      instanceRef.current?.setTheme(theme);
    }, [theme]);

    // Reactive data changes
    useEffect(() => {
      if (data) instanceRef.current?.addNodes(data);
    }, [data]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          width,
          height,
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
      />
    );
  }),
);

Swarming.displayName = 'Swarming';

export { Swarming };
