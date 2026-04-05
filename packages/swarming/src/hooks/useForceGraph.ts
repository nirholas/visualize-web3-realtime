import { useEffect, useRef } from 'react';
import { SwarmingSimulation, type PhysicsConfig } from '../core/physics';
import type { SwarmingNode, ThemeConfig, DataProvider } from '../types';
import { WebSocketProvider } from '../providers/WebSocketProvider';
import { StaticProvider } from '../providers/StaticProvider';

interface UseForceGraphOptions {
  source?: string;
  provider?: DataProvider;
  data?: SwarmingNode[];
  theme: ThemeConfig;
  physics?: Partial<PhysicsConfig>;
}

/**
 * Hook that manages the force simulation lifecycle.
 *
 * Connects to the data source, feeds nodes into the simulation,
 * and returns the simulation instance for rendering.
 */
export function useForceGraph({
  source,
  provider,
  data,
  theme,
  physics,
}: UseForceGraphOptions): SwarmingSimulation {
  const simRef = useRef<SwarmingSimulation | null>(null);

  if (!simRef.current) {
    simRef.current = new SwarmingSimulation(physics);
  }
  const sim = simRef.current;

  // Handle static data
  useEffect(() => {
    if (data) {
      sim.update(data, theme);
    }
  }, [sim, data, theme]);

  // Handle provider / WebSocket source
  useEffect(() => {
    const resolvedProvider = provider ?? (source ? new WebSocketProvider(source) : null);
    if (!resolvedProvider) return;

    const allNodes: SwarmingNode[] = data ? [...data] : [];

    const cleanup = resolvedProvider.connect((newNodes) => {
      for (const node of newNodes) {
        const idx = allNodes.findIndex((n) => n.id === node.id);
        if (idx >= 0) {
          allNodes[idx] = node;
        } else {
          allNodes.push(node);
        }
      }
      sim.update(allNodes, theme);
    });

    return cleanup ?? undefined;
  }, [sim, source, provider, data, theme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      simRef.current?.dispose();
    };
  }, []);

  return sim;
}
