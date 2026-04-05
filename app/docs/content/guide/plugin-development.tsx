import { CodeBlock } from '../../components/CodeBlock';

export default function PluginDevelopmentPage() {
  return (
    <>
      <h1>Plugin Development</h1>
      <p className="docs-lead">
        Extend swarming with custom plugins that hook into the simulation lifecycle.
      </p>

      <h2 id="plugin-interface">Plugin interface</h2>
      <CodeBlock
        language="typescript"
        code={`interface SwarmingPlugin {
  id: string;
  name: string;

  // Lifecycle hooks
  onInit?: (engine: SwarmingEngine) => void;
  onTick?: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  onNodeAdd?: (node: GraphNode) => void;
  onNodeRemove?: (nodeId: string) => void;
  onDestroy?: () => void;
}`}
      />

      <h2 id="example-plugin">Example: Logger plugin</h2>
      <CodeBlock
        language="typescript"
        filename="plugins/logger.ts"
        code={`const loggerPlugin: SwarmingPlugin = {
  id: 'logger',
  name: 'Event Logger',

  onNodeAdd: (node) => {
    console.log('[swarming] Node added:', node.id, node.category);
  },

  onTick: (nodes) => {
    if (nodes.length % 100 === 0) {
      console.log('[swarming] Node count:', nodes.length);
    }
  },
};`}
      />

      <h2 id="registering">Registering plugins</h2>
      <CodeBlock
        language="tsx"
        code={`<ForceGraph
  nodes={nodes}
  edges={edges}
  plugins={[loggerPlugin, analyticsPlugin]}
/>`}
      />

      <h2 id="ideas">Plugin ideas</h2>
      <ul>
        <li><strong>Analytics:</strong> Track node count, edge creation rate, simulation performance</li>
        <li><strong>Persistence:</strong> Save/restore graph state to localStorage or a database</li>
        <li><strong>Filtering:</strong> Custom filter logic beyond category-based filtering</li>
        <li><strong>Animation:</strong> Custom animation effects on node creation or removal</li>
        <li><strong>Export:</strong> Export to GEXF, GraphML, or other graph formats</li>
      </ul>
    </>
  );
}
