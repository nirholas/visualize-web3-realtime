import { CodeBlock } from '../../components/CodeBlock';

export default function QuickStartPage() {
  return (
    <>
      <h1>Quick Start</h1>
      <p className="docs-lead">
        Get a live visualization running in 30 seconds.
      </p>

      <h2 id="minimal-example">Minimal example</h2>
      <p>
        After <a href="/docs/getting-started/installation">installing</a> the
        packages, create a component that renders a force graph with the mock
        provider:
      </p>
      <CodeBlock
        language="tsx"
        filename="App.tsx"
        code={`import { Swarming } from '@web3viz/react-graph';
import { MockProvider } from '@web3viz/providers';

const provider = new MockProvider();

export default function App() {
  return <Swarming provider={provider} style={{ width: '100vw', height: '100vh' }} />;
}`}
      />

      <h2 id="whats-happening">What&apos;s happening</h2>
      <ol>
        <li><strong>MockProvider</strong> generates random nodes and edges so you can see something immediately.</li>
        <li><strong>Swarming</strong> sets up a Three.js canvas, runs the D3-force simulation, and renders everything in real time.</li>
      </ol>

      <h2 id="next-steps">Next steps</h2>
      <ul>
        <li><a href="/docs/getting-started/first-visualization">Your First Visualization</a> — build a complete example step by step.</li>
        <li><a href="/docs/getting-started/frameworks">Frameworks</a> — integration guides for Next.js, Vite, and more.</li>
        <li><a href="/docs/guide/data-sources">Data Sources</a> — connect to live WebSocket streams or static datasets.</li>
      </ul>
    </>
  );
}
