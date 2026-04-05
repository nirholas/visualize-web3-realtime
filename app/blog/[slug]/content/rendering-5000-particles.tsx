import { BlogLayout } from "../../components/BlogLayout";
import { CodeBlock } from "../../components/CodeBlock";

export default function RenderingParticlesContent() {
  return (
    <BlogLayout>
      <p>
        Force-directed graphs are one of the most intuitive ways to visualize
        relationships in data. But they have a reputation for being slow. Render
        500 nodes in SVG and your laptop fan kicks in. Push to 2,000 in Canvas
        2D and you&apos;re watching a slideshow. We needed 5,000+ animated nodes
        at a locked 60fps. Here&apos;s how we got there.
      </p>

      <h2>Why SVG Dies at 500 Nodes</h2>
      <p>
        The most common approach to graph visualization is SVG. Libraries like
        D3.js default to it, and for good reason &mdash; SVG elements are DOM
        nodes, so you get event handling, accessibility, and CSS styling for
        free. The problem is that every node is a real DOM element.
      </p>
      <p>
        At 500 nodes with edges, you&apos;re looking at 1,500+ DOM elements
        being repositioned every frame. Each position change triggers style
        recalculation, layout, and paint. The browser&apos;s rendering pipeline
        was designed for documents, not particle simulations. Even with{" "}
        <code>transform</code> instead of <code>top/left</code>, you&apos;re
        fighting the DOM&apos;s fundamental architecture.
      </p>

      <h2>Why Canvas 2D Dies at 2,000 Nodes</h2>
      <p>
        Canvas 2D eliminates the DOM overhead. You&apos;re drawing pixels
        directly, so there&apos;s no layout thrashing. But Canvas 2D has its own
        bottleneck: draw calls. Each <code>arc()</code> or{" "}
        <code>fillRect()</code> is a separate CPU-side command. At 2,000 nodes,
        you&apos;re issuing 2,000+ draw calls per frame, plus edges, plus
        labels.
      </p>
      <p>
        The CPU becomes the bottleneck while the GPU sits idle. Canvas 2D
        can&apos;t batch geometry &mdash; every shape is drawn independently.
        There&apos;s no way to tell the GPU &ldquo;here are 5,000 spheres,
        render them all at once.&rdquo;
      </p>

      <h2>The InstancedMesh Solution</h2>
      <p>
        Three.js&apos;s <code>InstancedMesh</code> solves the draw call problem.
        Instead of creating 5,000 separate mesh objects, you create{" "}
        <strong>one mesh with 5,000 instances</strong>. The GPU receives a
        single draw call with a per-instance transformation matrix and color.
        This is the same technique used in AAA games for rendering forests or
        crowds.
      </p>

      <CodeBlock
        filename="AgentNodes.tsx"
        language="tsx"
        code={`// One InstancedMesh for all 5,000 agent nodes
const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
const material = useMemo(
  () => new THREE.MeshStandardMaterial({
    roughness: 0.4,
    metalness: 0.0,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 2.5,
    transparent: true,
    toneMapped: false, // allows overbright for bloom
  }),
  [],
);

// In the render loop — update all 5,000 transforms in one pass
useFrame(() => {
  const mesh = meshRef.current;
  if (!mesh) return;

  const agents = sim.nodes.filter((n) => n.type === 'agent');
  mesh.count = Math.min(agents.length, 5000);

  for (let i = 0; i < mesh.count; i++) {
    const node = agents[i];
    tempObj.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
    tempObj.scale.setScalar(node.radius);
    tempObj.updateMatrix();
    mesh.setMatrixAt(i, tempObj.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
});`}
      />

      <p>
        The key insight: <code>SphereGeometry(1, 8, 8)</code> uses only 8
        segments. At the scale we render agent nodes (radius 0.18), you
        can&apos;t tell the difference between 8 and 32 segments, but the vertex
        count drops by 16x. We use 32 segments only for the larger hub nodes
        where the geometry is visible up close.
      </p>

      <h2>Simulation Outside React</h2>
      <p>
        The physics simulation is the most expensive per-frame computation. If
        it ran inside React&apos;s render cycle, every tick would trigger
        re-renders, state updates, and reconciliation. Instead, we run the
        simulation in a plain class that lives entirely outside React.
      </p>

      <CodeBlock
        filename="ForceGraphSimulation.ts"
        language="typescript"
        code={`class ForceGraphSimulation {
  nodes: ForceNode[] = [];
  edges: ForceEdge[] = [];
  nodeMap = new Map<string, ForceNode>();
  private simulation: ReturnType<typeof forceSimulation<ForceNode>>;

  constructor() {
    // numDimensions=3 for full volumetric layout
    this.simulation = forceSimulation<ForceNode>([], 3)
      .force('charge', forceManyBody<ForceNode>()
        .strength((d) => (d.type === 'hub' ? -200 : -8)))
      .force('center', forceCenter<ForceNode>(0, 0, 0).strength(0.03))
      .force('collide', forceCollide<ForceNode>()
        .radius((d) => d.radius + 0.3).strength(0.7))
      .force('link', forceLink<ForceNode, ForceEdge>([])
        .id((d) => d.id)
        .distance((d) => {
          const src = d.source as ForceNode;
          const tgt = d.target as ForceNode;
          return src.type === 'hub' && tgt.type === 'hub' ? 25 : 5 + Math.random() * 3;
        }))
      .alphaDecay(0.01)
      .velocityDecay(0.4);
  }

  tick() { this.simulation.tick(); }
}`}
      />

      <p>
        React only knows about the simulation via a ref. The{" "}
        <code>useFrame</code> hook reads positions from the simulation object
        each frame and writes them to the GPU &mdash; no React state updates, no
        re-renders, no virtual DOM diffing. This is the single biggest
        performance win in the entire codebase.
      </p>

      <h2>Force Tuning for Smooth Physics</h2>
      <p>
        d3-force-3d gives us a mature, battle-tested physics engine with
        configurable forces. But the defaults are tuned for small 2D graphs. We
        spent considerable time tuning forces for large 3D layouts.
      </p>

      <h3>Charge Asymmetry</h3>
      <p>
        Hub nodes (tokens, protocols) repel each other strongly at{" "}
        <code>-200</code>. Agent nodes (traders, transactions) repel weakly at{" "}
        <code>-8</code>. This creates natural clustering: agents swarm around
        their hubs without pushing each other away.
      </p>

      <h3>Link Distance Hierarchy</h3>
      <p>
        Hub-to-hub links use a distance of <code>25</code> to keep major nodes
        well-separated. Hub-to-agent links use <code>5 + Math.random() * 3</code>{" "}
        for organic, non-uniform clustering. The randomness prevents the
        &ldquo;crystal lattice&rdquo; look that plagues force-directed graphs
        with uniform parameters.
      </p>

      <h3>Decay Rates</h3>

      <CodeBlock
        filename="simulation-config.ts"
        language="typescript"
        code={`// Alpha decay: how quickly the simulation "cools"
// Lower = more time to find a good layout
.alphaDecay(0.01)

// Velocity decay: friction/damping
// 0.4 = smooth but not floaty
.velocityDecay(0.4)

// Center force: gentle pull toward origin
// Too strong = everything clumps; too weak = drift
.force('center', forceCenter(0, 0, 0).strength(0.03))

// Collision: prevents overlap with padding
.force('collide', forceCollide()
  .radius((d) => d.radius + 0.3)
  .strength(0.7))`}
      />

      <p>
        The <code>alphaDecay(0.01)</code> is deliberately low. The default of
        0.0228 cools the simulation too fast for streaming data &mdash; new nodes
        arrive continuously, and the simulation needs time to find good
        positions for them. With 0.01, the layout stays warm and responsive to
        new data.
      </p>

      <h2>Golden Angle Distribution</h2>
      <p>
        When hub nodes first appear, we need to place them in 3D space. Random
        placement creates clumps. Grid placement looks mechanical. We use the{" "}
        <strong>golden angle</strong> &mdash; the same pattern sunflowers use to
        arrange seeds.
      </p>

      <CodeBlock
        filename="hub-placement.ts"
        language="typescript"
        code={`// Distribute hubs on a sphere using Fibonacci spiral
const phi = Math.acos(1 - 2 * (i + 0.5) / Math.max(topTokens.length, 1));
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
        The golden angle (<code>&pi; &times; (1 + &radic;5)</code>) is
        irrational, which means no two hubs ever land at the same angular
        position regardless of count. Combined with spherical coordinates, this
        gives an even distribution across the surface of a sphere. The force
        simulation then takes over and refines positions based on connections.
      </p>

      <h2>Bloom Without Killing FPS</h2>
      <p>
        Bloom post-processing makes the visualization feel alive &mdash;
        glowing nodes, pulsing connections. But bloom is expensive: it requires
        rendering the scene to a framebuffer, extracting bright areas, blurring
        them (multiple passes), and compositing back.
      </p>
      <p>
        The trick is <strong>selective bloom via overbright values</strong>. Instead of
        applying bloom to the entire scene and then masking, we set{" "}
        <code>toneMapped: false</code> on materials that should glow and push
        their emissive intensity above 1.0:
      </p>

      <CodeBlock
        filename="bloom-materials.ts"
        language="typescript"
        code={`// Hub nodes: subtle glow
<meshStandardMaterial
  emissive={hubColor}
  emissiveIntensity={2.5} // above 1.0 = triggers bloom
  toneMapped={false}      // bypass tone mapping to keep overbright
/>

// Hover glow halo: dramatic bloom on interaction
<meshStandardMaterial
  emissive={hubColor}
  emissiveIntensity={4.0}  // very bright = strong bloom
  toneMapped={false}
  depthWrite={false}       // render on top, don't occlude
/>

// Edge highlight: blue bloom for selected connections
const EDGE_HIGHLIGHT_R = 0.48;
const EDGE_HIGHLIGHT_G = 0.78;
const EDGE_HIGHLIGHT_B = 2.0; // blue channel > 1.0 = bloom`}
      />

      <p>
        Only materials with <code>toneMapped: false</code> and emissive values
        above 1.0 contribute to bloom. Everything else renders normally. This
        means the bloom pass operates on a sparse bright-area texture, making
        the blur passes much cheaper.
      </p>

      <h2>Orbital Drift Animation</h2>
      <p>
        Static graphs feel dead. We add subtle orbital drift to agent nodes
        so they appear to orbit their hub, creating a &ldquo;swarming&rdquo;
        effect:
      </p>

      <CodeBlock
        filename="orbital-drift.ts"
        language="typescript"
        code={`// Each agent orbits its simulation position in 3D
const orbitAngle = clock.getElapsedTime() * 0.15 + i * 0.37;
const orbitTilt  = clock.getElapsedTime() * 0.1  + i * 0.53;
const orbitDrift = 0.5; // radius of orbit

const driftX = Math.cos(orbitAngle) * Math.cos(orbitTilt) * orbitDrift;
const driftY = Math.sin(orbitTilt) * orbitDrift;
const driftZ = Math.sin(orbitAngle) * Math.cos(orbitTilt) * orbitDrift;

tempObj.position.set(
  (node.x ?? 0) + driftX,
  (node.y ?? 0) + driftY,
  (node.z ?? 0) + driftZ,
);`}
      />

      <p>
        Each agent uses a unique phase offset (<code>i * 0.37</code> and{" "}
        <code>i * 0.53</code>) so no two agents orbit in sync. The irrational
        multipliers ensure the pattern never repeats visibly.
      </p>

      <h2>Hub Node Animations</h2>
      <p>
        Hub nodes are individually rendered (not instanced) because they need
        pointer events and unique hover/selection states. We keep them
        performant with a few techniques:
      </p>
      <ul>
        <li>
          <strong>Breathe animation</strong>: a gentle sine-wave scale pulse
          makes hubs feel organic. Each hub uses its palette index as a phase
          offset so they breathe out of sync.
        </li>
        <li>
          <strong>Color lerp</strong>: state transitions (hover, select, dim)
          use <code>Color.lerp()</code> with exponential smoothing instead of
          React state changes. The transition runs entirely in the GPU pipeline.
        </li>
        <li>
          <strong>Hover glow halo</strong>: an additional translucent sphere
          mesh with high emissive intensity appears on hover, triggering bloom
          without affecting the base material.
        </li>
      </ul>

      <CodeBlock
        filename="hub-animation.ts"
        language="typescript"
        code={`useFrame((state, delta) => {
  // Gentle breathe — each hub out of phase
  const breathe = 1 + Math.sin(
    state.clock.getElapsedTime() * 1.5 + paletteIndex * 1.3
  ) * 0.03;
  meshRef.current.scale.setScalar(baseScale * breathe);

  // Smooth color transitions via exponential lerp
  const lerpFactor = 1 - Math.exp(-10 * delta);
  materialRef.current.color.lerp(targetColor.current, lerpFactor);
  materialRef.current.emissive.lerp(targetColor.current, lerpFactor);
  materialRef.current.opacity +=
    (targetOpacity.current - materialRef.current.opacity) * lerpFactor;
});`}
      />

      <h2>The Results</h2>
      <p>
        With all of these techniques combined, here&apos;s what we achieve:
      </p>
      <ul>
        <li>
          <strong>5,000 agent nodes</strong> rendered via a single InstancedMesh
          draw call
        </li>
        <li>
          <strong>60fps</strong> on a mid-range laptop GPU (integrated Intel
          Iris) with bloom post-processing
        </li>
        <li>
          <strong>Smooth streaming</strong> &mdash; new nodes arrive via
          WebSocket and integrate into the simulation without frame drops
        </li>
        <li>
          <strong>Full interactivity</strong> on hub nodes &mdash; hover,
          click, selection with color transitions
        </li>
        <li>
          <strong>Zero React re-renders</strong> during normal operation &mdash;
          all animation runs in useFrame
        </li>
      </ul>

      <p>
        The key lesson: if your per-frame work is all in{" "}
        <code>useFrame</code> and your geometry is instanced, React Three Fiber
        gives you near-native WebGL performance with React&apos;s component
        model for everything else.
      </p>

      <h2>Try It Yourself</h2>
      <p>
        The visualization is live at{" "}
        <a href="https://swarming.world/world">swarming.world/world</a>. The
        entire codebase is open source. If you&apos;re building something
        similar, the InstancedMesh + simulation-outside-React pattern is the
        foundation. Everything else is tuning.
      </p>
    </BlogLayout>
  );
}
