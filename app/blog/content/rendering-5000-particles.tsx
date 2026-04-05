import { BlogLayout } from '../components/BlogLayout';
import { CodeBlock } from '../components/CodeBlock';

export function RenderingParticlesContent() {
  return (
    <BlogLayout>
      <p>
        Force-directed graphs are one of the most intuitive ways to visualize networks. Nodes repel
        each other, edges pull connected nodes together, and the whole system settles into a layout
        that reveals structure. The problem? They are notoriously expensive to render at scale.
      </p>
      <p>
        When we set out to build <a href="https://swarming.world">Swarming</a> — a real-time 3D
        visualization of on-chain activity — we knew we needed to render thousands of nodes
        simultaneously, each one updating its position every frame. Our target was 5,000 agent nodes
        orbiting hub nodes, all connected by edges, running at a locked 60fps in the browser. No
        WebGPU. No native code. Just React, Three.js, and a careful approach to architecture.
      </p>
      <p>
        This post walks through the techniques we used to get there. If you are building any kind of
        large-scale data visualization in the browser, these patterns should transfer directly.
      </p>

      <h2>Why SVG Dies at 500 Nodes</h2>
      <p>
        The naive approach to rendering a force graph is SVG. Libraries like D3 default to it, and
        for good reason — SVG elements are part of the DOM, so you get hit testing, accessibility,
        and CSS styling for free. Every <code>&lt;circle&gt;</code> is a real element that the
        browser lays out and paints.
      </p>
      <p>
        That strength is also its fatal weakness. Each node in an SVG force graph is a DOM element.
        When the simulation ticks, you update the <code>cx</code> and <code>cy</code> attributes of
        every circle, and the browser has to run style recalculation, layout, and paint for each one.
        At 60fps, that gives you roughly 16ms per frame. With 500 nodes and 1,000 edges, the DOM
        operations alone can eat 20-30ms, and you are already dropping frames.
      </p>
      <p>
        The cost scales roughly linearly with node count for rendering, but the force simulation
        itself scales closer to O(n log n) with Barnes-Hut approximation. At 500 nodes, the
        bottleneck is not the physics — it is the DOM.
      </p>

      <h2>Why Canvas 2D Hits a Wall at 2,000 Nodes</h2>
      <p>
        The next step up is Canvas 2D. Instead of DOM elements, you draw directly to a pixel buffer.
        No layout recalc, no style resolution. Libraries like <code>d3-force</code> work well with
        this approach — you run the simulation, then loop through nodes and call{' '}
        <code>ctx.arc()</code> for each one.
      </p>
      <p>
        Canvas 2D gets you to around 1,000-2,000 nodes comfortably. But beyond that, you hit two
        problems. First, every draw call is a separate CPU-side operation. Drawing 5,000 circles
        means 5,000 individual <code>arc</code> + <code>fill</code> calls per frame. Second, Canvas
        2D cannot batch geometry — each shape is drawn independently, so the GPU never gets to do
        what it does best: processing thousands of identical shapes in parallel.
      </p>
      <p>
        There is also the 2D limitation itself. We wanted full 3D — nodes distributed on spheres,
        camera orbiting freely, depth-based sizing. Canvas 2D simply cannot do this without
        implementing your own projection math and z-sorting, at which point you are just building a
        bad 3D renderer.
      </p>

      <h2>The InstancedMesh Solution</h2>
      <p>
        WebGL solves both the draw call problem and the 3D problem. But raw WebGL is tedious. We use{' '}
        <a href="https://docs.pmnd.rs/react-three-fiber">React Three Fiber</a> (R3F), which gives
        us a React-based scene graph on top of Three.js. The key primitive that makes 5,000 nodes
        possible is <strong>InstancedMesh</strong>.
      </p>
      <p>
        A regular Three.js <code>Mesh</code> is one draw call per object. If you have 5,000 agent
        nodes, that is 5,000 draw calls — and you are back to the same bottleneck as Canvas 2D. An{' '}
        <code>InstancedMesh</code> renders all instances in a single draw call. You define the
        geometry and material once, then provide a per-instance transformation matrix and
        (optionally) a per-instance color. The GPU handles the rest.
      </p>
      <p>
        In Swarming, we use two rendering strategies. Hub nodes (the large central spheres
        representing tokens or protocols) are individual <code>Mesh</code> objects because there are
        only a handful of them and each needs its own hover detection, click handling, and animated
        ring effects. Agent nodes — the thousands of smaller particles orbiting each hub — use a
        single <code>InstancedMesh</code> with capacity for up to 5,000 instances.
      </p>

      <CodeBlock
        language="tsx"
        filename="AgentNodes.tsx"
        code={`const MAX_AGENT_NODES = 5000;

const AgentNodes = memo(({ sim }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // One geometry, one material — shared across all 5,000 instances
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({
      roughness: 0.4,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 2.5,
      transparent: true,
      toneMapped: false, // allows overbright values for bloom
    }),
    [],
  );

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const agents = sim.nodes.filter((n) => n.type === 'agent');
    mesh.count = Math.min(agents.length, MAX_AGENT_NODES);

    for (let i = 0; i < mesh.count; i++) {
      const node = agents[i];
      // Orbital shimmer animation
      const phase = state.clock.getElapsedTime() * 0.3 + i * 2.17;
      const sx = Math.sin(phase) * 0.12;
      const sz = Math.cos(phase * 0.7 + i) * 0.12;

      tempObj.position.set(
        (node.x ?? 0) + sx,
        0,
        (node.y ?? 0) + sz
      );
      tempObj.scale.setScalar(node.radius);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);

      // Per-instance color
      tempColor.set(node.color);
      mesh.setColorAt(i, tempColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_AGENT_NODES]}
      frustumCulled={false}
    />
  );
});`}
      />

      <p>
        Notice a few things. The <code>SphereGeometry(1, 8, 8)</code> uses only 8 segments — just
        enough to read as a sphere at the sizes we render. Going to 16 or 32 segments would
        quadruple the vertex count for no visible benefit at this scale. The{' '}
        <code>frustumCulled={'{false}'}</code> flag is important because we are managing instance
        visibility ourselves via <code>mesh.count</code> — letting Three.js try to cull individual
        instances would add overhead without helping.
      </p>
      <p>
        We reuse a single <code>Object3D</code> (the <code>tempObj</code>) to compute each
        instance's matrix. Creating a new <code>Matrix4</code> per instance per frame would generate
        enormous GC pressure. The same goes for <code>tempColor</code> — one reusable{' '}
        <code>Color</code> object instead of thousands of allocations.
      </p>

      <h2>Running the Simulation Outside React</h2>
      <p>
        The second critical optimization is architectural: the force simulation runs entirely outside
        React's render cycle. If you put simulation state in React state (via{' '}
        <code>useState</code> or <code>useReducer</code>), every tick of the simulation triggers a
        re-render of your component tree. At 60fps, that means React is diffing and reconciling 60
        times per second — for a component tree that might include hundreds of child components.
      </p>
      <p>
        Instead, we encapsulate the simulation in a plain class that holds mutable node and edge
        arrays. React never knows the positions changed. The Three.js render loop (via R3F's{' '}
        <code>useFrame</code>) reads directly from these mutable arrays every frame.
      </p>

      <CodeBlock
        language="typescript"
        filename="ForceGraphSimulation.ts"
        code={`import {
  forceSimulation, forceLink, forceManyBody,
  forceCenter, forceCollide,
} from 'd3-force-3d';

class ForceGraphSimulation {
  nodes: ForceNode[] = [];
  edges: ForceEdge[] = [];
  nodeMap = new Map<string, ForceNode>();
  private simulation;

  constructor() {
    // numDimensions=3 enables full 3D volumetric layout
    this.simulation = forceSimulation<ForceNode>([], 3)
      .force('charge', forceManyBody<ForceNode>()
        .strength(d => d.type === 'hub' ? -200 : -8))
      .force('center', forceCenter(0, 0, 0).strength(0.03))
      .force('collide', forceCollide<ForceNode>()
        .radius(d => d.radius + 0.3).strength(0.7))
      .force('link', forceLink<ForceNode, ForceEdge>([])
        .id(d => d.id)
        .distance(d => {
          const src = d.source as ForceNode;
          const tgt = d.target as ForceNode;
          if (src.type === 'hub' && tgt.type === 'hub') return 25;
          return 5 + Math.random() * 3;
        }))
      .alphaDecay(0.01)
      .velocityDecay(0.4);
  }

  tick() { this.simulation.tick(); }
  dispose() { this.simulation.stop(); }
}`}
      />

      <p>
        The <code>forceSimulation([], 3)</code> call is crucial — the second argument tells
        d3-force-3d to simulate in three dimensions, assigning <code>x</code>, <code>y</code>, and{' '}
        <code>z</code> coordinates to every node. Without it, all nodes would be coplanar.
      </p>
      <p>
        By keeping the simulation as a plain mutable object, we get two major wins. First, zero
        React re-renders from position updates. The only time React re-renders is when the node list
        itself changes (a new token appears, or a new batch of agents arrives). Second, the
        simulation's <code>tick()</code> method can be called from <code>useFrame</code>, which runs
        synchronously inside the Three.js animation loop — no scheduling overhead, no batched
        updates.
      </p>

      <h2>Tuning d3-force-3d for Smooth Physics</h2>
      <p>
        Getting the force configuration right took significant iteration. The key insight is that hub
        nodes and agent nodes need dramatically different force parameters.
      </p>

      <h3>Charge strength</h3>
      <p>
        Hub nodes use a charge strength of <strong>-200</strong>. This pushes them far apart,
        creating clear visual separation between clusters. Agent nodes use only{' '}
        <strong>-8</strong> — just enough to avoid overlap without flying away from their parent hub.
        If you give agents the same charge as hubs, the graph explodes outward and never settles.
      </p>

      <h3>Link distance</h3>
      <p>
        Hub-to-hub links use a distance of <strong>25</strong> units, keeping the overall structure
        readable. Hub-to-agent links use <strong>5 + Math.random() * 3</strong> — the randomized
        component prevents agents from stacking into perfect shells around their hub, which looks
        unnatural. The slight randomness produces organic-looking clusters.
      </p>

      <h3>Collision radius</h3>
      <p>
        The collision force uses each node's actual radius plus a <strong>0.3</strong> unit padding.
        This prevents overlap while maintaining tight clusters. Without the padding, nodes at
        identical radii can occupy the exact same pixel and flicker.
      </p>

      <CodeBlock
        language="typescript"
        filename="force-config.ts"
        code={`// Charge: hubs repel strongly, agents repel gently
.force('charge', forceManyBody<ForceNode>()
  .strength(d => d.type === 'hub' ? -200 : -8))

// Collision: actual radius + padding prevents overlap
.force('collide', forceCollide<ForceNode>()
  .radius(d => d.radius + 0.3)
  .strength(0.7))

// Links: hub-hub spread wide, hub-agent stay close
.force('link', forceLink(edges)
  .distance(d => {
    if (src.type === 'hub' && tgt.type === 'hub') return 25;
    return 5 + Math.random() * 3; // organic clustering
  })
  .strength(d => {
    if (src.type === 'hub' && tgt.type === 'hub') return 0.1;
    return 0.3; // agents bind tighter to hubs
  }))

// Damping: slow alpha decay = smoother settling
.alphaDecay(0.01)
.velocityDecay(0.4)`}
      />

      <p>
        The <code>alphaDecay(0.01)</code> value is lower than the default (0.0228). This means the
        simulation takes longer to settle, but the settling motion is much smoother — nodes glide
        into place rather than snapping. The <code>velocityDecay(0.4)</code> adds gentle friction
        that prevents nodes from oscillating indefinitely.
      </p>

      <h2>Golden Angle Distribution for Hub Placement</h2>
      <p>
        When a new hub node enters the simulation, it needs an initial position. Placing hubs
        randomly leads to clumping and uneven distribution. Placing them on a grid looks mechanical.
        We use the <strong>golden angle</strong> distribution to place hubs evenly on the surface of
        a sphere.
      </p>

      <CodeBlock
        language="typescript"
        filename="hub-distribution.ts"
        code={`// Fibonacci sphere: golden angle ensures uniform distribution
const phi = Math.acos(1 - 2 * (i + 0.5) / N);
const theta = Math.PI * (1 + Math.sqrt(5)) * i; // golden angle
const dist = 15 + Math.random() * 5;

const node: ForceNode = {
  // ...
  x: Math.sin(phi) * Math.cos(theta) * dist,
  y: Math.sin(phi) * Math.sin(theta) * dist,
  z: Math.cos(phi) * dist,
};`}
      />

      <p>
        The golden angle (approximately 137.5 degrees, derived from <code>PI * (1 + sqrt(5))</code>)
        is the same angle that sunflower seeds use to pack efficiently. When applied to spherical
        coordinates, it produces a Fibonacci sphere — a near-uniform distribution of points on a
        sphere's surface regardless of how many points there are. Each new hub added gets a position
        that naturally avoids clustering with existing hubs.
      </p>
      <p>
        The force simulation will eventually push hubs to their equilibrium positions, but starting
        with a good distribution means the simulation settles faster and avoids local minima where
        hubs are trapped in suboptimal positions.
      </p>

      <h2>Bloom Post-Processing Without Killing FPS</h2>
      <p>
        Bloom gives the visualization its signature glowing aesthetic — hubs emit light, edges
        shimmer, and the whole scene feels alive. But bloom is a multi-pass post-processing effect
        that can easily halve your frame rate if applied naively.
      </p>
      <p>
        The trick we use is <strong>selective bloom via overbright emissive values</strong>. Three.js
        tone mapping normally clamps color values to the 0-1 range. By setting{' '}
        <code>toneMapped={'{false}'}</code> on a material, we allow the emissive color to exceed 1.0.
        The bloom pass picks up these overbright values while leaving normally-lit geometry
        unaffected.
      </p>

      <CodeBlock
        language="typescript"
        filename="bloom-material.ts"
        code={`// Material with overbright emissive for selective bloom
const material = new THREE.MeshStandardMaterial({
  roughness: 0.4,
  emissive: new THREE.Color('#ffffff'),
  emissiveIntensity: 2.5,  // > 1.0 triggers bloom
  transparent: true,
  toneMapped: false,        // critical: bypass tone mapping
});

// Edge highlight uses channel values > 1.0
const EDGE_HIGHLIGHT_R = 0.48;
const EDGE_HIGHLIGHT_G = 0.78;
const EDGE_HIGHLIGHT_B = 2.0;  // overbright blue channel`}
      />

      <p>
        This approach is far cheaper than threshold-based bloom (which requires an extra render pass
        to separate bright pixels) or layer-based selective bloom (which requires rendering the scene
        multiple times). We simply tell the materials which parts of the scene should glow, and the
        bloom pass does the rest in a single additional pass.
      </p>

      <h3>Keeping bloom cheap</h3>
      <p>
        A few practical details that matter for performance. We use a moderate bloom radius and keep
        the intensity controlled — subtle glow looks better than overwhelming flare and is cheaper to
        compute. The bloom resolution does not need to match the canvas resolution; a half-resolution
        bloom pass is nearly indistinguishable from full resolution but takes a quarter of the fill
        time.
      </p>

      <h2>Additional Performance Techniques</h2>

      <h3>Avoid garbage collection pressure</h3>
      <p>
        In the hot loop inside <code>useFrame</code>, we never allocate objects. The{' '}
        <code>tempObj</code> (an <code>Object3D</code>) and <code>tempColor</code> (a{' '}
        <code>Color</code>) are created once via <code>useMemo</code> and reused every frame. This
        is critical — allocating even a small object 5,000 times per frame at 60fps means 300,000
        allocations per second, which will trigger GC pauses and visible frame drops.
      </p>

      <CodeBlock
        language="typescript"
        filename="zero-allocation-loop.ts"
        code={`// Created once, reused every frame
const tempObj = useMemo(() => new THREE.Object3D(), []);
const tempColor = useMemo(() => new THREE.Color(), []);

useFrame(() => {
  for (let i = 0; i < count; i++) {
    // Mutate in place — zero allocations
    tempObj.position.set(node.x, node.y, node.z);
    tempObj.scale.setScalar(node.radius);
    tempObj.updateMatrix();
    mesh.setMatrixAt(i, tempObj.matrix);

    tempColor.set(node.color);
    mesh.setColorAt(i, tempColor);
  }
  // Single GPU upload per frame
  mesh.instanceMatrix.needsUpdate = true;
});`}
      />

      <h3>Geometry segment budget</h3>
      <p>
        Each agent sphere uses <code>SphereGeometry(1, 8, 8)</code> — 8 width segments and 8 height
        segments. This produces 128 triangles per sphere, which is the minimum that still reads as a
        sphere at the rendered size (roughly 3-8 pixels in diameter). Hub nodes could afford higher
        segment counts since there are fewer of them, but we keep them moderate too. The total vertex
        count across all 5,000 instances stays well within GPU vertex processing budgets.
      </p>

      <h3>Dynamic instance count</h3>
      <p>
        The <code>InstancedMesh</code> is allocated with <code>MAX_AGENT_NODES</code> (5,000)
        capacity, but we set <code>mesh.count</code> dynamically to the actual number of active
        agents. This means the GPU only processes instances that exist. When the visualization first
        loads with 50 agents, we are only drawing 50 instances — the performance cost scales with
        actual usage, not maximum capacity.
      </p>

      <h2>The Architecture in Summary</h2>
      <p>
        Putting it all together, the rendering pipeline looks like this:
      </p>
      <ul>
        <li>
          <strong>ForceGraphSimulation</strong> (plain class) owns all node and edge data as mutable
          arrays. It runs <code>d3-force-3d</code> with 3D coordinates, differentiated forces for
          hubs vs agents, and golden angle initial placement.
        </li>
        <li>
          <strong>useFrame</strong> (R3F animation loop) calls <code>sim.tick()</code> each frame,
          then reads node positions directly from the mutable arrays. No React state, no re-renders.
        </li>
        <li>
          <strong>Hub nodes</strong> render as individual <code>Mesh</code> objects (low count, need
          interaction handlers).
        </li>
        <li>
          <strong>Agent nodes</strong> render as a single <code>InstancedMesh</code> with per-instance
          matrix and color updates (high count, one draw call).
        </li>
        <li>
          <strong>Bloom post-processing</strong> uses overbright emissive values with{' '}
          <code>toneMapped={'{false}'}</code> for selective glow without extra render passes.
        </li>
      </ul>

      <CodeBlock
        language="tsx"
        filename="ForceGraph.tsx (simplified)"
        code={`<Canvas>
  <Environment preset="studio" />
  <CameraControls />

  {/* Hub nodes: individual meshes for interactivity */}
  {hubNodes.map((hub, i) => (
    <HubNodeMesh key={hub.id} sim={sim} nodeId={hub.id} />
  ))}

  {/* Agent nodes: single instanced mesh for all 5,000 */}
  <AgentNodes sim={sim} />

  {/* Edges: line segments between connected nodes */}
  <EdgeLines sim={sim} />

  {/* Bloom picks up overbright emissive values */}
  <PostProcessing />
</Canvas>`}
      />

      <h2>Performance Results</h2>
      <p>
        On a mid-range laptop GPU (integrated Intel Iris or entry-level discrete), the visualization
        holds 60fps with 5,000 agent nodes, 20+ hub nodes, and full bloom post-processing enabled.
        On mobile devices, we scale down the agent count and disable bloom, but the architecture
        remains the same.
      </p>
      <p>
        The breakdown per frame at full load:
      </p>
      <ul>
        <li>
          <strong>Force simulation tick:</strong> ~1-2ms (d3-force-3d with Barnes-Hut)
        </li>
        <li>
          <strong>Instance matrix updates:</strong> ~0.5ms (CPU-side loop + upload)
        </li>
        <li>
          <strong>GPU draw calls:</strong> ~3-4 total (agents, edge particles, hubs, post-processing)
        </li>
        <li>
          <strong>Bloom pass:</strong> ~1ms at half resolution
        </li>
        <li>
          <strong>Total frame time:</strong> ~5-6ms, well under the 16ms budget for 60fps
        </li>
      </ul>
      <p>
        The biggest single win was the <code>InstancedMesh</code> approach. Switching from individual
        meshes per agent to instanced rendering dropped draw calls from 5,000+ to under 5, which
        alone took us from ~12fps to 60fps. The simulation-outside-React pattern was the second
        biggest win, eliminating thousands of unnecessary React reconciliation passes per second.
      </p>

      <h2>Try It Yourself</h2>
      <p>
        Swarming is live at{' '}
        <a href="https://swarming.world" target="_blank" rel="noopener noreferrer">
          swarming.world
        </a>
        . Open DevTools, check the frame rate, and watch thousands of nodes orbit in real time. The
        visualization ingests live on-chain data via WebSocket, so the graph is always changing —
        new hubs appear as tokens trend, and agent nodes swarm around them as traders interact.
      </p>
      <p>
        The techniques described here are not specific to blockchain data. Any application that needs
        to render thousands of animated elements in the browser — particle systems, social network
        graphs, IoT device maps, log visualizers — can use the same InstancedMesh + external
        simulation + selective bloom pattern. The browser is more capable than most people think. You
        just have to work with the GPU instead of against it.
      </p>
    </BlogLayout>
  );
}
