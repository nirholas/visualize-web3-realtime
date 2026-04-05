import { APITable } from '../../components/APITable';
import { CodeBlock } from '../../components/CodeBlock';

export default function UseSwarmingEnginePage() {
  return (
    <>
      <h1>useSwarmingEngine() Hook</h1>
      <p className="docs-lead">
        Access the simulation engine for imperative control over nodes, edges,
        camera, and simulation state.
      </p>

      <h2 id="usage">Usage</h2>
      <CodeBlock
        language="tsx"
        code={`import { useSwarmingEngine } from '@web3viz/react-graph';

function Controls() {
  const engine = useSwarmingEngine();

  return (
    <div>
      <button onClick={() => engine.pause()}>Pause</button>
      <button onClick={() => engine.resume()}>Resume</button>
      <button onClick={() => engine.resetCamera()}>Reset View</button>
      <div>Nodes: {engine.nodeCount}</div>
    </div>
  );
}`}
      />

      <h2 id="return-value">Return value</h2>
      <APITable
        properties={[
          { name: 'nodes', type: 'GraphNode[]', description: 'Current array of nodes' },
          { name: 'edges', type: 'GraphEdge[]', description: 'Current array of edges' },
          { name: 'nodeCount', type: 'number', description: 'Total number of nodes' },
          { name: 'edgeCount', type: 'number', description: 'Total number of edges' },
          { name: 'isRunning', type: 'boolean', description: 'Whether the simulation is currently running' },
          { name: 'alpha', type: 'number', description: 'Current simulation alpha (energy level)' },
          { name: 'pause', type: '() => void', description: 'Pause the simulation' },
          { name: 'resume', type: '() => void', description: 'Resume the simulation' },
          { name: 'focusNode', type: '(id: string) => void', description: 'Animate camera to focus on a node' },
          { name: 'resetCamera', type: '() => void', description: 'Reset camera to default position' },
          { name: 'getCanvas', type: '() => HTMLCanvasElement', description: 'Get the canvas element for screenshots' },
          { name: 'addNode', type: '(node: GraphNode) => void', description: 'Imperatively add a node' },
          { name: 'removeNode', type: '(id: string) => void', description: 'Remove a node by ID' },
        ]}
      />

      <div className="docs-callout">
        <strong>Note:</strong> This hook must be used inside a component that is a child
        of <code>&lt;ForceGraph&gt;</code>. It reads from React Three Fiber&apos;s context.
      </div>
    </>
  );
}
