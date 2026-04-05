import { CodeBlock } from '../../components/CodeBlock';

export default function StaticDataPage() {
  return (
    <>
      <h1>Static Data</h1>
      <p className="docs-lead">
        Visualize static datasets and snapshots.
      </p>

      <h2 id="loading-json">Loading JSON data</h2>
      <p>
        Pass an array of nodes and edges directly to the graph:
      </p>
      <CodeBlock
        language="tsx"
        code={`import { Swarming } from '@web3viz/react-graph';
import { StaticProvider } from '@web3viz/providers';
import data from './data.json';

const provider = new StaticProvider({ nodes: data.nodes, edges: data.edges });

export default function App() {
  return <Swarming provider={provider} style={{ width: '100vw', height: '100vh' }} />;
}`}
      />

      <h2 id="snapshots">Snapshots</h2>
      <p>
        Static providers are ideal for saved graph states, exported datasets,
        or pre-computed layouts.
      </p>
    </>
  );
}
