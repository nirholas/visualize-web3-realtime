export default function UseCasesPage() {
  return (
    <>
      <h1>Use Case Gallery</h1>
      <p className="docs-lead">
        Real-world applications and inspiration for what you can build with swarming.
      </p>

      <div className="docs-grid">
        <div className="docs-card">
          <h3>DeFi Protocol Monitoring</h3>
          <p>
            Visualize token swaps, liquidity pool interactions, and whale movements
            across DeFi protocols in real-time.
          </p>
        </div>
        <div className="docs-card">
          <h3>AI Agent Orchestration</h3>
          <p>
            Map communication patterns between AI agents — function calls, tool usage,
            and task delegation.
          </p>
        </div>
        <div className="docs-card">
          <h3>Kubernetes Cluster Monitoring</h3>
          <p>
            Live visualization of pods, services, and network traffic in a K8s cluster.
            Hub nodes for services, child nodes for pods.
          </p>
        </div>
        <div className="docs-card">
          <h3>Social Network Analysis</h3>
          <p>
            Map follower relationships, content propagation, and community clusters.
          </p>
        </div>
        <div className="docs-card">
          <h3>IoT Device Networks</h3>
          <p>
            Visualize sensor networks, device communication, and data flow in real-time.
          </p>
        </div>
        <div className="docs-card">
          <h3>Supply Chain Tracking</h3>
          <p>
            Track goods through manufacturing, shipping, and distribution networks.
          </p>
        </div>
      </div>
    </>
  );
}
