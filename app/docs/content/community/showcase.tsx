export default function ShowcasePage() {
  return (
    <>
      <h1>Showcase</h1>
      <p className="docs-lead">
        Projects built with swarming. Submit yours via GitHub PR!
      </p>

      <div className="docs-grid">
        <div className="docs-card">
          <h3>swarming.world</h3>
          <p>
            The reference implementation — real-time Solana PumpFun visualization with
            AI agent orchestration, desktop shell UI, and embeddable widgets.
          </p>
          <span className="docs-badge">Official</span>
        </div>
      </div>

      <h2 id="submit">Submit your project</h2>
      <p>
        Built something with swarming? We&apos;d love to feature it! Open a pull request
        adding your project to this page with:
      </p>
      <ul>
        <li>Project name and description</li>
        <li>Link to live demo or repository</li>
        <li>Screenshot or GIF</li>
        <li>Which swarming features you used</li>
      </ul>
    </>
  );
}
