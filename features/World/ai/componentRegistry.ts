import { z, toJSONSchema } from 'zod';

/**
 * Registry of components the AI can generate.
 * Each entry maps a component name to its Zod schema and React component.
 */
export const componentRegistry = {
  sceneColorUpdate: {
    description: 'Changes the color scheme of the 3D world',
    schema: z.object({
      background: z.string().describe('Hex color for scene background'),
      protocolColor: z.string().describe('Hex color for protocol nodes'),
      userColor: z.string().describe('Hex color for user/agent nodes'),
      bloomIntensity: z.number().min(0).max(2).optional(),
    }),
  },

  cameraFocus: {
    description: 'Moves the camera to focus on a specific hub or region',
    schema: z.object({
      hubIndex: z.number().optional().describe('Index of hub to focus on (0-based)'),
      position: z
        .tuple([z.number(), z.number(), z.number()])
        .optional()
        .describe('Camera position [x, y, z]'),
      lookAt: z
        .tuple([z.number(), z.number(), z.number()])
        .optional()
        .describe('Camera look-at target [x, y, z]'),
    }),
  },

  dataFilter: {
    description: 'Filters visible data by protocol, time range, or volume',
    schema: z.object({
      protocols: z.array(z.string()).optional().describe('Protocol mint addresses to show'),
      minVolume: z.number().optional().describe('Minimum volume threshold'),
      timeRange: z
        .enum(['1h', '6h', '24h', '7d', 'all'])
        .optional()
        .describe('Time range to display'),
    }),
  },

  agentSummary: {
    description: 'Displays a summary card of agent activity',
    schema: z.object({
      title: z.string().describe('Summary card title'),
      metrics: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
          change: z.number().optional().describe('Percentage change'),
        }),
      ),
    }),
  },

  tradeVisualization: {
    description: 'Highlights a specific trade or series of trades in the 3D scene',
    schema: z.object({
      tradeIds: z.array(z.string()).describe('Trade IDs to highlight'),
      highlightColor: z.string().optional().describe('Hex color for highlight'),
      duration: z.number().optional().describe('Highlight duration in ms'),
    }),
  },
} as const;

export type ComponentRegistry = typeof componentRegistry;
export type ComponentName = keyof ComponentRegistry;

/**
 * Generate Anthropic-compatible tool definitions from the component registry.
 * Uses Zod v4's built-in toJSONSchema for schema conversion.
 */
export function getToolDefinitions() {
  return Object.entries(componentRegistry).map(([name, config]) => ({
    name,
    description: config.description,
    input_schema: toJSONSchema(config.schema) as Record<string, unknown>,
  }));
}
