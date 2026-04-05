import { APITable } from '../../components/APITable';
import { CodeBlock } from '../../components/CodeBlock';

export default function SwarmingComponentPage() {
  return (
    <>
      <h1>&lt;Swarming /&gt; Component</h1>
      <p className="docs-lead">
        The main entry point for rendering a 3D force-directed graph visualization.
        Alias: <code>&lt;ForceGraph /&gt;</code>
      </p>

      <h2 id="basic-usage">Basic usage</h2>
      <CodeBlock
        language="tsx"
        code={`import { ForceGraph } from '@web3viz/react-graph';

<ForceGraph
  nodes={nodes}
  edges={edges}
  background="#0a0a0f"
  showLabels
  showGround
/>`}
      />

      <h2 id="props">Props</h2>

      <h3>Data</h3>
      <APITable
        properties={[
          { name: 'nodes', type: 'GraphNode[]', required: true, description: 'Array of node objects to render' },
          { name: 'edges', type: 'GraphEdge[]', required: true, description: 'Array of edge objects connecting nodes' },
          { name: 'selectedNodeId', type: 'string | null', description: 'ID of the currently selected node' },
        ]}
      />

      <h3>Appearance</h3>
      <APITable
        properties={[
          { name: 'background', type: 'string', default: '"#0a0a0f"', description: 'Background color of the canvas' },
          { name: 'showLabels', type: 'boolean', default: 'false', description: 'Show text labels on nodes' },
          { name: 'showGround', type: 'boolean', default: 'false', description: 'Render a ground plane beneath the graph' },
          { name: 'nodeColor', type: '(node: GraphNode) => string', description: 'Function to determine node color' },
          { name: 'nodeSize', type: '(node: GraphNode) => number', description: 'Function to determine node size' },
          { name: 'edgeColor', type: '(edge: GraphEdge) => string', description: 'Function to determine edge color' },
          { name: 'edgeWidth', type: '(edge: GraphEdge) => number', description: 'Function to determine edge width' },
        ]}
      />

      <h3>Physics</h3>
      <APITable
        properties={[
          { name: 'simulationConfig', type: 'SimulationConfig', description: 'Force simulation parameters (see Physics Configuration)' },
          { name: 'mouseRepulsion', type: 'boolean', default: 'true', description: 'Enable cursor repulsion effect' },
          { name: 'mouseRepulsionRadius', type: 'number', default: '50', description: 'Radius of mouse repulsion effect' },
          { name: 'mouseRepulsionStrength', type: 'number', default: '0.5', description: 'Strength of repulsion force' },
        ]}
      />

      <h3>Events</h3>
      <APITable
        properties={[
          { name: 'onNodeClick', type: '(node: GraphNode) => void', description: 'Called when a node is clicked' },
          { name: 'onNodeHover', type: '(node: GraphNode | null) => void', description: 'Called when hovering over/away from a node' },
          { name: 'onEdgeClick', type: '(edge: GraphEdge) => void', description: 'Called when an edge is clicked' },
          { name: 'highlightConnected', type: 'boolean', default: 'false', description: 'Dim unconnected nodes when one is selected' },
        ]}
      />

      <h3>Advanced</h3>
      <APITable
        properties={[
          { name: 'ref', type: 'Ref<GraphHandle>', description: 'Imperative handle for camera control and screenshots' },
          { name: 'plugins', type: 'SwarmingPlugin[]', description: 'Array of plugins to extend behavior' },
        ]}
      />
    </>
  );
}
