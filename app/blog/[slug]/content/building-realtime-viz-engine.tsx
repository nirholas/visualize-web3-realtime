import { BlogLayout } from "../../components/BlogLayout";
import { CodeBlock } from "../../components/CodeBlock";

export default function BuildingRealtimeVizEngine() {
  return (
    <BlogLayout>
      <p>
        Most visualization libraries assume your data is static. You load a
        dataset, render it, maybe add some transitions. But what if your data
        never stops arriving? WebSocket feeds, blockchain transactions, IoT
        sensors, AI agent swarms &mdash; these are continuous streams, and
        they need a visualization engine built from the ground up for
        real-time.
      </p>
      <p>
        This is the architecture behind Swarming: a pipeline that ingests
        streaming data, runs physics simulation, and renders 5,000+ animated
        nodes at 60fps. Here&apos;s every design decision we made and why.
      </p>

      <h2>The Pipeline: Provider &rarr; Simulation &rarr; Renderer</h2>
      <p>
        The entire system is three stages. Data flows in one direction,
        each stage has a single responsibility, and they communicate through
        plain objects &mdash; no event buses, no pub/sub, no Redux.
      </p>

      <CodeBlock
        filename="architecture.ts"
        language="typescript"
        code={`// Stage 1: Provider — connects to data source, emits typed objects
interface DataProvider {
  connect(): void;
  disconnect(): void;
  onData(callback: (tokens: TopToken[], edges: TraderEdge[]) => void): void;
}

// Stage 2: Simulation — runs d3-force-3d physics
class ForceGraphSimulation {
  update(tokens: TopToken[], edges: TraderEdge[]): void;
  tick(): void;  // advance physics one step
  nodes: ForceNode[];
  edges: ForceEdge[];
}

// Stage 3: Renderer — React Three Fiber reads simulation state
function useFrame() {
  sim.tick();
  // read sim.nodes positions → write to GPU buffers
}`}
      />

      <p>
        The beauty of this design is that each stage is independently
        replaceable. Swap the WebSocket provider for a REST poller, a file
        reader, or a mock &mdash; the simulation and renderer don&apos;t
        change. Swap Three.js for Canvas 2D &mdash; the provider and
        simulation don&apos;t change.
      </p>

      <h2>The DataProvider Interface</h2>
      <p>
        The DataProvider is deliberately minimal. It has exactly three methods:
        connect, disconnect, and register a callback. That&apos;s it.
      </p>
      <p>
        We considered a more complex interface with event types, backpressure
        signals, and schema negotiation. We threw it all away. A provider&apos;s
        job is to turn external data into <code>TopToken[]</code> and{" "}
        <code>TraderEdge[]</code>. Everything else is the provider&apos;s
        internal concern.
      </p>

      <CodeBlock
        filename="types.ts"
        language="typescript"
        code={`interface TopToken {
  tokenAddress: string;
  symbol: string;
  name: string;
  volume: number;
  chain?: string;
  source?: string;
}

interface TraderEdge {
  trader: string;
  tokenAddress: string;
  source?: string;
}`}
      />

      <p>
        The <code>source</code> field is optional and used for multi-provider
        scenarios. When you connect multiple data sources simultaneously,
        each node carries its provenance. This lets the renderer color-code
        by source without the provider knowing about rendering.
      </p>

      <h2>WebSocket Management</h2>
      <p>
        Real-time data means WebSocket connections, and WebSocket connections
        fail. Our <code>WebSocketManager</code> handles reconnection with
        exponential backoff, message queuing during disconnects, and
        heartbeat monitoring.
      </p>

      <CodeBlock
        filename="WebSocketManager.ts"
        language="typescript"
        code={`class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30_000; // cap at 30s

  connect(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onclose = () => {
      // Exponential backoff: 1s, 2s, 4s, 8s, ... 30s max
      const delay = Math.min(
        1000 * Math.pow(2, this.reconnectAttempts),
        this.maxReconnectDelay
      );
      this.reconnectAttempts++;
      setTimeout(() => this.connect(url), delay);
    };

    this.ws.onopen = () => {
      this.reconnectAttempts = 0; // reset on success
    };
  }
}`}
      />

      <p>
        The exponential backoff is critical for production. Without it, a
        server restart causes a thundering herd of reconnection attempts from
        every connected client simultaneously.
      </p>

      <h2>Why d3-force-3d Over Custom Physics</h2>
      <p>
        We evaluated three options for the physics engine:
      </p>
      <ul>
        <li>
          <strong>Custom Verlet integration</strong>: maximum control, but
          we&apos;d be writing collision detection, Barnes-Hut approximation,
          and link constraints from scratch.
        </li>
        <li>
          <strong>cannon-es / rapier</strong>: full rigid-body physics engines.
          Overkill for graph layout &mdash; we don&apos;t need friction,
          restitution, or collision shapes.
        </li>
        <li>
          <strong>d3-force-3d</strong>: purpose-built for graph layout with
          native 3D support, Barnes-Hut optimization for n-body charge, and a
          configurable force API.
        </li>
      </ul>
      <p>
        d3-force-3d won because it solves exactly our problem and nothing
        more. Its <code>forceSimulation(nodes, 3)</code> constructor enables
        full volumetric layout with xyz coordinates. The Barnes-Hut
        approximation reduces charge computation from O(n&sup2;) to
        O(n log n), which matters at 5,000 nodes.
      </p>

      <h2>State Management: Refs Over Redux</h2>
      <p>
        This is the most controversial decision in the codebase. We use React
        refs &mdash; not Redux, not Zustand, not Jotai &mdash; for all
        simulation state.
      </p>
      <p>
        The reason is simple: 60fps means 16.67ms per frame. A React
        re-render triggered by state change goes through: setState &rarr;
        schedule render &rarr; execute render function &rarr; diff virtual
        DOM &rarr; commit to real DOM. For a component tree rendering 5,000
        nodes, this easily exceeds 16ms.
      </p>

      <CodeBlock
        filename="ForceGraph.tsx"
        language="typescript"
        code={`// The simulation lives in a ref — React never knows it changed
const simRef = useRef<ForceGraphSimulation>(
  new ForceGraphSimulation()
);

// Data arrives from provider → update simulation directly
useEffect(() => {
  provider.onData((tokens, edges) => {
    simRef.current.update(tokens, edges); // no setState!
  });
}, [provider]);

// Every frame: tick physics, read positions, write to GPU
useFrame(() => {
  simRef.current.tick();

  const nodes = simRef.current.nodes;
  for (let i = 0; i < nodes.length; i++) {
    tempObj.position.set(nodes[i].x, nodes[i].y, nodes[i].z);
    tempObj.scale.setScalar(nodes[i].radius);
    tempObj.updateMatrix();
    instancedMesh.setMatrixAt(i, tempObj.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
});`}
      />

      <p>
        The entire hot path &mdash; data arrival, physics tick, GPU update
        &mdash; bypasses React&apos;s rendering pipeline. React manages the
        component tree, mounting, unmounting, and UI elements like sidebars
        and controls. But the visualization itself runs in a ref-based
        imperative loop.
      </p>

      <h2>The Hub-and-Spoke Model</h2>
      <p>
        Most graph visualizations treat all nodes equally. We don&apos;t. Our
        data has natural hierarchy: protocols/tokens are hubs,
        traders/agents are spokes. This informs every part of the system:
      </p>
      <ul>
        <li>
          <strong>Physics</strong>: hub charge (-200) vs agent charge (-8)
          creates natural clustering
        </li>
        <li>
          <strong>Rendering</strong>: hubs get individual meshes with hover
          events; agents get instanced rendering
        </li>
        <li>
          <strong>Layout</strong>: hubs distribute on a Fibonacci sphere
          (golden angle), agents scatter around their hub
        </li>
        <li>
          <strong>Interaction</strong>: clicking a hub filters its agents;
          agents are non-interactive at the individual level
        </li>
      </ul>

      <CodeBlock
        filename="hub-spoke-layout.ts"
        language="typescript"
        code={`// Hub placement: Fibonacci sphere (golden angle)
const phi = Math.acos(1 - 2 * (i + 0.5) / N);
const theta = Math.PI * (1 + Math.sqrt(5)) * i;
const hubPos = {
  x: Math.sin(phi) * Math.cos(theta) * 15,
  y: Math.sin(phi) * Math.sin(theta) * 15,
  z: Math.cos(phi) * 15,
};

// Agent placement: random point on sphere around hub
const aPhi = Math.acos(1 - 2 * Math.random());
const aTheta = Math.random() * Math.PI * 2;
const dist = 2 + Math.random() * 4;
const agentPos = {
  x: hubPos.x + Math.sin(aPhi) * Math.cos(aTheta) * dist,
  y: hubPos.y + Math.sin(aPhi) * Math.sin(aTheta) * dist,
  z: hubPos.z + Math.cos(aPhi) * dist,
};`}
      />

      <p>
        The hierarchy isn&apos;t imposed from outside &mdash; it emerges from
        the data. A token with 500 traders naturally forms a dense cluster. A
        token with 3 traders is a small satellite. The force simulation makes
        this visible automatically.
      </p>

      <h2>Memory Safety with BoundedMap</h2>
      <p>
        Streaming data means unbounded growth. A naive implementation stores
        every node ever seen, and after a few hours your tab crashes with an
        out-of-memory error. We solve this with <code>BoundedMap</code> and{" "}
        <code>BoundedSet</code> &mdash; LRU-evicting collections with a hard
        capacity limit.
      </p>

      <CodeBlock
        filename="BoundedMap.ts"
        language="typescript"
        code={`class BoundedMap<K, V> {
  private map = new Map<K, V>();
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  set(key: K, value: V) {
    // Delete + re-insert refreshes insertion order
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);

    // Evict oldest entries if over capacity
    while (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
}`}
      />

      <p>
        Every cache in the system uses BoundedMap. The node map, the edge
        deduplication set, the provider message buffer &mdash; all bounded.
        This is a hard rule: no unbounded <code>Map</code> or{" "}
        <code>Set</code> for any data that grows with input.
      </p>

      <h2>Lessons Learned</h2>

      <h3>1. Measure Before Optimizing</h3>
      <p>
        We spent two weeks optimizing force calculation before profiling
        showed the bottleneck was actually in edge rendering. Profile first,
        always.
      </p>

      <h3>2. Don&apos;t Fight the Framework</h3>
      <p>
        React Three Fiber gives you <code>useFrame</code> for a reason. If
        you find yourself using <code>requestAnimationFrame</code> alongside
        R3F, you&apos;re probably creating timing conflicts. Use the frame
        loop the framework provides.
      </p>

      <h3>3. Streaming Needs Streaming Architecture</h3>
      <p>
        You can&apos;t bolt real-time onto a batch-oriented system. The
        provider-simulation-renderer pipeline was designed from day one for
        continuous data. Retrofitting this onto a static visualization
        library results in performance hacks and race conditions.
      </p>

      <h3>4. Geometry Complexity Multiplies</h3>
      <p>
        Dropping sphere segments from 32 to 8 on agent nodes was a 3x
        improvement in vertex throughput. For instanced meshes, geometry
        complexity multiplies by instance count. A 200-vertex sphere at
        5,000 instances is 1M vertices per frame.
      </p>

      <h2>What&apos;s Next</h2>
      <p>
        We&apos;re working on making this architecture available as a
        standalone React component. The goal:{" "}
        <code>&lt;SwarmGraph source=&quot;wss://...&quot; /&gt;</code> &mdash;
        connect any WebSocket to a 3D force graph with one line of code. The
        entire codebase is open source at{" "}
        <a href="https://github.com/nicholasgriffintn/visualize-web3-realtime">
          GitHub
        </a>
        .
      </p>
    </BlogLayout>
  );
}
