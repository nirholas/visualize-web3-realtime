export default function ChangelogPage() {
  return (
    <>
      <h1>Changelog</h1>
      <p className="docs-lead">
        Version history and release notes for the swarming SDK.
      </p>

      <h2 id="v0-1-0">v0.1.0 — Initial Release</h2>
      <p className="docs-date">2025</p>

      <h3>Features</h3>
      <ul>
        <li>3D force-directed graph with React Three Fiber</li>
        <li>Real-time WebSocket data streaming</li>
        <li>Instanced rendering for high-performance node visualization</li>
        <li>d3-force 3D simulation engine</li>
        <li>Solana PumpFun live data provider</li>
        <li>Mock data provider for development</li>
        <li>Dark/light theme system with CSS custom properties</li>
        <li>Mouse repulsion interaction</li>
        <li>Stats bar, live feed, and timeline components</li>
        <li>Share panel with screenshot export</li>
        <li>Embeddable widget mode</li>
        <li>AI agent visualization</li>
        <li>Keyboard shortcuts and accessibility support</li>
      </ul>

      <h3>Packages</h3>
      <ul>
        <li><code>@web3viz/core</code> — Types, simulation engine, categories</li>
        <li><code>@web3viz/react-graph</code> — React Three Fiber graph component</li>
        <li><code>@web3viz/providers</code> — Data providers and WebSocket manager</li>
        <li><code>@web3viz/ui</code> — Design system and UI components</li>
        <li><code>@web3viz/utils</code> — Shared utility functions</li>
      </ul>
    </>
  );
}
