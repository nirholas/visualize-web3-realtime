import { APITable } from '../../components/APITable';
import { CodeBlock } from '../../components/CodeBlock';

export default function CreateProviderPage() {
  return (
    <>
      <h1>createProvider() Factory</h1>
      <p className="docs-lead">
        Factory function for creating data providers that connect to any data source.
      </p>

      <h2 id="signature">Signature</h2>
      <CodeBlock
        language="typescript"
        code={`function createProvider(config: ProviderConfig): DataProvider`}
      />

      <h2 id="config">ProviderConfig</h2>
      <APITable
        properties={[
          { name: 'id', type: 'string', required: true, description: 'Unique identifier used in useDataProvider({ provider: id })' },
          { name: 'label', type: 'string', required: true, description: 'Human-readable name for UI display' },
          { name: 'connect', type: '(emit: EmitFn) => CleanupFn', required: true, description: 'Connection function. Called when the provider starts. Must return a cleanup function.' },
          { name: 'options', type: 'Record<string, unknown>', description: 'Default options merged with per-instance options' },
        ]}
      />

      <h2 id="emit-fn">EmitFn</h2>
      <p>The <code>emit</code> callback passed to <code>connect</code>:</p>
      <CodeBlock
        language="typescript"
        code={`type EmitFn = (event: ProviderEvent) => void;

type ProviderEvent =
  | { type: 'node'; node: Partial<GraphNode> & { id: string } }
  | { type: 'edge'; edge: { source: string; target: string; weight?: number } }
  | { type: 'update'; nodeId: string; data: Partial<GraphNode> }
  | { type: 'remove'; nodeId: string };`}
      />

      <h2 id="example">Complete example</h2>
      <CodeBlock
        language="typescript"
        filename="providers/github-events.ts"
        showLineNumbers
        code={`import { createProvider, registerProvider } from '@web3viz/core';

const githubProvider = createProvider({
  id: 'github-events',
  label: 'GitHub Events',

  connect: (emit) => {
    const eventSource = new EventSource(
      'https://api.github.com/events'
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Repo as hub node
      emit({
        type: 'node',
        node: {
          id: data.repo.id,
          label: data.repo.name,
          category: 'repo',
          size: 2,
        },
      });

      // Event as child node
      emit({
        type: 'node',
        node: {
          id: data.id,
          label: data.type,
          category: 'event',
          size: 1,
        },
      });

      // Connect event to repo
      emit({
        type: 'edge',
        edge: {
          source: data.repo.id,
          target: data.id,
        },
      });
    };

    return () => eventSource.close();
  },
});

registerProvider(githubProvider);`}
      />
    </>
  );
}
