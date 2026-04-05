import { CodeBlock } from '../../components/CodeBlock';

export default function WebSocketStreamsPage() {
  return (
    <>
      <h1>WebSocket Streams</h1>
      <p className="docs-lead">
        Connect to live WebSocket data streams for real-time visualization.
      </p>

      <h2 id="how-it-works">How it works</h2>
      <p>
        The <code>WebSocketManager</code> handles connection, reconnection with
        exponential backoff, and message parsing. Incoming messages are
        converted to nodes and edges that the simulation picks up
        automatically.
      </p>

      <h2 id="usage">Usage</h2>
      <CodeBlock
        language="tsx"
        code={`import { Swarming } from '@web3viz/react-graph';
import { WebSocketProvider } from '@web3viz/providers';

const provider = new WebSocketProvider({
  url: 'wss://your-data-source.example.com',
});

export default function App() {
  return <Swarming provider={provider} style={{ width: '100vw', height: '100vh' }} />;
}`}
      />

      <h2 id="reconnection">Reconnection</h2>
      <p>
        If the connection drops, the manager automatically reconnects using
        exponential backoff. You can configure the max retry delay and attempt
        limit in the provider options.
      </p>
    </>
  );
}
