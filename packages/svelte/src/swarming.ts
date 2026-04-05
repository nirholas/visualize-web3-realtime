// ============================================================================
// @swarming/svelte — Svelte Wrapper
//
// Provides both a Svelte action (`use:swarming`) and a programmatic API
// that works with Svelte 4 and Svelte 5 (runes). SSR-safe (SvelteKit).
//
// Usage (Svelte 4 — action):
//   <script>
//     import { swarming } from '@swarming/svelte'
//     let config = { source: 'wss://...', theme: 'dark' }
//   </script>
//   <div use:swarming={config} style="width:100%;height:600px" />
//
// Usage (Svelte 5 — action with runes):
//   <script>
//     import { swarming } from '@swarming/svelte'
//     let source = $state('wss://...')
//   </script>
//   <div use:swarming={{ source, theme: 'dark' }} style="width:100%;height:600px" />
//
// Usage (programmatic):
//   import { mountSwarming } from '@swarming/svelte'
//   const { instance, destroy } = mountSwarming(element, config)
// ============================================================================

import {
  createSwarming,
  type SwarmingConfig,
  type SwarmingInstance,
  type SwarmingNode,
} from '@swarming/engine';

// ---------------------------------------------------------------------------
// Extended config with event callbacks
// ---------------------------------------------------------------------------

export interface SwarmingActionConfig extends SwarmingConfig {
  /** Called when a node is clicked */
  onNodeClick?: (node: SwarmingNode) => void;
  /** Called when hover changes */
  onNodeHover?: (node: SwarmingNode | null) => void;
  /** Called when ready */
  onReady?: () => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

// ---------------------------------------------------------------------------
// Programmatic mount
// ---------------------------------------------------------------------------

export interface SwarmingMount {
  instance: SwarmingInstance;
  destroy: () => void;
}

/**
 * Programmatically mount a swarming visualization.
 * Returns the instance and a destroy function.
 */
export function mountSwarming(
  element: HTMLElement,
  config: SwarmingActionConfig = {},
): SwarmingMount {
  const instance = createSwarming(element, config);

  if (config.onNodeClick) instance.on('nodeClick', config.onNodeClick);
  if (config.onNodeHover) instance.on('nodeHover', config.onNodeHover);
  if (config.onReady) instance.on('ready', config.onReady);
  if (config.onError) instance.on('error', config.onError);

  return {
    instance,
    destroy: () => instance.destroy(),
  };
}

// ---------------------------------------------------------------------------
// Svelte action (works with both Svelte 4 and 5)
// ---------------------------------------------------------------------------

/**
 * Svelte action for mounting a swarming visualization.
 *
 * ```svelte
 * <div use:swarming={{ source: 'wss://...', theme: 'dark' }} />
 * ```
 */
export function swarming(
  node: HTMLElement,
  config: SwarmingActionConfig = {},
): { update: (config: SwarmingActionConfig) => void; destroy: () => void } {
  let mount = mountSwarming(node, config);
  let currentSource = config.source;

  return {
    update(newConfig: SwarmingActionConfig) {
      // If source changed, remount entirely
      if (newConfig.source !== currentSource) {
        mount.destroy();
        mount = mountSwarming(node, newConfig);
        currentSource = newConfig.source;
        return;
      }

      // Otherwise, apply incremental updates
      if (newConfig.theme) mount.instance.setTheme(newConfig.theme);
      if (newConfig.data) mount.instance.addNodes(newConfig.data);
    },

    destroy() {
      mount.destroy();
    },
  };
}
