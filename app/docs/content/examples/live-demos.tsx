export default function LiveDemosPage() {
  return (
    <>
      <h1>Live Demos</h1>
      <p className="docs-lead">
        Interactive examples of swarming visualizations.
      </p>

      <div className="docs-grid">
        <a href="/world" className="docs-card" target="_blank" rel="noopener noreferrer">
          <h3>Solana PumpFun Live</h3>
          <p>Real-time token launches and trades from Solana&apos;s PumpFun protocol. Live WebSocket data.</p>
          <span className="docs-badge">Live Data</span>
        </a>
        <a href="/agents" className="docs-card" target="_blank" rel="noopener noreferrer">
          <h3>AI Agent Orchestration</h3>
          <p>Visualize AI agent communication and task delegation in real-time.</p>
          <span className="docs-badge">AI</span>
        </a>
        <a href="/embed" className="docs-card" target="_blank" rel="noopener noreferrer">
          <h3>Embeddable Widget</h3>
          <p>Lightweight embeddable version for integration into other sites.</p>
          <span className="docs-badge">Embed</span>
        </a>
      </div>

      <h2 id="codesandbox">Try on CodeSandbox</h2>
      <p>
        Fork these starter templates to experiment without any local setup:
      </p>
      <ul>
        <li><strong>Next.js + Mock Data:</strong> Basic setup with the mock provider</li>
        <li><strong>Vite + WebSocket:</strong> Minimal Vite template with live data</li>
        <li><strong>Custom Provider:</strong> Template showing how to create a custom data source</li>
      </ul>
    </>
  );
}
