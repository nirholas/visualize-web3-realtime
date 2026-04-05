import { CodeBlock } from '../../components/CodeBlock';

export default function HeadlessModePage() {
  return (
    <>
      <h1>Headless Mode</h1>
      <p className="docs-lead">
        Run the force simulation without any rendering — ideal for server-side layout
        pre-computation and API endpoints.
      </p>

      <h2 id="usage">Usage</h2>
      <CodeBlock
        language="typescript"
        filename="server/compute-layout.ts"
        code={`import { ForceGraphSimulation } from '@web3viz/core';

const sim = new ForceGraphSimulation({
  alphaDecay: 0.05,
  velocityDecay: 0.4,
});

// Add your data
for (const node of rawNodes) {
  sim.addNode({ id: node.id, x: 0, y: 0, z: 0 });
}
for (const edge of rawEdges) {
  sim.addEdge({ source: edge.from, target: edge.to });
}

// Run until settled
sim.runUntilSettled();

// Get final positions
const positions = sim.getNodePositions();
// → [{ id: 'a', x: 12.3, y: -5.1, z: 8.7 }, ...]`}
      />

      <h2 id="use-cases">Use cases</h2>
      <ul>
        <li><strong>Pre-computation:</strong> Compute layout at build time for instant rendering</li>
        <li><strong>API endpoint:</strong> Return layout positions from a server</li>
        <li><strong>Testing:</strong> Unit test simulation behavior without a browser</li>
        <li><strong>Snapshots:</strong> Generate layout data for static site generation</li>
      </ul>
    </>
  );
}
