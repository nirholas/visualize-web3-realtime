import { BlogLayout } from "../../components/BlogLayout";
import { CodeBlock } from "../../components/CodeBlock";
import { BenchmarkChart } from "../../components/BenchmarkChart";

export default function SwarmingVsAlternatives() {
  return (
    <BlogLayout>
      <p>
        If you need to visualize a graph in the browser, you have options.
        D3-force has been the default for a decade. Sigma.js brought WebGL
        rendering to 2D graphs. Cytoscape.js dominates bioinformatics. And
        now Swarming brings real-time 3D to the table.
      </p>
      <p>
        This is an honest comparison. We built Swarming, so we&apos;re
        obviously biased &mdash; but we&apos;ll tell you when to use
        something else.
      </p>

      <h2>Feature Comparison</h2>

      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#2a2a3a]">
              <th className="text-left py-3 px-4 text-[#8888a8] font-medium">
                Feature
              </th>
              <th className="text-left py-3 px-4 text-[#6366f1] font-medium">
                Swarming
              </th>
              <th className="text-left py-3 px-4 text-[#8888a8] font-medium">
                D3-force
              </th>
              <th className="text-left py-3 px-4 text-[#8888a8] font-medium">
                Sigma.js
              </th>
              <th className="text-left py-3 px-4 text-[#8888a8] font-medium">
                Cytoscape
              </th>
            </tr>
          </thead>
          <tbody className="text-[#b0b0c8]">
            <tr className="border-b border-[#1e1e2e]">
              <td className="py-3 px-4 font-medium text-[#d8d8e8]">
                Rendering
              </td>
              <td className="py-3 px-4">WebGL (Three.js)</td>
              <td className="py-3 px-4">SVG / Canvas</td>
              <td className="py-3 px-4">WebGL</td>
              <td className="py-3 px-4">Canvas / SVG</td>
            </tr>
            <tr className="border-b border-[#1e1e2e]">
              <td className="py-3 px-4 font-medium text-[#d8d8e8]">
                3D Support
              </td>
              <td className="py-3 px-4">Native</td>
              <td className="py-3 px-4">Plugin (d3-force-3d)</td>
              <td className="py-3 px-4">No</td>
              <td className="py-3 px-4">No</td>
            </tr>
            <tr className="border-b border-[#1e1e2e]">
              <td className="py-3 px-4 font-medium text-[#d8d8e8]">
                Max Nodes (60fps)
              </td>
              <td className="py-3 px-4">5,000+</td>
              <td className="py-3 px-4">~500 (SVG) / ~2,000 (Canvas)</td>
              <td className="py-3 px-4">~10,000</td>
              <td className="py-3 px-4">~5,000</td>
            </tr>
            <tr className="border-b border-[#1e1e2e]">
              <td className="py-3 px-4 font-medium text-[#d8d8e8]">
                Real-time Streaming
              </td>
              <td className="py-3 px-4">Built-in</td>
              <td className="py-3 px-4">Manual</td>
              <td className="py-3 px-4">Manual</td>
              <td className="py-3 px-4">Manual</td>
            </tr>
            <tr className="border-b border-[#1e1e2e]">
              <td className="py-3 px-4 font-medium text-[#d8d8e8]">
                React Integration
              </td>
              <td className="py-3 px-4">Native</td>
              <td className="py-3 px-4">Wrapper</td>
              <td className="py-3 px-4">Wrapper</td>
              <td className="py-3 px-4">Wrapper</td>
            </tr>
            <tr className="border-b border-[#1e1e2e]">
              <td className="py-3 px-4 font-medium text-[#d8d8e8]">
                Bundle Size
              </td>
              <td className="py-3 px-4">~45kb</td>
              <td className="py-3 px-4">~15kb</td>
              <td className="py-3 px-4">~35kb</td>
              <td className="py-3 px-4">~55kb</td>
            </tr>
            <tr>
              <td className="py-3 px-4 font-medium text-[#d8d8e8]">
                Learning Curve
              </td>
              <td className="py-3 px-4">Low</td>
              <td className="py-3 px-4">High</td>
              <td className="py-3 px-4">Medium</td>
              <td className="py-3 px-4">Medium</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Performance Benchmarks</h2>
      <p>
        All benchmarks run on a 2023 MacBook Pro (M3 Pro), Chrome 120,
        measuring sustained frame rate after initial layout settles.
        Graph topology: random scale-free network with ~10% hub nodes.
      </p>

      <h3>1,000 Nodes &mdash; Frames Per Second</h3>
      <BenchmarkChart
        data={[
          { label: "Swarming", value: 60, color: "#6366f1" },
          { label: "Sigma.js", value: 58, color: "#10b981" },
          { label: "Cytoscape", value: 52, color: "#f59e0b" },
          { label: "D3-force", value: 45, color: "#ef4444" },
        ]}
      />

      <p>
        At 1,000 nodes, all libraries perform reasonably well. D3-force lags
        slightly because SVG DOM updates are more expensive than
        Canvas/WebGL draw calls. The differences are marginal and unlikely
        to matter in practice.
      </p>

      <h3>5,000 Nodes &mdash; Frames Per Second</h3>
      <BenchmarkChart
        data={[
          { label: "Swarming", value: 58, color: "#6366f1" },
          { label: "Sigma.js", value: 45, color: "#10b981" },
          { label: "Cytoscape", value: 30, color: "#f59e0b" },
          { label: "D3-force", value: 12, color: "#ef4444" },
        ]}
      />

      <p>
        At 5,000 nodes, the differences become dramatic. Swarming maintains
        near-60fps thanks to instanced mesh rendering (one GPU draw call for
        all agent nodes). D3-force with SVG drops to single digits;
        switching to Canvas helps but still tops out around 25fps.
      </p>

      <h3>Time to First Render (ms, lower is better)</h3>
      <BenchmarkChart
        data={[
          { label: "D3-force", value: 80, color: "#ef4444", unit: "ms" },
          { label: "Swarming", value: 120, color: "#6366f1", unit: "ms" },
          { label: "Sigma.js", value: 150, color: "#10b981", unit: "ms" },
          { label: "Cytoscape", value: 200, color: "#f59e0b", unit: "ms" },
        ]}
      />

      <p>
        D3-force wins on time-to-first-render because it has the smallest
        bundle and no WebGL context initialization. Swarming&apos;s Three.js
        setup adds ~40ms. For dashboards where initial load time matters more
        than sustained frame rate, this is worth considering.
      </p>

      <h2>Code Comparison</h2>
      <p>
        Here&apos;s the same basic graph visualization in each library:
      </p>

      <h3>Swarming</h3>
      <CodeBlock
        filename="swarming-example.tsx"
        language="tsx"
        code={`import { SwarmGraph } from 'swarming';

function Graph({ nodes, edges }) {
  return (
    <SwarmGraph
      nodes={nodes}
      edges={edges}
      nodeColor={(n) => n.type === 'hub' ? '#6366f1' : '#555'}
      physics={{ charge: -80, linkDistance: 10 }}
    />
  );
}`}
      />

      <h3>D3-force</h3>
      <CodeBlock
        filename="d3-example.js"
        language="javascript"
        code={`import * as d3 from 'd3';

function Graph(container, nodes, links) {
  const svg = d3.select(container).append('svg');
  const simulation = d3.forceSimulation(nodes)
    .force('charge', d3.forceManyBody().strength(-80))
    .force('link', d3.forceLink(links).distance(10))
    .force('center', d3.forceCenter(width / 2, height / 2));

  const link = svg.selectAll('line').data(links).join('line');
  const node = svg.selectAll('circle').data(nodes).join('circle')
    .attr('r', 5)
    .attr('fill', d => d.type === 'hub' ? '#6366f1' : '#555');

  simulation.on('tick', () => {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('cx', d => d.x).attr('cy', d => d.y);
  });
}`}
      />

      <h3>Sigma.js</h3>
      <CodeBlock
        filename="sigma-example.js"
        language="javascript"
        code={`import Graph from 'graphology';
import Sigma from 'sigma';

const graph = new Graph();
nodes.forEach(n => graph.addNode(n.id, {
  x: Math.random(), y: Math.random(),
  size: n.type === 'hub' ? 10 : 3,
  color: n.type === 'hub' ? '#6366f1' : '#555',
}));
edges.forEach(e => graph.addEdge(e.source, e.target));

const renderer = new Sigma(graph, container);`}
      />

      <h3>Cytoscape.js</h3>
      <CodeBlock
        filename="cytoscape-example.js"
        language="javascript"
        code={`import cytoscape from 'cytoscape';

const cy = cytoscape({
  container: document.getElementById('graph'),
  elements: [
    ...nodes.map(n => ({
      data: { id: n.id },
      style: {
        'background-color': n.type === 'hub' ? '#6366f1' : '#555',
        width: n.type === 'hub' ? 20 : 6,
        height: n.type === 'hub' ? 20 : 6,
      }
    })),
    ...edges.map(e => ({ data: { source: e.source, target: e.target } })),
  ],
  layout: { name: 'cose', animate: true },
});`}
      />

      <p>
        Swarming has the shortest setup because it&apos;s a React component
        with opinions. D3-force gives you maximum control but requires more
        code. Sigma.js uses graphology for data modeling, which is powerful
        but adds a concept layer. Cytoscape uses a CSS-like styling system
        that&apos;s familiar but verbose.
      </p>

      <h2>When to Use Each Library</h2>

      <h3>Use D3-force when:</h3>
      <ul>
        <li>You need maximum flexibility and custom rendering</li>
        <li>Your graph is small (&lt;500 nodes)</li>
        <li>You need SVG output (for print, export, or accessibility)</li>
        <li>You&apos;re building a one-off visualization, not a product</li>
        <li>Bundle size is critical (15kb vs 45kb+)</li>
      </ul>

      <h3>Use Sigma.js when:</h3>
      <ul>
        <li>You have large static graphs (10,000+ nodes)</li>
        <li>You need 2D WebGL rendering with good performance</li>
        <li>You want the graphology ecosystem (algorithms, metrics)</li>
        <li>You don&apos;t need 3D or real-time streaming</li>
      </ul>

      <h3>Use Cytoscape.js when:</h3>
      <ul>
        <li>You&apos;re doing bioinformatics or academic network analysis</li>
        <li>You need complex graph algorithms (shortest path, centrality, clustering)</li>
        <li>You need multiple layout algorithms (hierarchical, circular, grid)</li>
        <li>Your team is familiar with CSS-like styling</li>
      </ul>

      <h3>Use Swarming when:</h3>
      <ul>
        <li>Your data arrives in real-time via WebSocket or streaming API</li>
        <li>You want 3D visualization with physics-driven layout</li>
        <li>You&apos;re building with React and want native integration</li>
        <li>You need 5,000+ nodes at 60fps with post-processing effects</li>
        <li>You want a working visualization in minutes, not days</li>
      </ul>

      <h2>Where Swarming Falls Short</h2>
      <p>
        In the interest of honesty, here&apos;s where the alternatives beat
        us:
      </p>
      <ul>
        <li>
          <strong>Bundle size</strong>: Three.js is large. If you&apos;re
          adding a small graph to an existing page, D3&apos;s 15kb is hard
          to beat.
        </li>
        <li>
          <strong>2D static graphs</strong>: if you don&apos;t need 3D or
          real-time, Sigma.js handles more nodes because 2D WebGL is
          simpler than 3D.
        </li>
        <li>
          <strong>Graph algorithms</strong>: Cytoscape has decades of
          algorithm implementations. Swarming focuses on visualization, not
          computation.
        </li>
        <li>
          <strong>SVG export</strong>: Swarming renders to WebGL canvas.
          You can screenshot it, but you can&apos;t export vector graphics.
        </li>
        <li>
          <strong>Non-React projects</strong>: Swarming is React-first. If
          you&apos;re using Vue, Svelte, or vanilla JS, the other libraries
          are framework-agnostic.
        </li>
      </ul>

      <h2>Conclusion</h2>
      <p>
        There&apos;s no universally &ldquo;best&rdquo; graph visualization
        library. The right choice depends on your data (static vs streaming),
        your rendering needs (2D vs 3D), your scale (hundreds vs thousands
        of nodes), and your stack (React vs other).
      </p>
      <p>
        Swarming occupies a specific niche: <strong>real-time streaming data
        rendered as a 3D force graph in React</strong>. If that matches your
        use case, it&apos;ll save you weeks of work. If it doesn&apos;t,
        one of the alternatives will serve you better, and we genuinely
        recommend them.
      </p>
      <p>
        Try the{" "}
        <a href="https://swarming.world/world">live demo</a> to see 5,000+
        nodes in action, or read the{" "}
        <a href="/blog/rendering-5000-particles">rendering deep-dive</a> to
        understand the techniques behind the performance numbers.
      </p>
    </BlogLayout>
  );
}
