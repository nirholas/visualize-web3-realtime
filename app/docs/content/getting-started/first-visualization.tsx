import { CodeBlock } from '../../components/CodeBlock';

export default function FirstVisualizationPage() {
  return (
    <>
      <h1>Your First Visualization</h1>
      <p className="docs-lead">
        Build a complete, interactive real-time network graph from scratch.
      </p>

      <h2 id="what-we-will-build">What we&apos;ll build</h2>
      <p>
        A 3D force-directed graph that streams live data, with custom node colors,
        edge animations, a stats bar, and mouse interaction &mdash; all in under 100 lines.
      </p>

      <h2 id="project-setup">1. Project setup</h2>
      <CodeBlock
        language="bash"
        code={`npx create-next-app@14 my-swarming-app --typescript --tailwind
cd my-swarming-app
npm install @web3viz/core @web3viz/react-graph @web3viz/providers @web3viz/ui
npm install three @react-three/fiber @react-three/drei d3-force`}
      />

      <h2 id="create-graph">2. Create the graph component</h2>
      <CodeBlock
        language="tsx"
        filename="components/NetworkGraph.tsx"
        showLineNumbers
        code={`'use client';

import { useRef, useCallback } from 'react';
import { ForceGraph } from '@web3viz/react-graph';
import { useDataProvider } from '@web3viz/providers';
import type { GraphHandle, GraphNode } from '@web3viz/core';

export function NetworkGraph() {
  const graphRef = useRef<GraphHandle>(null);

  const { nodes, edges, stats } = useDataProvider({
    provider: 'mock',
    options: { interval: 500, maxNodes: 300 },
  });

  const handleNodeClick = useCallback((node: GraphNode) => {
    console.log('Clicked node:', node.id);
    graphRef.current?.focusNode(node.id);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <ForceGraph
        ref={graphRef}
        nodes={nodes}
        edges={edges}
        background="#0a0a0f"
        showLabels
        showGround
        onNodeClick={handleNodeClick}
        simulationConfig={{
          alphaDecay: 0.01,
          velocityDecay: 0.3,
          chargeStrength: -30,
        }}
      />

      {/* Stats overlay */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        padding: '12px 16px',
        background: 'rgba(10,10,18,0.8)',
        borderRadius: '8px',
        border: '1px solid rgba(140,140,200,0.1)',
        color: '#d8d8e8',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}>
        <div>Nodes: {stats?.nodeCount ?? 0}</div>
        <div>Edges: {stats?.edgeCount ?? 0}</div>
      </div>
    </div>
  );
}`}
      />

      <h2 id="add-to-page">3. Add to your page</h2>
      <CodeBlock
        language="tsx"
        filename="app/page.tsx"
        code={`import dynamic from 'next/dynamic';

const NetworkGraph = dynamic(
  () => import('../components/NetworkGraph').then(m => ({ default: m.NetworkGraph })),
  { ssr: false, loading: () => <div>Loading 3D visualization...</div> }
);

export default function Home() {
  return <NetworkGraph />;
}`}
      />

      <div className="docs-callout">
        <strong>Why dynamic import?</strong> Three.js requires the <code>window</code> and <code>canvas</code> APIs,
        which aren&apos;t available during server-side rendering. Using <code>dynamic</code> with{' '}
        <code>ssr: false</code> ensures the component only loads on the client.
      </div>

      <h2 id="run-it">4. Run it</h2>
      <CodeBlock language="bash" code={`npm run dev`} />
      <p>
        Open your browser and you should see a 3D graph building itself in real time.
        Drag to orbit, scroll to zoom, click a node to focus.
      </p>

      <h2 id="next-steps">Next steps</h2>
      <ul>
        <li><a href="/docs/guide/custom-providers">Custom Providers</a> &mdash; connect your own data source</li>
        <li><a href="/docs/guide/physics-tuning">Physics Tuning</a> &mdash; tweak the simulation parameters</li>
        <li><a href="/docs/guide/themes">Themes</a> &mdash; match your brand colors</li>
      </ul>
    </>
  );
}
