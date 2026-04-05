import { CodeBlock } from '../../components/CodeBlock';

export default function FrameworksPage() {
  return (
    <>
      <h1>Frameworks</h1>
      <p className="docs-lead">
        Integration guides for Next.js, Vite, Remix, and vanilla JS.
      </p>

      <h2 id="nextjs">Next.js</h2>
      <p>
        Since swarming relies on Three.js, mark the component as client-only
        with <code>&quot;use client&quot;</code> or load it dynamically:
      </p>
      <CodeBlock
        language="tsx"
        filename="app/page.tsx"
        code={`'use client';

import { Swarming } from '@web3viz/react-graph';
import { MockProvider } from '@web3viz/providers';

const provider = new MockProvider();

export default function Page() {
  return <Swarming provider={provider} style={{ width: '100%', height: '100vh' }} />;
}`}
      />

      <h2 id="vite">Vite</h2>
      <p>
        No extra configuration is needed — just import and render:
      </p>
      <CodeBlock
        language="tsx"
        filename="src/App.tsx"
        code={`import { Swarming } from '@web3viz/react-graph';
import { MockProvider } from '@web3viz/providers';

const provider = new MockProvider();

export default function App() {
  return <Swarming provider={provider} style={{ width: '100vw', height: '100vh' }} />;
}`}
      />

      <h2 id="remix">Remix</h2>
      <p>
        Use <code>ClientOnly</code> or lazy-load the graph component to avoid
        SSR issues with Three.js.
      </p>

      <h2 id="vanilla">Vanilla JavaScript</h2>
      <p>
        Swarming can be used without a framework via the engine package directly. See the{' '}
        <a href="/docs/api/use-swarming-engine">Engine API</a> for details.
      </p>
    </>
  );
}
