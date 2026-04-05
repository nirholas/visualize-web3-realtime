import { CodeBlock } from '../../components/CodeBlock';

export default function ClickHoverEventsPage() {
  return (
    <>
      <h1>Click &amp; Hover Events</h1>
      <p className="docs-lead">
        Handle click and hover events on nodes and edges with typed callbacks.
      </p>

      <h2 id="node-events">Node events</h2>
      <CodeBlock
        language="tsx"
        code={`<ForceGraph
  nodes={nodes}
  edges={edges}
  onNodeClick={(node) => {
    console.log('Clicked:', node.id, node.label);
    // Show detail panel, focus camera, etc.
  }}
  onNodeHover={(node) => {
    // null when hovering away from a node
    if (node) {
      setTooltip({ x: node.x, y: node.y, data: node });
    } else {
      setTooltip(null);
    }
  }}
/>`}
      />

      <h2 id="edge-events">Edge events</h2>
      <CodeBlock
        language="tsx"
        code={`<ForceGraph
  nodes={nodes}
  edges={edges}
  onEdgeClick={(edge) => {
    console.log('Edge:', edge.source, '→', edge.target);
  }}
/>`}
      />

      <h2 id="event-data">Event data</h2>
      <p>
        Each event callback receives the full node or edge object, including
        all custom properties you attached to it via your data provider.
      </p>
    </>
  );
}
