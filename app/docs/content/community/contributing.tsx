import { CodeBlock } from '../../components/CodeBlock';

export default function ContributingPage() {
  return (
    <>
      <h1>Contributing</h1>
      <p className="docs-lead">
        We welcome contributions of all kinds — bug fixes, features, documentation, and examples.
      </p>

      <h2 id="getting-started">Getting started</h2>
      <CodeBlock
        language="bash"
        code={`# Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/visualize-web3-realtime.git
cd visualize-web3-realtime

# Install dependencies
npm install

# Start the dev server
npm run dev`}
      />

      <h2 id="project-structure">Project structure</h2>
      <p>
        See the <a href="/docs/getting-started/installation">Installation</a> page for
        a full breakdown of the monorepo structure.
      </p>

      <h2 id="development-workflow">Development workflow</h2>
      <ol>
        <li>Create a feature branch: <code>git checkout -b feat/my-feature</code></li>
        <li>Make your changes</li>
        <li>Run the build: <code>npm run build</code></li>
        <li>Run the linter: <code>npm run lint</code></li>
        <li>Commit with a descriptive message</li>
        <li>Open a pull request</li>
      </ol>

      <h2 id="code-style">Code style</h2>
      <ul>
        <li>TypeScript strict mode</li>
        <li>React functional components with hooks</li>
        <li>Tailwind CSS for styling (except verification components)</li>
        <li>No default exports for non-page components</li>
        <li>Use <code>BoundedMap</code>/<code>BoundedSet</code> for caches</li>
      </ul>

      <h2 id="reporting-issues">Reporting issues</h2>
      <p>
        Found a bug or have a feature request? Open an issue on GitHub with:
      </p>
      <ul>
        <li>A clear description of the problem or feature</li>
        <li>Steps to reproduce (for bugs)</li>
        <li>Expected vs. actual behavior</li>
        <li>Browser and OS information</li>
      </ul>
    </>
  );
}
