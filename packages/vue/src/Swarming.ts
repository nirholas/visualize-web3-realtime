// ============================================================================
// @swarming/vue — Vue 3 Composition API Wrapper
//
// Thin Vue 3 component (~130 lines) wrapping @swarming/engine.
// SSR-safe (Nuxt compatible) — engine only mounts in the browser.
//
// Usage:
//   <template>
//     <Swarming :source="wsUrl" theme="dark" @node-click="handleClick" />
//   </template>
//
//   <script setup>
//   import { Swarming } from '@swarming/vue'
//   const wsUrl = 'wss://...'
//   const handleClick = (node) => console.log(node)
//   </script>
// ============================================================================

import {
  defineComponent,
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  type PropType,
} from 'vue';
import {
  createSwarming,
  type SwarmingInstance,
  type SwarmingNode,
  type ThemeInput,
  type PhysicsConfig,
} from '@swarming/engine';

export const Swarming = defineComponent({
  name: 'Swarming',

  props: {
    /** WebSocket URL for real-time data */
    source: { type: String, default: undefined },
    /** Static data array */
    data: { type: Array as PropType<SwarmingNode[]>, default: undefined },
    /** Maximum nodes. Default: 2000 */
    nodes: { type: Number, default: 2000 },
    /** Theme preset or config. Default: 'dark' */
    theme: {
      type: [String, Object] as PropType<ThemeInput>,
      default: 'dark' as const,
    },
    /** Enable bloom. Default: true */
    bloom: { type: Boolean, default: true },
    /** Physics config overrides */
    physics: { type: Object as PropType<PhysicsConfig>, default: undefined },
    /** Show hub labels. Default: true */
    showLabels: { type: Boolean, default: true },
    /** Camera field of view. Default: 45 */
    fov: { type: Number, default: 45 },
    /** Initial camera position */
    cameraPosition: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: () => [0, 55, 12] as [number, number, number],
    },
    /** Container width */
    width: { type: [Number, String], default: '100%' },
    /** Container height */
    height: { type: [Number, String], default: '100%' },
  },

  emits: ['node-click', 'node-hover', 'ready', 'error', 'data'],

  setup(props, { emit, expose }) {
    const containerRef = ref<HTMLElement | null>(null);
    let instance: SwarmingInstance | null = null;

    function mount() {
      const el = containerRef.value;
      if (!el) return;

      // Destroy previous instance if re-mounting
      instance?.destroy();

      instance = createSwarming(el, {
        source: props.source,
        data: props.data,
        nodes: props.nodes,
        theme: props.theme,
        bloom: props.bloom,
        physics: props.physics,
        showLabels: props.showLabels,
        fov: props.fov,
        cameraPosition: props.cameraPosition,
      });

      instance.on('nodeClick', (node) => emit('node-click', node));
      instance.on('nodeHover', (node) => emit('node-hover', node));
      instance.on('ready', () => emit('ready'));
      instance.on('error', (err) => emit('error', err));
      instance.on('data', (payload) => emit('data', payload));
    }

    onMounted(mount);
    onBeforeUnmount(() => { instance?.destroy(); instance = null; });

    // Reactive source — reconnect on change
    watch(() => props.source, () => mount());

    // Reactive theme
    watch(() => props.theme, (t) => { instance?.setTheme(t); });

    // Reactive data
    watch(() => props.data, (d) => { if (d) instance?.addNodes(d); });

    // Expose imperative API
    expose({
      reheat: (alpha?: number) => instance?.reheat(alpha),
      addNodes: (nodes: SwarmingNode[]) => instance?.addNodes(nodes),
      removeNode: (id: string) => instance?.removeNode(id),
      getInstance: () => instance,
    });

    return { containerRef };
  },

  render() {
    const style: Record<string, string> = {
      width: typeof this.width === 'number' ? `${this.width}px` : this.width,
      height: typeof this.height === 'number' ? `${this.height}px` : this.height,
      position: 'relative',
      overflow: 'hidden',
    };

    return (
      // @ts-expect-error Vue JSX ref binding
      <div ref="containerRef" style={style} />
    );
  },
});
