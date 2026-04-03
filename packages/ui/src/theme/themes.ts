// ============================================================================
// @web3viz/ui — Theme Definitions
// ============================================================================

import { colors } from '../tokens/colors';
import { agentThemeTokens } from '../tokens/agent-colors';

export interface Theme {
  name: string;
  cssVars: Record<string, string>;
}

/** Extract all CSS custom property defaults for a given mode */
function buildCssVars(mode: 'light' | 'dark'): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [, value] of Object.entries(colors)) {
    if (typeof value === 'object' && 'var' in value) {
      vars[value.var] = value[mode];
    }
  }
  return vars;
}

export const lightTheme: Theme = {
  name: 'light',
  cssVars: {
    ...buildCssVars('light'),
    '--w3v-backdrop': 'rgba(8,8,15,0.6)',
    '--w3v-backdrop-blur': '12px',
    '--w3v-graph-ground': '#f8f8fa',
    // Agent-specific theme tokens
    '--w3v-agent-bg': agentThemeTokens.light.background,
    '--w3v-agent-hub': agentThemeTokens.light.agentHub,
    '--w3v-agent-hub-active': agentThemeTokens.light.agentHubActive,
    '--w3v-agent-task-active': agentThemeTokens.light.taskActive,
    '--w3v-agent-task-complete': agentThemeTokens.light.taskComplete,
    '--w3v-agent-task-failed': agentThemeTokens.light.taskFailed,
    '--w3v-agent-task-planning': agentThemeTokens.light.taskPlanning,
    '--w3v-agent-edge': agentThemeTokens.light.edge,
    '--w3v-agent-sidebar': agentThemeTokens.light.sidebar,
    '--w3v-agent-text': agentThemeTokens.light.text,
    '--w3v-agent-muted': agentThemeTokens.light.muted,
  },
};

export const darkTheme: Theme = {
  name: 'dark',
  cssVars: {
    ...buildCssVars('dark'),
    '--w3v-backdrop': 'rgba(255,255,255,0.06)',
    '--w3v-backdrop-blur': '12px',
    '--w3v-graph-ground': '#111118',
    // Agent-specific theme tokens
    '--w3v-agent-bg': agentThemeTokens.dark.background,
    '--w3v-agent-hub': agentThemeTokens.dark.agentHub,
    '--w3v-agent-hub-active': agentThemeTokens.dark.agentHubActive,
    '--w3v-agent-task-active': agentThemeTokens.dark.taskActive,
    '--w3v-agent-task-complete': agentThemeTokens.dark.taskComplete,
    '--w3v-agent-task-failed': agentThemeTokens.dark.taskFailed,
    '--w3v-agent-task-planning': agentThemeTokens.dark.taskPlanning,
    '--w3v-agent-edge': agentThemeTokens.dark.edge,
    '--w3v-agent-sidebar': agentThemeTokens.dark.sidebar,
    '--w3v-agent-text': agentThemeTokens.dark.text,
    '--w3v-agent-muted': agentThemeTokens.dark.muted,
  },
};

/** Create a custom theme by overriding specific CSS variables */
export function createTheme(name: string, overrides: Record<string, string>, base: Theme = lightTheme): Theme {
  return {
    name,
    cssVars: { ...base.cssVars, ...overrides },
  };
}
