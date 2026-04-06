import { BlogLayout } from "../../components/BlogLayout";
import { CodeBlock } from "../../components/CodeBlock";

export default function WebSocketTo3D() {
  return (
    <BlogLayout>
      <p>
        You have a WebSocket pushing data. You want to see it &mdash; not in
        a table or a chart, but as a living, breathing 3D graph where nodes
        appear, connect, and swarm in real-time. With Swarming, that&apos;s
        about 10 lines of code.
      </p>

      <blockquote>
        <strong>Note:</strong> The <code>swarming</code> npm package is
        currently in development. The API shown here represents the target
        developer experience. You can use the full library today by cloning
        the{" "}
        <a href="https://github.com/nicholasgriffintn/visualize-web3-realtime">
          repository
        </a>
        .
      </blockquote>

      <h2>Install</h2>

      <CodeBlock
        filename="terminal"
        language="bash"
        code={`npm install swarming`}
      />

      <h2>The Minimal Setup</h2>
      <p>
        The <code>SwarmGraph</code> component handles everything:
        connecting to your data source, running physics simulation, and
        rendering with WebGL. Here&apos;s the simplest possible version:
      </p>

      <CodeBlock
        filename="App.tsx"
        language="tsx"
        code={`import { SwarmGraph } from 'swarming';

function App() {
  return (
    <SwarmGraph
      source="wss://your-data-source.com/stream"
      nodeColor={(node) =>
        node.type === 'hub' ? '#6366f1' : '#555566'
      }
      nodeSize={(node) =>
        node.type === 'hub' ? 1.5 : 0.2
      }
      physics={{ charge: -50, linkDistance: 10 }}
      onNodeClick={(node) => console.log(node)}
    />
  );
}`}
      />

      <p>
        That&apos;s it. Five props, one component, and you have a 3D
        force-directed graph that updates in real-time. Let&apos;s break
        down what each prop does:
      </p>
      <ul>
        <li>
          <strong>source</strong>: WebSocket URL. Swarming connects, handles
          reconnection with exponential backoff, and parses incoming messages
          as graph data.
        </li>
        <li>
          <strong>nodeColor</strong>: function that receives a node and
          returns a CSS color string. Hub nodes (high-connectivity) get one
          color, leaf nodes get another.
        </li>
        <li>
          <strong>nodeSize</strong>: function that controls the radius of
          each node. Larger nodes repel more strongly in the physics
          simulation.
        </li>
        <li>
          <strong>physics</strong>: d3-force-3d parameters. Charge controls
          repulsion between nodes; linkDistance controls the rest length of
          edges.
        </li>
        <li>
          <strong>onNodeClick</strong>: callback when a node is clicked.
          Receives the full node data object.
        </li>
      </ul>

      <h2>Connecting Real Data</h2>
      <p>
        The WebSocket should send JSON messages with nodes and edges. Here&apos;s
        how you&apos;d connect to a real data source like an Ethereum mempool
        monitor:
      </p>

      <CodeBlock
        filename="EthMempool.tsx"
        language="tsx"
        code={`import { SwarmGraph } from 'swarming';

function EthMempool() {
  return (
    <SwarmGraph
      source="wss://mempool.example.com/stream"
      nodeLabel={(node) => node.label}
      nodeColor={(node) => {
        if (node.type === 'hub') return '#10b981'; // protocol
        return '#6366f1'; // transaction
      }}
      edgeColor={() => 'rgba(99, 102, 241, 0.3)'}
      maxNodes={5000}
      physics={{
        charge: -80,
        linkDistance: 8,
        centerStrength: 0.03,
      }}
    />
  );
}`}
      />

      <p>
        The <code>maxNodes</code> prop caps the visualization at 5,000 nodes.
        When new nodes arrive beyond the limit, the oldest nodes are evicted
        using LRU semantics. This prevents memory growth over long-running
        sessions.
      </p>

      <h2>Customizing the Look</h2>
      <p>
        Swarming renders with Three.js under the hood, which means you get
        full control over materials, post-processing, and camera:
      </p>

      <CodeBlock
        filename="CustomGraph.tsx"
        language="tsx"
        code={`import { SwarmGraph } from 'swarming';

function CustomGraph() {
  return (
    <SwarmGraph
      source="wss://data.example.com/stream"
      // Visual customization
      bloom={{ intensity: 1.5, threshold: 0.8 }}
      background="#0a0a12"
      nodeColor={(node) => {
        const colors = {
          protocol: '#6366f1',
          token: '#10b981',
          trader: '#f59e0b',
        };
        return colors[node.category] || '#555566';
      }}
      // Camera
      cameraPosition={[0, 0, 150]}
      enableOrbitalControls
      // Physics
      physics={{
        charge: -120,
        linkDistance: 12,
        collisionPadding: 0.5,
        alphaDecay: 0.01, // slower cooling
        velocityDecay: 0.4,
      }}
    />
  );
}`}
      />

      <p>
        The <code>bloom</code> prop enables post-processing glow effects.
        Nodes with high emissive values (set automatically for hub nodes)
        will glow, creating depth and visual hierarchy without any additional
        work.
      </p>

      <h2>Adding Interactivity</h2>
      <p>
        Click handlers are just the start. You can add hover effects, selection
        state, and detail panels:
      </p>

      <CodeBlock
        filename="InteractiveGraph.tsx"
        language="tsx"
        code={`import { SwarmGraph } from 'swarming';
import { useState } from 'react';

function InteractiveGraph() {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <SwarmGraph
        source="wss://data.example.com/stream"
        onNodeClick={(node) => setSelected(node)}
        onNodeHover={(node) => {
          document.body.style.cursor = node ? 'pointer' : 'default';
        }}
        highlightConnected  // dim unconnected nodes on hover
        physics={{ charge: -80, linkDistance: 10 }}
      />

      {selected && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: '#0e0e1a', border: '1px solid #1e1e2e',
          borderRadius: 8, padding: 16, maxWidth: 300,
        }}>
          <h3>{selected.label}</h3>
          <p>Type: {selected.type}</p>
          <p>Connections: {selected.edges?.length ?? 0}</p>
          <button onClick={() => setSelected(null)}>Close</button>
        </div>
      )}
    </div>
  );
}`}
      />

      <p>
        The <code>highlightConnected</code> prop automatically dims
        unrelated nodes when you hover over a hub, making it easy to trace
        connections through dense graphs.
      </p>

      <h2>Deploying</h2>
      <p>
        Swarming is a standard React component, so it deploys wherever React
        does:
      </p>
      <ul>
        <li>
          <strong>Vercel</strong>: <code>npx vercel</code> &mdash; zero
          config, automatic preview deployments
        </li>
        <li>
          <strong>Netlify</strong>: connect your repo, set build command to{" "}
          <code>npm run build</code>
        </li>
        <li>
          <strong>Docker</strong>: any Node.js container works
        </li>
        <li>
          <strong>Static export</strong>: <code>next build</code> +{" "}
          <code>next export</code> for CDN hosting
        </li>
      </ul>
      <p>
        The WebSocket connection is client-side, so there&apos;s no
        server-side requirement. Your static build connects to the data
        source directly from the browser.
      </p>

      <h2>Data Format</h2>
      <p>
        Swarming expects WebSocket messages as JSON with this shape:
      </p>

      <CodeBlock
        filename="data-format.json"
        language="json"
        code={`{
  "nodes": [
    { "id": "eth-1", "type": "hub", "label": "Uniswap", "value": 1500 },
    { "id": "tx-42", "type": "agent", "label": "0x7a3b...", "parent": "eth-1" }
  ],
  "edges": [
    { "source": "tx-42", "target": "eth-1" }
  ]
}`}
      />

      <p>
        Nodes with <code>type: &quot;hub&quot;</code> become larger central
        nodes. Nodes with <code>type: &quot;agent&quot;</code> orbit around
        their parent hub. Edges define connections and are rendered as
        translucent lines.
      </p>

      <h2>Next Steps</h2>
      <ul>
        <li>
          Browse the{" "}
          <a href="https://swarming.world/world">live demo</a> to see
          5,000+ nodes in action
        </li>
        <li>
          Read the{" "}
          <a href="https://github.com/nicholasgriffintn/visualize-web3-realtime">
            source code
          </a>{" "}
          for the full implementation
        </li>
        <li>
          Check out our{" "}
          <a href="/blog/rendering-5000-particles">performance deep-dive</a>{" "}
          for the rendering techniques behind the scenes
        </li>
        <li>
          Read the{" "}
          <a href="/blog/building-realtime-viz-engine">architecture post</a>{" "}
          for the design decisions that make real-time work
        </li>
      </ul>
    </BlogLayout>
  );
}
