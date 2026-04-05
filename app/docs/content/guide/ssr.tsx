import { CodeBlock } from '../../components/CodeBlock';

export default function SSRPage() {
  return (
    <>
      <h1>Server-Side Rendering</h1>
      <p className="docs-lead">
        Three.js requires browser APIs. Here&apos;s how to handle SSR in Next.js and Remix.
      </p>

      <h2 id="next-js">Next.js App Router</h2>
      <p>
        Use <code>dynamic</code> with <code>ssr: false</code>:
      </p>
      <CodeBlock
        language="tsx"
        filename="app/page.tsx"
        code={`import dynamic from 'next/dynamic';

const Graph = dynamic(
  () => import('@/components/Graph').then(m => ({ default: m.Graph })),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: '100%', height: '100vh', background: '#0a0a0f' }}>
        <p>Loading visualization...</p>
      </div>
    ),
  }
);`}
      />

      <h2 id="use-client">The &apos;use client&apos; directive</h2>
      <p>
        Any component that imports Three.js or React Three Fiber must be marked
        as a client component:
      </p>
      <CodeBlock
        language="tsx"
        code={`'use client';

import { ForceGraph } from '@web3viz/react-graph';
// This file will never run on the server`}
      />

      <h2 id="loading-states">Loading states</h2>
      <p>
        Provide a meaningful loading skeleton that matches the final layout to avoid
        layout shift:
      </p>
      <CodeBlock
        language="tsx"
        code={`const loading = () => (
  <div style={{
    width: '100%',
    height: '100vh',
    background: '#0a0a0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    fontFamily: 'monospace',
  }}>
    Initializing 3D engine...
  </div>
);`}
      />
    </>
  );
}
