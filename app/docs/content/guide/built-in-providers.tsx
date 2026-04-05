export default function BuiltInProvidersPage() {
  return (
    <>
      <h1>Built-in Providers</h1>
      <p className="docs-lead">
        Pre-built providers for Solana, Ethereum, and Kubernetes.
      </p>

      <h2 id="solana">Solana / PumpFun</h2>
      <p>
        Stream live token trades and claims from Solana via the PumpFun
        provider.
      </p>

      <h2 id="ethereum">Ethereum</h2>
      <p>
        Connect to Ethereum mempool and block data for real-time transaction visualization.
      </p>

      <h2 id="kubernetes">Kubernetes</h2>
      <p>
        Visualize pod, service, and deployment relationships in a K8s cluster.
      </p>

      <h2 id="more">More providers</h2>
      <p>
        Need a provider for a different data source?{' '}
        <a href="/docs/guide/custom-providers">Build your own</a> or check the{' '}
        <a href="/docs/community/showcase">community showcase</a> for third-party providers.
      </p>
    </>
  );
}
