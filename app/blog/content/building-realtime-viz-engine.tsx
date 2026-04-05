import { BlogLayout } from '../components/BlogLayout';
import { CodeBlock } from '../components/CodeBlock';

export function BuildingRealtimeVizContent() {
  return (
    <BlogLayout>
      <p>
        When we started building Swarming, the goal was deceptively simple: take any stream of
        real-time data and make it beautiful. Tokens being traded, agents executing strategies,
        protocols processing transactions — we wanted all of it rendered as a living, breathing
        3D network that you could explore with your mouse.
      </p>

      <p>
        What we ended up building is a pipeline that ingests thousands of WebSocket events per
        second, feeds them through a physics simulation, and renders the result at 60fps in the
        browser — all without a single dropped frame. This post is the architectural deep-dive
        into how that pipeline works, what tradeoffs we made, and what we would do differently
        next time.
      </p>

      <h2>The Vision: Make Any Streaming Data Beautiful</h2>

      <p>
        Most real-time dashboards are tables that update. Numbers go up, numbers go down, maybe
        a line chart wiggles. We wanted something fundamentally different: a spatial representation
        where the <em>structure</em> of the data is visible. When a new token launches and traders
        start swarming to it, you should <em>see</em> the cluster form. When activity dies down,
        the cluster should drift apart. The visualization should be a direct physical metaphor
        for what is happening in the data.
      </p>

      <p>
        That vision drove every architectural decision. We needed a system that could handle
        continuous mutation (new nodes appearing, old ones fading), that could maintain spatial
        coherence across updates (nodes should not jump around), and that could render thousands
        of elements without the browser catching fire.
      </p>

      <h2>Architecture: The Provider-Simulation-Renderer Pipeline</h2>

      <p>
        The entire system is a three-stage pipeline. Data flows in one direction:
        from <strong>providers</strong> (WebSocket connections to various data sources)
        through a <strong>simulation</strong> (d3-force-3d computing positions)
        to a <strong>renderer</strong> (React Three Fiber painting pixels). Each stage is
        completely decoupled from the others. A provider does not know about Three.js. The
        renderer does not know about WebSockets. The simulation does not know about either.
      </p>

      <p>
        This separation was not an academic exercise. It lets us swap providers without
        touching rendering code. It lets us test the simulation with mock data. And it means
        the simulation can run at its own tick rate, independent of the 60fps render loop.
      </p>

      <CodeBlock language="text" code={`WebSocket Events
    |
    v
DataProvider          ← connect(), disconnect(), onEvent()
    |
    v
ForceGraphSimulation  ← update(topTokens, traderEdges)
    |
    v
React Three Fiber     ← useFrame() reads node positions every frame`} /

      <p>
        This clean separation also makes the system testable. We can feed synthetic data into
        the simulation and verify the output without spinning up a WebSocket server. We can
        snapshot the renderer output without running a simulation. Each stage has clear inputs
        and outputs, which means each stage has clear test boundaries.
      </p>

      <h2>The DataProvider Interface: Radical Simplicity</h2>

      <p>
        We went through three iterations of the provider interface before arriving at something
        we liked. The first version had seventeen methods. The second had eleven. The final
        version has a core surface area of just four concepts: connect, disconnect, subscribe
        to events, and read aggregate stats.
      </p>

      <CodeBlock language="typescript" code={`export interface DataProvider {
  readonly id: string;
  readonly name: string;
  readonly chains: string[];

  connect(): void;
  disconnect(): void;

  getStats(): DataProviderStats;
  getConnections(): ConnectionState[];

  onEvent(callback: (event: DataProviderEvent) => void): () => void;
}`} /

      <p>
        Why so minimal? Because providers are the boundary between "the outside world" and
        "our application." The outside world is messy — WebSocket protocols differ, data
        formats vary, reconnection strategies depend on the source. By keeping the interface
        small, we push all that complexity <em>inside</em> the provider implementation. The
        rest of the application sees a clean, uniform stream of typed events.
      </p>

      <p>
        The <code>onEvent</code> method returns an unsubscribe function, which follows the
        same pattern as React&apos;s <code>useEffect</code> cleanup. This makes it trivial to
        wire providers into the React lifecycle without leaking subscriptions. The{' '}
        <code>getStats()</code> method returns an aggregate snapshot — top tokens by volume,
        active trader edges, connection health — which the simulation polls on a regular
        interval rather than reacting to every individual event.
      </p>

      <p>
        Under the hood, each provider uses our <code>WebSocketManager</code>, a shared utility
        that handles the gnarly parts of persistent connections: exponential backoff
        reconnection (starting at 1 second, capped at 30 seconds), ping/pong heartbeat
        keep-alive, and a state machine that tracks whether we are disconnected, connecting,
        connected, reconnecting, or failed.
      </p>

      <CodeBlock language="typescript" code={`const ws = new WebSocketManager({
  url: 'wss://data-source.example.com/stream',
  baseReconnectMs: 1000,
  maxReconnectMs: 30000,
  maxRetries: 50,
  heartbeatIntervalMs: 30000,
  onMessage: (data) => parseAndEmit(data),
  onStateChange: (state) => updateConnectionStatus(state),
});

ws.connect();`} /

      <p>
        The state machine matters more than you might think. Without it, reconnection logic
        becomes a nest of boolean flags: <code>isConnecting</code>,{' '}
        <code>shouldReconnect</code>, <code>hasEverConnected</code>. The state machine collapses
        all of that into a single value. When the state is &quot;reconnecting,&quot; we know we
        had a connection that was lost and we are trying to get it back. When it is
        &quot;failed,&quot; we know we have exhausted our retries. The UI can show appropriate
        indicators without understanding the reconnection algorithm.
      </p>

      <h2>Physics Simulation: Why d3-force-3d</h2>

      <p>
        We considered writing custom physics. For about forty-eight hours we tried, implementing
        a basic n-body simulation with Euler integration. It worked — barely. Nodes repelled
        each other, links pulled them together, and the whole thing wobbled into a vaguely
        reasonable layout. Then we added 500 nodes and the frame rate collapsed.
      </p>

      <p>
        The problem with rolling your own force simulation is not the basic physics — that is
        straightforward. The problem is the optimizations: Barnes-Hut approximation for n-body
        forces, spatial indexing for collision detection, adaptive alpha decay so the simulation
        settles without over-damping. d3-force has solved all of these problems over the course
        of a decade, and d3-force-3d extends it into three dimensions natively. We were not
        going to beat that in a weekend.
      </p>

      <p>
        Our <code>ForceGraphSimulation</code> class wraps d3-force-3d with a domain-specific
        API. Instead of thinking in terms of generic nodes and forces, calling code thinks in
        terms of tokens and traders. The <code>update()</code> method takes{' '}
        <code>TopToken[]</code> and <code>TraderEdge[]</code>, and internally translates them
        into force-graph nodes and edges:
      </p>

      <CodeBlock language="typescript" code={`export class ForceGraphSimulation {
  nodes: ForceNode[] = [];
  edges: ForceEdge[] = [];
  private simulation: ReturnType<typeof forceSimulation<ForceNode>>;
  private nodeMap = new Map<string, ForceNode>();

  constructor(config: ForceGraphConfig = {}) {
    this.simulation = forceSimulation<ForceNode>([], 3)
      .force('charge', forceManyBody<ForceNode>()
        .strength(d => d.type === 'hub' ? -200 : -8))
      .force('center', forceCenter<ForceNode>(0, 0, 0)
        .strength(0.03))
      .force('collide', forceCollide<ForceNode>()
        .radius(d => d.radius + 0.3)
        .strength(0.7))
      .force('link', forceLink<ForceNode, ForceEdge>([])
        .id(d => d.id)
        .distance(d => {
          const src = d.source as ForceNode;
          const tgt = d.target as ForceNode;
          if (src.type === 'hub' && tgt.type === 'hub')
            return 25;
          return 5 + Math.random() * 3;
        }))
      .alphaDecay(0.01)
      .velocityDecay(0.4);
  }

  update(topTokens: TopToken[], traderEdges: TraderEdge[]): void {
    // Build hub nodes from tokens, agent nodes from edges
    // Rebuild link list, restart simulation
  }

  tick(): void {
    this.simulation.tick();
  }
}`} /

      <p>
        A few things worth noting about the force configuration. Hub charge strength is -200,
        which pushes token clusters far apart from each other. Agent charge is only -8, just
        enough to prevent agents from stacking on top of each other. The collision radius
        includes a 0.3 unit buffer so nodes never visually overlap. And the alpha decay of 0.01
        means the simulation takes a few seconds to settle, which actually looks good — you see
        the network organize itself in real time.
      </p>

      <h2>The Hub-and-Spoke Model: Hierarchy From Data</h2>

      <p>
        The most important design decision in the visualization is the hub-and-spoke model. When
        data arrives, we do not just throw every entity into the simulation as an equal peer.
        Instead, we distinguish between <strong>hub nodes</strong> (tokens, protocols — the
        things being interacted with) and <strong>agent nodes</strong> (traders, wallets — the
        things doing the interacting). Hubs are large, colorful, and labeled. Agents are tiny,
        muted, and numerous.
      </p>

      <p>
        This distinction creates visual hierarchy automatically. A popular token has hundreds of
        agents orbiting it, forming a dense cluster. A quiet token has a handful of agents and
        appears as a sparse constellation. You can immediately see which tokens are hot and which
        are dormant, without reading a single number.
      </p>

      <p>
        The spoke connections also create emergent structure. When a trader interacts with
        multiple tokens, their agent node gets pulled between those hubs by the link forces,
        naturally positioning itself between the clusters it connects. Traders who only touch
        one token sit close to its hub. Cross-token traders bridge the gaps. The spatial layout
        encodes information that would take a table ten columns to express.
      </p>

      <p>
        Hub sizing is another channel for conveying information. We scale each hub node&apos;s
        radius proportionally to its volume relative to the top token. The busiest token gets
        the maximum radius (3.0 units), while lower-volume tokens scale down toward the base
        radius (0.8 units). This means the most active tokens are physically larger in the
        scene — they catch your eye first, which matches the intuition that they are the most
        important things happening right now.
      </p>

      <p>
        Initial hub positioning uses a golden-angle spiral on a sphere. This distributes hubs
        evenly in 3D space before the simulation even starts, which prevents the awkward
        &quot;explosion from the origin&quot; that happens when all nodes start at (0, 0, 0).
        Agents are distributed spherically around their parent hub, creating immediate visual
        clusters that the simulation then refines into a stable layout.
      </p>

      <CodeBlock language="typescript" code={`// Golden-angle spiral distributes hubs evenly on a sphere
const phi = Math.acos(1 - 2 * (i + 0.5) / topTokens.length);
const theta = Math.PI * (1 + Math.sqrt(5)) * i; // golden angle
const dist = 15 + Math.random() * 5;

const node: ForceNode = {
  id: token.tokenAddress,
  type: 'hub',
  x: Math.sin(phi) * Math.cos(theta) * dist,
  y: Math.sin(phi) * Math.sin(theta) * dist,
  z: Math.cos(phi) * dist,
};`} /

      <h2>State Management: Why React Refs Over Redux</h2>

      <p>
        This is where we break from conventional React wisdom. In a typical React application,
        you would put your node positions in state — maybe a Zustand store or Redux — and let
        React reconcile the changes. That approach works beautifully when your data changes ten
        times per second. It falls apart completely when your data changes sixty times per second.
      </p>

      <p>
        At 60fps, you have 16.6 milliseconds per frame. A React state update triggers
        reconciliation, which walks the component tree, diffs the virtual DOM, and applies
        changes. Even with memoization, this overhead eats a significant chunk of your frame
        budget. Multiply that by 5,000 nodes changing position every frame and you are burning
        all your time on React bookkeeping instead of actually rendering.
      </p>

      <p>
        Our solution: store everything in React refs and mutate them directly. The simulation
        runs outside React entirely. The render loop uses <code>useFrame</code> from React Three
        Fiber, which calls our callback every frame <em>outside the React reconciliation
        cycle</em>. We read positions from the simulation, write them into Three.js buffer
        attributes, and tell the GPU to re-render. React never knows the positions changed.
      </p>

      <CodeBlock language="typescript" code={`// Simulation runs outside React
const simRef = useRef(new ForceGraphSimulation());

// Instanced mesh for thousands of agent nodes
const meshRef = useRef<THREE.InstancedMesh>(null);
const matrixRef = useRef(new THREE.Matrix4());

useFrame(() => {
  const sim = simRef.current;
  sim.tick();

  const agents = sim.getAgentNodes();
  const mesh = meshRef.current;
  if (!mesh) return;

  // Write positions directly into instance matrices
  for (let i = 0; i < agents.length; i++) {
    const node = agents[i];
    matrixRef.current.setPosition(node.x, node.y, node.z);
    mesh.setMatrixAt(i, matrixRef.current);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.count = agents.length;
});`} /

      <p>
        This pattern has a cost: we lose React&apos;s declarative model for the hot path. Debugging
        is harder because React DevTools cannot see the simulation state. But the performance
        gain is not marginal — it is the difference between 15fps and 60fps with 5,000 nodes.
        We will take the debugging inconvenience.
      </p>

      <p>
        There is a subtlety in how we handle the two types of nodes differently. Hub nodes
        (tokens) need individual meshes because they require hover detection, click handlers,
        and labels. We render maybe 8-20 of those, so the overhead is negligible. Agent nodes
        are purely visual — no interaction needed — so we batch all of them into a
        single <code>InstancedMesh</code>. One draw call for 5,000 particles instead of 5,000
        draw calls. That single optimization is responsible for most of our performance budget.
      </p>

      <h2>Memory Safety: BoundedMap and BoundedSet</h2>

      <p>
        Real-time applications have a unique failure mode: slow memory leaks. When you are
        processing thousands of events per second, even a small per-event allocation adds up.
        Leave the tab open overnight and you wake up to a browser tab using 4GB of RAM.
      </p>

      <p>
        We learned this the hard way. Our first version used standard <code>Map</code> and{' '}
        <code>Set</code> objects for caching seen tokens, tracking trader addresses, and
        deduplicating events. After a few hours of continuous operation, memory usage would
        climb steadily until the tab crashed.
      </p>

      <p>
        The fix was <code>BoundedMap</code> and <code>BoundedSet</code> — drop-in replacements
        for the native collections that enforce a maximum size. When a new entry would exceed
        the limit, the oldest entry (by insertion order) is evicted. It is essentially an LRU
        cache built on top of the native Map insertion-order guarantee:
      </p>

      <CodeBlock language="typescript" code={`export class BoundedMap<K, V> extends Map<K, V> {
  private readonly maxSize: number;

  constructor(maxSize: number) {
    super();
    this.maxSize = maxSize;
  }

  override set(key: K, value: V): this {
    if (this.has(key)) {
      this.delete(key); // Move to end of insertion order
    }
    super.set(key, value);

    while (this.size > this.maxSize) {
      const oldest = this.keys().next().value;
      if (oldest !== undefined) this.delete(oldest);
    }
    return this;
  }
}`} /

      <p>
        We now use <code>BoundedMap</code> everywhere a cache or accumulator might grow without
        bound. Token stats, trader edges, event deduplication sets — all bounded. The maxSize
        is tuned per use case: 500 for token caches, 5000 for trader edge tracking, 10000 for
        event deduplication. Memory usage is now flat over time, typically hovering around
        150-200MB regardless of how long the session runs.
      </p>

      <p>
        The key insight is that for real-time visualization, stale data has zero value. If a
        token was last traded six hours ago, we do not need it in our cache. The LRU eviction
        naturally keeps the working set fresh without requiring explicit TTL logic.
      </p>

      <h2>Lessons Learned</h2>

      <p>
        After months of building this system, here is what we would do differently if we
        started over:
      </p>

      <p>
        <strong>Start with InstancedMesh from day one.</strong> We originally rendered every
        node as an individual <code>&lt;mesh&gt;</code> in JSX. It was elegant, declarative,
        and completely unusable past 200 nodes. We burned two weeks on incremental optimizations
        (memoization, virtualization, frustum culling) before accepting that the fundamental
        approach was wrong. Instanced rendering should be the default for any visualization
        with more than a few hundred elements.
      </p>

      <p>
        <strong>Decouple the simulation tick rate from the render rate.</strong> We currently
        tick the simulation inside <code>useFrame</code>, which means it runs at display refresh
        rate. On a 144Hz monitor, that is 144 ticks per second — more than we need and
        wasteful. On a 30Hz mobile display, it is too few and the simulation feels sluggish.
        A fixed-timestep simulation running on a Web Worker, with the render loop interpolating
        between states, would be more robust.
      </p>

      <p>
        <strong>Invest in a proper scene graph earlier.</strong> As we added features — labels,
        connection lines, particle effects, selection highlights — the render function grew into
        a monolith. A scene graph abstraction that managed layers (background, nodes, edges,
        labels, effects) would have kept things organized. We are gradually refactoring toward
        this now.
      </p>

      <p>
        <strong>Build the mock provider first.</strong> Our <code>MockProvider</code> generates
        deterministic fake data and was one of the best investments we made. It let us develop
        the entire visualization pipeline without needing a live WebSocket connection. Every new
        provider we build now starts as a mock, and the mock stays in the codebase as a testing
        tool. If you are building a real-time application, build your fake data source before
        your real one.
      </p>

      <p>
        <strong>Do not underestimate text rendering.</strong> Rendering labels in WebGL is
        surprisingly hard. Canvas-based text textures work but are expensive to update.
        SDF (signed distance field) text is crisp at any zoom level but requires a font atlas
        pipeline. We ended up with a hybrid approach — HTML overlays for hub labels and no
        labels for agent nodes — which is acceptable but not ideal.
      </p>

      <h2>Where We Go From Here</h2>

      <p>
        The architecture we have described here handles our current scale — roughly 5,000
        simultaneous nodes, a dozen hub clusters, and sustained input of hundreds of events per
        second. But we see the ceiling. Moving the simulation to a Web Worker will unlock higher
        node counts. Compute shaders could replace d3-force for truly massive graphs. And the
        provider abstraction means we can connect to entirely new data sources — not just
        blockchain data, but any real-time stream — without changing a line of rendering code.
      </p>

      <p>
        The core insight that has held up through every iteration: keep the pipeline stages
        independent. Provider does not know about rendering. Simulation does not know about
        the data source. Renderer does not know about the network protocol. When you maintain
        those boundaries, you can replace any piece without the others noticing. That is not
        just good architecture — it is the only way to iterate fast enough to keep up with a
        space that moves as quickly as real-time data.
      </p>
    </BlogLayout>
  );
}
