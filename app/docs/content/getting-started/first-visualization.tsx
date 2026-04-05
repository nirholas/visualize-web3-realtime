import { CodeBlock } from '../../components/CodeBlock';

export default function FirstVisualizationPage() {
  return (
    <>
      <h1>Your First Visualization</h1>
      <p className="docs-lead">
        Build a complete real-time network visualization step by step.
      </p>

      <h2 id="step-1">Step 1 — Set up the provider</h2>
      <p>
        A provider feeds data into the graph. Start with the mock provider to
        learn the basics:
      </p>
      <CodeBlock
        language="tsx"
        filename="provider.ts"
        code={`import { MockProvider } from '@web3viz/providers';

export const provider = new MockProvider({
  nodeCount: 50,
  edgeCount: 80,
  interval: 2000,
});`}
      />

      <h2 id="step-2">Step 2 — Render the graph</h2>
      <p>
        Import the provider and pass it to the <code>Swarming</code> component:
      </p>
      <CodeBlock
        language="tsx"
        filename="App.tsx"
        code={`import { Swarming } from '@web3viz/react-graph';
import { provider } from './provider';

export default function App() {
  return (
    <Swarming
      provider={provider}
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}`}
      />

      <h2 id="step-3">Step 3 — Customize appearance</h2>
      <p>
        Pass a theme to change the look and feel:
      </p>
      <CodeBlock
        language="tsx"
        code={`<Swarming
  provider={provider}
  theme="dark"
  style={{ width: '100vw', height: '100vh' }}
/>`}
      />

      <h2 id="next-steps">Next steps</h2>
      <ul>
        <li><a href="/docs/guide/customization">Customization</a> — explore all customization options.</li>
        <li><a href="/docs/guide/data-sources">Data Sources</a> — connect to live data.</li>
      </ul>
    </>
  );
}
