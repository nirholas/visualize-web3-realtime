import { CodeBlock } from '../../components/CodeBlock';

export default function CustomProvidersPage() {
  return (
    <>
      <h1>Custom Providers</h1>
      <p className="docs-lead">
        Create your own data provider to connect any data source.
      </p>

      <h2 id="provider-interface">Provider interface</h2>
      <p>
        A provider implements <code>connect</code>, <code>disconnect</code>,
        and emits node/edge events:
      </p>
      <CodeBlock
        language="typescript"
        code={`import { createProvider } from '@web3viz/providers';

export const myProvider = createProvider({
  name: 'my-provider',
  async connect(emit) {
    // Start emitting nodes and edges
    emit({ type: 'node', data: { id: '1', label: 'Hello' } });
  },
  async disconnect() {
    // Clean up connections
  },
});`}
      />

      <h2 id="api-reference">API reference</h2>
      <p>
        See the <a href="/docs/api/create-provider">createProvider API</a> for
        the full type signature and options.
      </p>
    </>
  );
}
