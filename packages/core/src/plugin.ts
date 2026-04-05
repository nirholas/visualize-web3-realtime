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
  foreground: string;
  accent: string;
  hubColors: string[];
  agentColors: string[];
}

export interface RendererPluginHooks {
  onBeforeRender?: () => void;
  onAfterRender?: () => void;
}

export type PluginProviderFactory = (config: Record<string, unknown>) => unknown;

export interface SourcePluginDefinition {
  type: 'source';
  meta: PluginMeta;
  configSchema?: PluginConfigSchema;
  createProvider: PluginProviderFactory;
}

export interface ThemePluginDefinition {
  type: 'theme';
  meta: PluginMeta;
  theme: ThemeConfig;
}

export interface RendererPluginDefinition {
  type: 'renderer';
  meta: PluginMeta;
  hooks: RendererPluginHooks;
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
}

export function definePlugin<T extends PluginDefinition>(def: T): T {
  return def;
}

export function createPluginManager(): PluginManager {
  const plugins = new Map<string, ResolvedPlugin>();
  return {
    register(plugin) {
      plugins.set(plugin.meta.id, { definition: plugin, config: {} });
    },
    unregister(id) {
      plugins.delete(id);
    },
    get(id) {
      return plugins.get(id);
    },
    getAll() {
      return Array.from(plugins.values());
    },
  };
}
