export default function RoadmapPage() {
  return (
    <>
      <h1>Roadmap</h1>
      <p className="docs-lead">
        Planned features and the direction of the project.
      </p>

      <h2 id="in-progress">In Progress</h2>
      <ul>
        <li>Plugin system for extensibility</li>
        <li>React Native support for mobile</li>
        <li>Node graph editor for visual configuration</li>
      </ul>

      <h2 id="planned">Planned</h2>
      <ul>
        <li>Ethereum and EVM chain providers</li>
        <li>Kubernetes cluster visualization provider</li>
        <li>WebGPU renderer for next-gen performance</li>
        <li>Built-in analytics and metrics dashboard</li>
        <li>Graph export (GEXF, GraphML, JSON)</li>
        <li>Time-travel / playback for recorded data</li>
        <li>Collaborative viewing (multiple users, same graph)</li>
      </ul>

      <h2 id="exploring">Exploring</h2>
      <ul>
        <li>VR/AR support via WebXR</li>
        <li>AI-powered layout suggestions</li>
        <li>Automatic community detection and clustering</li>
        <li>GraphQL data provider</li>
      </ul>

      <h2 id="community-input">Community input</h2>
      <p>
        Want to influence the roadmap? Open a GitHub issue with your use case and
        requirements. Upvote existing feature requests to help us prioritize.
      </p>
    </>
  );
}
