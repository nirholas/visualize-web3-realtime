import { CodeBlock } from '../../components/CodeBlock';

export default function FrameworksPage() {
  return (
    <>
      <h1>Frameworks</h1>
      <p className="docs-lead">
        Integration guides for popular React frameworks and vanilla JavaScript.
      </p>

      <h2 id="nextjs">Next.js</h2>
      <p>
        swarming is built with Next.js 14. Use dynamic imports to avoid SSR issues with Three.js:
      </p>
      <CodeBlock
        language="tsx"
        filename="app/page.tsx"
        code={`import dynamic from 'next/dynamic';

const Graph = dynamic(
  () => import('@/components/Graph').then(m => ({ default: m.Graph })),
  { ssr: false }
);

export default function Page() {
  return <Graph />;
}`}
      />
      <div className="docs-callout">
        Mark your graph component with <code>&apos;use client&apos;</code> at the top of the file. Three.js
        requires browser APIs that aren&apos;t available in Server Components.
      </div>

      <h2 id="vite">Vite</h2>
      <p>
        Vite works out of the box. No special configuration needed:
      </p>
      <CodeBlock
        language="bash"
        code={`npm create vite@latest my-app -- --template react-ts
cd my-app
npm install @web3viz/core @web3viz/react-graph @web3viz/providers
npm install three @react-three/fiber @react-three/drei d3-force`}
      />
      <CodeBlock
        language="tsx"
        filename="src/App.tsx"
        code={`import { ForceGraph } from '@web3viz/react-graph';
import { MockProvider } from '@web3viz/providers';

function App() {
  const { nodes, edges } = MockProvider.useData();
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ForceGraph nodes={nodes} edges={edges} background="#0a0a0f" />
    </div>
  );
}`}
      />

      <h2 id="remix">Remix</h2>
      <p>
        Similar to Next.js, use a client-only wrapper to avoid SSR issues:
      </p>
      <CodeBlock
        language="tsx"
        filename="app/routes/index.tsx"
        code={`import { ClientOnly } from 'remix-utils/client-only';
import { Graph } from '~/components/Graph';

export default function Index() {
  return (
    <ClientOnly fallback={<div>Loading...</div>}>
      {() => <Graph />}
    </ClientOnly>
  );
}`}
      />

      <h2 id="vanilla">Vanilla JavaScript</h2>
      <p>
        You can use the core simulation engine without React:
      </p>
      <CodeBlock
        language="typescript"
        filename="main.ts"
        code={`import { ForceGraphSimulation } from '@web3viz/core';

const sim = new ForceGraphSimulation({
  alphaDecay: 0.01,
  velocityDecay: 0.3,
});

// Add nodes
sim.addNode({ id: 'a', x: 0, y: 0, z: 0 });
sim.addNode({ id: 'b', x: 1, y: 0, z: 0 });
sim.addEdge({ source: 'a', target: 'b' });

// Tick the simulation
sim.on('tick', (nodes) => {
  // Render with your own Three.js/WebGL/Canvas setup
  console.log(nodes);
});

sim.start();`}
      />

      <h2 id="remix">Remix</h2>
      <p>
        Similar to Next.js, use a client-only wrapper to avoid SSR issues:
      </p>
      <CodeBlock
        language="tsx"
        filename="app/routes/index.tsx"
        code={`import { ClientOnly } from 'remix-utils/client-only';
import { Graph } from '~/components/Graph';

export default function Index() {
  return (
    <ClientOnly fallback={<div>Loading...</div>}>
      {() => <Graph />}
    </ClientOnly>
  );
}`}
      />

      <h2 id="vanilla">Vanilla JavaScript</h2>
      <p>
        You can use the core simulation engine without React:
      </p>
      <CodeBlock
        language="typescript"
        filename="main.ts"
        code={`import { ForceGraphSimulation } from '@web3viz/core';

const sim = new ForceGraphSimulation({
  alphaDecay: 0.01,
  velocityDecay: 0.3,
});

// Add nodes
sim.addNode({ id: 'a', x: 0, y: 0, z: 0 });
sim.addNode({ id: 'b', x: 1, y: 0, z: 0 });
sim.addEdge({ source: 'a', target: 'b' });

// Tick the simulation
sim.on('tick', (nodes) => {
  // Render with your own Three.js/WebGL/Canvas setup
  console.log(nodes);
});

sim.start();`}
      />
    </>
  );
}
