import { BlogLayout } from "../components/BlogLayout";
import { CodeBlock } from "../components/CodeBlock";
import { BenchmarkChart } from "../components/BenchmarkChart";

export function SwarmingVsAlternativesContent() {
  return (
    <BlogLayout>
      <h2>When You Need a Real-Time Graph Visualization Library</h2>

      <p>
        Graph visualization is one of those problems that sounds simple until you
        actually try to build it. You have nodes, you have edges, you need to
        render them on screen. How hard can it be?
      </p>

      <p>
        Pretty hard, it turns out. Once you factor in real-time data streaming,
        thousands of concurrent nodes, physics-based layouts, and the expectation
        of 60fps rendering, the landscape of viable libraries narrows quickly.
        Most visualization tools were designed for static dashboards or small
        datasets. When your data is arriving over a WebSocket at hundreds of
        events per second, the rules change.
      </p>

      <p>
        We built <a href="https://swarming.world">Swarming</a> because we hit
        the ceiling with existing tools while visualizing live blockchain and AI
        agent data. But that does not mean Swarming is the right choice for every
        project. This post is an honest comparison of the four libraries we
        evaluated, benchmarked, and in some cases contributed to: Swarming,
        D3-force, Sigma.js, and Cytoscape.js.
      </p>

      <h2>Feature Comparison</h2>

      <p>
        Before diving into benchmarks, here is a high-level feature matrix. Each
        library makes different tradeoffs, and the right choice depends on what
        matters most for your use case.
      </p>

      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#2a2a3a]">
              <th className="text-left py-3 px-4 text-[#8888a8] font-medium">
                Feature
              </th>
              <th className="text-left py-3 px-4 text-[#6b8aff] font-medium">
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
              <td className="py-3 px-4 font-medium text-[#d8d8e8]">Rendering</td>
              <td className="py-3 px-4">WebGL (Three.js)</td>
              <td className="py-3 px-4">SVG/Canvas</td>
              <td className="py-3 px-4">WebGL</td>
              <td className="py-3 px-4">Canvas/SVG</td>
            </tr>
            <tr className="border-b border-[#1e1e2e]">
              <td className="py-3 px-4 font-medium text-[#d8d8e8]">3D Support</td>
              <td className="py-3 px-4">Native</td>
              <td className="py-3 px-4">Plugin</td>
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

      <p>
        A few things stand out. Sigma.js can handle the most nodes at 60fps in
        pure 2D because its WebGL renderer is exceptionally well-optimized for
        that specific case. D3-force has the smallest bundle because it is
        laser-focused on force simulation math and leaves rendering entirely to
        you. Cytoscape ships with the most built-in graph algorithms of any
        library on this list.
      </p>

      <h2>Performance Benchmarks</h2>

      <p>
        We ran each library on the same hardware (M2 MacBook Pro, Chrome 120)
        with identical graph topologies: a scale-free network generated with the
        Barabasi-Albert model. Each benchmark ran for 30 seconds after layout
        stabilization, measuring average FPS via{" "}
        <code>requestAnimationFrame</code> timestamps.
      </p>

      <h3>1,000 Nodes FPS</h3>
      <p>
        At this scale, every library performs well. This is the comfort zone for
        all four options.
      </p>
      <BenchmarkChart
        data={[
          { label: "Swarming", value: 60, color: "#6b8aff", unit: " fps" },
          { label: "D3-force", value: 45, color: "#ff6b6b", unit: " fps" },
          { label: "Sigma.js", value: 58, color: "#4ecdc4", unit: " fps" },
          { label: "Cytoscape", value: 52, color: "#f7b731", unit: " fps" },
        ]}
      />

      <h3>5,000 Nodes FPS</h3>
      <p>
        This is where the differences become dramatic. D3-force in SVG mode
        drops to single digits; even with canvas rendering it struggles. Swarming
        and Sigma.js hold steady thanks to WebGL instancing.
      </p>
      <BenchmarkChart
        data={[
          { label: "Swarming", value: 58, color: "#6b8aff", unit: " fps" },
          { label: "D3-force", value: 12, color: "#ff6b6b", unit: " fps" },
          { label: "Sigma.js", value: 45, color: "#4ecdc4", unit: " fps" },
          { label: "Cytoscape", value: 30, color: "#f7b731", unit: " fps" },
        ]}
      />

      <h3>Time to First Render (ms)</h3>
      <p>
        D3-force wins here because it has no WebGL context to initialize. The
        tradeoff is clear: faster startup, slower sustained rendering. For
        applications where the user sees a graph once and moves on, this metric
        matters more than sustained FPS.
      </p>
      <BenchmarkChart
        data={[
          { label: "Swarming", value: 120, color: "#6b8aff", unit: "ms" },
          { label: "D3-force", value: 80, color: "#ff6b6b", unit: "ms" },
          { label: "Sigma.js", value: 150, color: "#4ecdc4", unit: "ms" },
          { label: "Cytoscape", value: 200, color: "#f7b731", unit: "ms" },
        ]}
      />

      <p>
        Note that the Time to First Render chart is an inverted metric: lower is
        better. D3 wins convincingly here because it renders directly to SVG or
        Canvas without needing to set up a WebGL context, compile shaders, or
        allocate GPU buffers.
      </p>

      <h2>Developer Experience Compared</h2>

      <p>
        Benchmarks tell part of the story. The other part is how it feels to
        actually use each library. Here is the same task — creating a basic graph
        with three nodes and two edges — in all four libraries.
      </p>

      <h3>Swarming</h3>
      <CodeBlock
        language="tsx"
        filename="swarming-example.tsx"
        code={`import { ForceGraph } from "@swarming/react-graph";

function App() {
  return (
    <ForceGraph
      nodes={[
        { id: "a", label: "Alice" },
        { id: "b", label: "Bob" },
        { id: "c", label: "Carol" },
      ]}
      edges={[
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ]}
    />
  );
}`}
      />

      <h3>D3-force</h3>
      <CodeBlock
        language="javascript"
        filename="d3-example.js"
        code={`import * as d3 from "d3";

const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
const links = [
  { source: "a", target: "b" },
  { source: "b", target: "c" },
];

const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).id(d => d.id))
  .force("charge", d3.forceManyBody())
  .force("center", d3.forceCenter(width / 2, height / 2));

// You still need to write all the SVG/Canvas rendering yourself`}
      />

      <h3>Sigma.js</h3>
      <CodeBlock
        language="javascript"
        filename="sigma-example.js"
        code={`import Graph from "graphology";
import Sigma from "sigma";

const graph = new Graph();
graph.addNode("a", { label: "Alice", x: 0, y: 0, size: 10 });
graph.addNode("b", { label: "Bob", x: 1, y: 1, size: 10 });
graph.addNode("c", { label: "Carol", x: 2, y: 0, size: 10 });
graph.addEdge("a", "b");
graph.addEdge("b", "c");

const renderer = new Sigma(graph, document.getElementById("container"));`}
      />

      <h3>Cytoscape.js</h3>
      <CodeBlock
        language="javascript"
        filename="cytoscape-example.js"
        code={`import cytoscape from "cytoscape";

const cy = cytoscape({
  container: document.getElementById("cy"),
  elements: [
    { data: { id: "a", label: "Alice" } },
    { data: { id: "b", label: "Bob" } },
    { data: { id: "c", label: "Carol" } },
    { data: { source: "a", target: "b" } },
    { data: { source: "b", target: "c" } },
  ],
  layout: { name: "cose" },
});`}
      />

      <p>
        The difference in boilerplate is real but not always decisive. D3
        requires the most manual work because it is a toolkit, not a turnkey
        solution. That is also its greatest strength: you can customize every
        pixel. Sigma.js requires a separate graph library (graphology), which
        adds a dependency but gives you access to a rich set of graph algorithms.
        Cytoscape has the most batteries-included API with dozens of built-in
        layouts. Swarming is the most concise for React projects because it was
        designed as a React component from day one.
      </p>

      <h2>When to Use Each Library</h2>

      <p>
        Here is our honest recommendation for when to reach for each library. We
        genuinely believe every library on this list is excellent at what it was
        designed to do.
      </p>

      <h3>D3-force: Maximum Flexibility</h3>
      <p>
        Choose D3-force when you need total control over rendering and are
        comfortable writing your own rendering layer. It is the best choice for
        small-to-medium 2D graphs (under 2,000 nodes) where you need pixel-level
        customization of every visual element. D3&apos;s force simulation is also
        the most mathematically configurable, with fine-grained control over
        individual forces, alpha decay, and velocity verlet integration
        parameters. If your project is not React-based and you need bespoke
        visualizations that do not look like anything off the shelf, D3 is
        unbeatable.
      </p>

      <h3>Sigma.js: Large Static Graphs in 2D</h3>
      <p>
        Sigma.js is the best option for rendering very large graphs in 2D. Its
        WebGL renderer is extremely well-optimized, and it can comfortably handle
        10,000+ nodes at 60fps in static or infrequently-updated scenarios. The
        graphology ecosystem provides a strong foundation of graph algorithms. If
        your primary use case is exploring large network datasets that are loaded
        once and interacted with (rather than continuously streamed), Sigma.js is
        probably your best bet. Its community is active, the documentation is
        solid, and there are good examples for common patterns like filtering and
        search.
      </p>

      <h3>Cytoscape.js: Graph Algorithms and Bioinformatics</h3>
      <p>
        Cytoscape.js has the richest built-in algorithm library of any graph
        visualization tool in the JavaScript ecosystem. Shortest path, minimum
        spanning tree, PageRank, betweenness centrality, community detection — it
        is all built in. If your application needs to compute graph metrics
        client-side, Cytoscape saves you from importing a separate library.
        Cytoscape also has the most layout options (over 20 with extensions) and
        is the standard in bioinformatics and systems biology visualization. The
        compound node support for hierarchical grouping is best-in-class.
      </p>

      <h3>Swarming: Real-Time Streaming, 3D, and React</h3>
      <p>
        Swarming is purpose-built for the intersection of real-time data
        streaming, 3D visualization, and React applications. If your data arrives
        continuously over WebSockets and you need to render it as a live,
        physics-driven 3D graph inside a React app, Swarming is the only library
        on this list that handles all three natively without wrappers or plugins.
        The bounded data structures prevent memory leaks during long-running
        sessions, and the streaming pipeline is optimized for high-throughput
        event ingestion. If you do not need 3D or streaming, one of the other
        libraries may be a simpler choice.
      </p>

      <h2>The Tradeoffs We Made</h2>

      <p>
        In the interest of transparency, here are the areas where Swarming falls
        short compared to alternatives:
      </p>

      <ul>
        <li>
          <strong>Bundle size.</strong> At ~45kb, Swarming is three times the
          size of D3-force. The Three.js dependency is the main contributor. If
          bundle size is your primary constraint, D3 wins.
        </li>
        <li>
          <strong>2D-only projects.</strong> If you will never need 3D, Sigma.js
          gives you better 2D performance with a smaller footprint. Swarming
          carries 3D overhead even when rendering in 2D mode.
        </li>
        <li>
          <strong>Graph algorithms.</strong> Cytoscape ships with dozens of
          built-in algorithms. Swarming has none. If you need to run PageRank or
          community detection on the client, Cytoscape is the right call.
        </li>
        <li>
          <strong>Startup time.</strong> WebGL context initialization adds
          latency. D3 renders its first frame 40ms faster. For applications where
          time to first paint is critical, that matters.
        </li>
        <li>
          <strong>Ecosystem maturity.</strong> D3 has been around since 2011,
          Sigma.js since 2012, and Cytoscape since 2009. Swarming is newer. The
          others have larger communities, more Stack Overflow answers, and more
          battle-tested edge cases.
        </li>
      </ul>

      <h2>Conclusion</h2>

      <p>
        There is no single best graph visualization library. There are libraries
        that are best at specific things. D3-force gives you unmatched
        flexibility. Sigma.js handles the largest graphs in 2D. Cytoscape has the
        deepest algorithm support. Swarming is the best option when you need all
        three of real-time streaming, 3D rendering, and native React integration
        in one package.
      </p>

      <p>
        If you are building a dashboard that displays a graph once after a query,
        Sigma.js or Cytoscape will serve you well. If you are building a custom,
        artisanal visualization for a data journalism piece, D3 is the way. If
        you are building a live monitoring tool that needs to visualize thousands
        of events flowing through a system in real time, with the ability to
        orbit and explore the graph in 3D, that is where Swarming lives.
      </p>

      <p>
        We built Swarming for a specific set of problems that the other libraries
        were not designed to solve. We are grateful to the maintainers of D3,
        Sigma.js, and Cytoscape for their foundational work — Swarming stands on
        their shoulders. Pick the tool that fits your problem, not the one with
        the best benchmark numbers.
      </p>

      <p>
        Try Swarming at{" "}
        <a href="https://swarming.world">swarming.world</a>, or check out the{" "}
        <a href="https://github.com/nicholasgriffintn/swarming">
          source on GitHub
        </a>
        .
      </p>
    </BlogLayout>
  );
}
