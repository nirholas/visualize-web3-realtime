import { BlogLayout } from "../components/BlogLayout";
import { CodeBlock } from "../components/CodeBlock";

export function WebsocketTo3dContent() {
  return (
    <BlogLayout>
      <h2>What We Are Building</h2>
      <p>
        Imagine a live 3D force graph that updates itself the moment new data
        arrives over a WebSocket. Nodes drift into view, edges snap into place,
        and the whole structure breathes with the rhythm of your data stream.
        That is exactly what we are going to build in this tutorial — and the
        core setup is barely ten lines of code.
      </p>
      <p>
        We will use{" "}
        <a href="https://swarming.world" target="_blank" rel="noopener noreferrer">
          Swarming
        </a>
        , an open-source library that wraps React Three Fiber and D3-force into
        a single declarative component called <code>SwarmGraph</code>. You point
        it at a data source, tweak a few props, and it handles the simulation
        loop, GPU-instanced rendering, and layout for you.
      </p>
      <p>
        By the end of this post you will have a working real-time visualization
        that you can drop into any React app. Let us get started.
      </p>

      <h2>Step 1: Install Swarming</h2>
      <p>
        Swarming is distributed as a single npm package. Add it to your project
        with one command:
      </p>
      <CodeBlock
        code={`npm install swarming`}
        language="bash"
        filename="terminal"
      />
      <blockquote>
        Note: the <code>swarming</code> package is not published to npm yet.
        This tutorial shows the target API we are working toward. You can follow
        progress and try the development build at{" "}
        <a href="https://github.com/nicholasrubright/swarming" target="_blank" rel="noopener noreferrer">
          the GitHub repo
        </a>
        .
      </blockquote>
      <p>
        Swarming has peer dependencies on <code>react</code> and{" "}
        <code>react-dom</code> (18+). If you are starting from scratch, the
        fastest path is a Vite or Next.js template — both work out of the box.
      </p>

      <h2>Step 2: Render Your First Graph</h2>
      <p>
        The entire data-to-3D pipeline fits inside a single component. Here is
        the minimal version — five lines of meaningful code:
      </p>
      <CodeBlock
        code={`import { SwarmGraph } from 'swarming';

function App() {
  return (
    <SwarmGraph
      source="wss://your-data-source.com/stream"
      nodeColor={(node) => node.type === 'hub' ? '#6366f1' : '#555566'}
      nodeSize={(node) => node.type === 'hub' ? 1.5 : 0.2}
      physics={{ charge: -50, linkDistance: 10 }}
      onNodeClick={(node) => console.log(node)}
    />
  );
}

export default App;`}
        language="tsx"
        filename="App.tsx"
      />
      <p>
        Let us break down what is happening here:
      </p>
      <ul>
        <li>
          <strong>source</strong> — A WebSocket URL. Swarming opens the
          connection, parses incoming JSON messages, and maps them to graph
          nodes and edges automatically. Each message should contain at minimum
          an <code>id</code> field; edges are inferred from a{" "}
          <code>links</code> array or a <code>parentId</code> field.
        </li>
        <li>
          <strong>nodeColor / nodeSize</strong> — Accessor functions that
          receive the raw node data and return a color string or a size
          multiplier. This is how you visually distinguish different entity
          types.
        </li>
        <li>
          <strong>physics</strong> — A plain object passed straight to the
          D3-force simulation. <code>charge</code> controls repulsion between
          nodes (negative values push them apart) and{" "}
          <code>linkDistance</code> sets the ideal edge length.
        </li>
        <li>
          <strong>onNodeClick</strong> — An event handler fired when a user
          clicks a node. You get the full node data object, so you can open a
          detail panel, navigate to a page, or trigger any side effect.
        </li>
      </ul>
      <p>
        That is genuinely all you need for a working real-time 3D graph. Start
        your dev server and you should see nodes appearing as your WebSocket
        pushes data.
      </p>

      <h2>Step 3: Connect to a Real Data Source</h2>
      <p>
        The <code>source</code> prop accepts any WebSocket URL. If your backend
        sends JSON messages with an <code>id</code> field, Swarming will pick
        them up. Here is an example using a public Ethereum mempool stream
        (replace the URL with your own feed):
      </p>
      <CodeBlock
        code={`<SwarmGraph
  source="wss://stream.example.io/eth/mempool"
  nodeLabel={(node) => \`\${node.from.slice(0, 6)}...\${node.from.slice(-4)}\`}
  edgeColor={() => 'rgba(99, 102, 241, 0.3)'}
  maxNodes={2000}
/>`}
        language="tsx"
        filename="EthMempool.tsx"
      />
      <p>
        A few things to note:
      </p>
      <ul>
        <li>
          <strong>nodeLabel</strong> lets you control the text rendered next to
          each node. Here we truncate Ethereum addresses to keep the scene
          readable.
        </li>
        <li>
          <strong>edgeColor</strong> works just like <code>nodeColor</code> but
          for the lines connecting nodes. We are using a translucent indigo so
          edges do not overpower the nodes.
        </li>
        <li>
          <strong>maxNodes</strong> caps the number of nodes in the scene. When
          the limit is reached, the oldest nodes are evicted — the same
          bounded-collection pattern we use internally to keep memory stable.
        </li>
      </ul>
      <p>
        If your data source is not a WebSocket, you can also pass a static
        array of nodes and edges to the <code>data</code> prop, or use the{" "}
        <code>useSwarmGraph</code> hook for full control over when and how data
        enters the simulation.
      </p>

      <h2>Step 4: Customize the Visualization</h2>
      <p>
        Swarming ships sensible defaults, but you will probably want to tweak
        the look and feel. Here are five more lines that significantly change
        the character of the graph:
      </p>
      <CodeBlock
        code={`<SwarmGraph
  source="wss://your-data-source.com/stream"
  // Visual
  nodeColor={(node) => node.value > 100 ? '#22c55e' : '#6366f1'}
  nodeSize={(node) => Math.log2(node.value + 1) * 0.3}
  background="#08080f"
  bloom={{ intensity: 0.4, threshold: 0.8 }}

  // Physics
  physics={{
    charge: -80,
    linkDistance: 15,
    alphaDecay: 0.02,
    velocityDecay: 0.4,
  }}

  // Camera
  cameraPosition={[0, 0, 350]}
  enableOrbitalControls
/>`}
        language="tsx"
        filename="CustomGraph.tsx"
      />
      <ul>
        <li>
          <strong>bloom</strong> adds a post-processing glow effect. Setting
          a high <code>threshold</code> means only the brightest nodes bloom,
          which keeps the scene from looking washed out.
        </li>
        <li>
          <strong>alphaDecay</strong> and <strong>velocityDecay</strong> in the
          physics config control how quickly the simulation settles. Lower
          alpha decay means the graph keeps moving longer — great for streams
          with bursty data.
        </li>
        <li>
          <strong>cameraPosition</strong> sets the initial viewpoint as an
          [x, y, z] tuple. Pull z out further for large graphs.
        </li>
        <li>
          <strong>enableOrbitalControls</strong> lets users rotate, zoom, and
          pan the scene with their mouse or trackpad.
        </li>
      </ul>

      <h2>Step 5: Add Interactivity</h2>
      <p>
        A visualization is most useful when users can explore it. Swarming
        supports click, hover, and drag interactions out of the box:
      </p>
      <CodeBlock
        code={`import { SwarmGraph } from 'swarming';
import { useState } from 'react';

function InteractiveGraph() {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <SwarmGraph
        source="wss://your-data-source.com/stream"
        nodeColor={(node) =>
          node.id === selected?.id ? '#facc15' : '#6366f1'
        }
        onNodeClick={(node) => setSelected(node)}
        onNodeHover={(node) => {
          document.body.style.cursor = node ? 'pointer' : 'default';
        }}
        physics={{ charge: -50, linkDistance: 10 }}
      />
      {selected && (
        <div style={{
          position: 'absolute', bottom: 16, left: 16,
          background: '#12121e', padding: 16, borderRadius: 8,
          color: '#d8d8e8', fontSize: 14,
        }}>
          <strong>{selected.id}</strong>
          <p>Type: {selected.type}</p>
          <p>Value: {selected.value}</p>
        </div>
      )}
    </div>
  );
}`}
        language="tsx"
        filename="InteractiveGraph.tsx"
      />
      <p>
        The pattern here is straightforward React: store the selected node in
        state, highlight it via the <code>nodeColor</code> accessor, and render
        a detail panel when something is selected. The{" "}
        <code>onNodeHover</code> callback fires with the node on mouse-enter
        and <code>null</code> on mouse-leave, so you can swap the cursor or
        show a tooltip.
      </p>

      <h2>Deploying Your Visualization</h2>
      <p>
        Because Swarming is a standard React component, it deploys anywhere
        React does. A few options we recommend:
      </p>
      <ul>
        <li>
          <strong>Vercel</strong> — Push your repo and Vercel auto-detects
          Next.js or Vite. Zero config, instant preview URLs for every PR.
        </li>
        <li>
          <strong>Cloudflare Pages</strong> — Great for static exports. Run{" "}
          <code>npm run build</code> and point the output directory at{" "}
          <code>dist</code> or <code>.next</code>.
        </li>
        <li>
          <strong>Self-hosted</strong> — Any Node.js server works. For
          production, make sure your WebSocket source supports CORS or is
          proxied through your own backend.
        </li>
      </ul>
      <p>
        One thing to keep in mind: WebGL-heavy pages benefit from a CDN that
        serves your JS bundle close to the user. Vercel and Cloudflare handle
        this automatically.
      </p>

      <h2>Next Steps</h2>
      <p>
        You now have a real-time 3D graph running in the browser with about ten
        lines of meaningful code. From here, there are a few directions you
        might explore:
      </p>
      <ul>
        <li>
          <strong>Custom node rendering</strong> — Replace the default spheres
          with custom Three.js geometries or even 3D models using the{" "}
          <code>nodeRenderer</code> prop.
        </li>
        <li>
          <strong>Server-side data shaping</strong> — Use the{" "}
          <code>transform</code> prop to normalize messages from any API into
          the node/edge format Swarming expects.
        </li>
        <li>
          <strong>Accessibility</strong> — Swarming includes built-in ARIA
          labels and keyboard navigation. Check the accessibility guide in the
          docs.
        </li>
        <li>
          <strong>Live playground</strong> — Try different configurations
          without writing code at{" "}
          <a href="https://swarming.world" target="_blank" rel="noopener noreferrer">
            swarming.world
          </a>
          .
        </li>
      </ul>
      <p>
        If you build something cool, we would love to see it. Open an issue on
        GitHub or tag us on Twitter. Happy swarming.
      </p>
    </BlogLayout>
  );
}
