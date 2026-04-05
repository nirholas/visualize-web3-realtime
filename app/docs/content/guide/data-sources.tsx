export default function DataSourcesPage() {
  return (
    <>
      <h1>Data Sources</h1>
      <p className="docs-lead">
        Overview of data source options for feeding your visualization.
      </p>

      <h2 id="overview">Overview</h2>
      <p>
        Swarming supports multiple data source patterns. Each is implemented as
        a <em>provider</em> that emits nodes and edges into the simulation.
      </p>

      <div className="docs-grid">
        <a href="/docs/guide/websocket-streams" className="docs-card">
          <h3>WebSocket Streams</h3>
          <p>Connect to live data streams for real-time visualization</p>
        </a>
        <a href="/docs/guide/static-data" className="docs-card">
          <h3>Static Data</h3>
          <p>Visualize JSON datasets and snapshots</p>
        </a>
        <a href="/docs/guide/custom-providers" className="docs-card">
          <h3>Custom Providers</h3>
          <p>Create your own provider to connect any data source</p>
        </a>
        <a href="/docs/guide/built-in-providers" className="docs-card">
          <h3>Built-in Providers</h3>
          <p>Pre-built providers for Solana, Ethereum, and Kubernetes</p>
        </a>
      </div>
    </>
  );
}
