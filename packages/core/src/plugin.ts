// ============================================================================
// Plugin system — stub definitions
// ============================================================================

export interface PluginMeta {
  id: string;
  name: string;
  version: string;
  description?: string;
}

export type PluginConfigFieldType = 'string' | 'number' | 'boolean' | 'select';

export interface PluginConfigField {
  key: string;
  label: string;
  type: PluginConfigFieldType;
  default?: unknown;
  options?: string[];
}

export interface PluginConfigSchema {
  fields: PluginConfigField[];
}

export interface ThemeConfig {
  background: string;
  nodeColors: string[];
  edgeColor: string;
  agentColor: string;
  bloomStrength: number;
  bloomRadius: number;
  fontFamily: string;
  chainColors: Record<string, string>;
  protocolColors: Record<string, string>;
}

export interface RendererPluginHooks {
  onBeforeRender?: () => void;
  onAfterRender?: () => void;
}

export type PluginProviderFactory = (config: Record<string, unknown>) => unknown;

export interface SourcePluginDefinition {
  name: string;
  type: 'source';
  meta: Record<string, unknown>;
  configSchema?: PluginConfigSchema;
  createProvider: PluginProviderFactory | Record<string, unknown>;
  [key: string]: unknown;
}

export interface ThemePluginDefinition {
  name: string;
  type: 'theme';
  meta: Record<string, unknown>;
  theme: ThemeConfig;
  [key: string]: unknown;
}

export interface RendererPluginDefinition {
  name: string;
  type: 'renderer';
  meta: Record<string, unknown>;
  hooks: RendererPluginHooks;
  [key: string]: unknown;
}

export type PluginDefinition =
  | SourcePluginDefinition
  | ThemePluginDefinition
  | RendererPluginDefinition;

export interface ResolvedPlugin<T extends PluginDefinition = PluginDefinition> {
  definition: T;
  config: Record<string, unknown>;
}

export interface PluginManager {
  register: (plugin: PluginDefinition) => void;
  unregister: (id: string) => void;
  get: (id: string) => ResolvedPlugin | undefined;
  getAll: () => ResolvedPlugin[];
  connectAll: () => void;
  disconnectAll: () => void;
  onChange: (listener: () => void) => () => void;
  getActiveTheme: () => ThemeConfig | undefined;
  getRendererHooks: () => RendererPluginHooks;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProviders: () => any[];
}

export function definePlugin<T>(def: T): T {
  return def;
}

export function createPluginManager(): PluginManager {
  const plugins = new Map<string, ResolvedPlugin>();
  const listeners = new Set<() => void>();

  function notify() {
    for (const fn of listeners) fn();
  }

  return {
    register(plugin) {
      plugins.set(plugin.name, { definition: plugin, config: {} });
      notify();
    },
    unregister(id) {
      plugins.delete(id);
      notify();
    },
    get(id) {
      return plugins.get(id);
    },
    getAll() {
      return Array.from(plugins.values());
    },
    connectAll() {
      // no-op for now — providers manage their own connections
    },
    disconnectAll() {
      // no-op for now — providers manage their own connections
    },
    onChange(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getActiveTheme() {
      for (const p of plugins.values()) {
        if (p.definition.type === 'theme') {
          return (p.definition as ThemePluginDefinition).theme;
        }
      }
      return undefined;
    },
    getRendererHooks() {
      const merged: RendererPluginHooks = {};
      for (const p of plugins.values()) {
        if (p.definition.type === 'renderer') {
          const hooks = (p.definition as RendererPluginDefinition).hooks;
          if (hooks.onBeforeRender) merged.onBeforeRender = hooks.onBeforeRender;
          if (hooks.onAfterRender) merged.onAfterRender = hooks.onAfterRender;
        }
      }
      return merged;
    },
    getProviders() {
      return [];
    },
  };
}
