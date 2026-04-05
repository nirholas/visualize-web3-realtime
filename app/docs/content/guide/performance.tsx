import { CodeBlock } from '../../components/CodeBlock';

export default function PerformancePage() {
  return (
    <>
      <h1>Performance Optimization</h1>
      <p className="docs-lead">
        Techniques for handling large datasets while maintaining 60fps rendering.
      </p>

      <h2 id="instanced-rendering">Instanced rendering</h2>
      <p>
        swarming uses <code>InstancedMesh</code> from Three.js to render all nodes in
        a single draw call. This is the single most important optimization — without it,
        each node would be its own draw call, and performance would degrade linearly.
      </p>

      <h2 id="bounded-collections">Bounded collections</h2>
      <p>
        For streaming data, use <code>BoundedMap</code> and <code>BoundedSet</code>
        from <code>@web3viz/providers</code>. These LRU-evicting collections automatically
        remove the oldest entries when the limit is reached.
      </p>
      <CodeBlock
        language="tsx"
        code={`import { BoundedMap } from '@web3viz/providers';

// Automatically evicts oldest entries beyond 1000
const nodeCache = new BoundedMap<string, GraphNode>(1000);`}
      />

      <h2 id="spatial-hashing">Spatial hashing</h2>
      <p>
        The <code>SpatialHash</code> provides O(1) neighbor lookups in 3D space.
        This replaces naive O(n&sup2;) distance checks for collision detection and
        mouse proximity queries.
      </p>

      <h2 id="tips">Performance tips</h2>
      <ul>
        <li>Set <code>maxNodes</code> on your provider to cap graph size</li>
        <li>Use <code>alphaDecay: 0.05</code> for fast initial layout, then reduce</li>
        <li>Disable <code>showLabels</code> for datasets over 1000 nodes</li>
        <li>Use <code>showGround={'{false}'}</code> to skip the ground plane rendering</li>
        <li>Profile with Chrome DevTools &rarr; Performance tab to find bottlenecks</li>
      </ul>

      <h2 id="benchmarks">Benchmark reference</h2>
      <table className="docs-table">
        <thead>
          <tr>
            <th>Nodes</th>
            <th>Edges</th>
            <th>FPS (M1 MacBook)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>100</td><td>200</td><td>60</td></tr>
          <tr><td>1,000</td><td>2,000</td><td>60</td></tr>
          <tr><td>5,000</td><td>10,000</td><td>45-55</td></tr>
          <tr><td>10,000</td><td>20,000</td><td>30-40</td></tr>
        </tbody>
      </table>
    </>
  );
}
