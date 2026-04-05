import { CodeBlock } from '../../components/CodeBlock';

export default function NodeSelectionPage() {
  return (
    <>
      <h1>Node Selection</h1>
      <p className="docs-lead">
        Select, highlight, and filter nodes for focused exploration.
      </p>

      <h2 id="selection-state">Selection state</h2>
      <CodeBlock
        language="tsx"
        code={`const [selectedNode, setSelectedNode] = useState<string | null>(null);

<ForceGraph
  nodes={nodes}
  edges={edges}
  selectedNodeId={selectedNode}
  onNodeClick={(node) => setSelectedNode(node.id)}
  highlightConnected={true}  // Dim non-connected nodes when one is selected
/>`}
      />

      <h2 id="programmatic">Programmatic selection</h2>
      <CodeBlock
        language="tsx"
        code={`// Focus the camera on a node
graphRef.current?.focusNode('node-123');

// Clear selection
setSelectedNode(null);`}
      />

      <h2 id="filtering">Filtering by category</h2>
      <CodeBlock
        language="tsx"
        code={`const [activeCategories, setActiveCategories] = useState(['token', 'trade']);

const filteredNodes = nodes.filter(n => activeCategories.includes(n.category));
const filteredEdges = edges.filter(e =>
  filteredNodes.some(n => n.id === e.source) &&
  filteredNodes.some(n => n.id === e.target)
);

<ForceGraph nodes={filteredNodes} edges={filteredEdges} />`}
      />
    </>
  );
}
