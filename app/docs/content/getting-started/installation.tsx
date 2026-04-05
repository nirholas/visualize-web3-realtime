import { CodeBlock } from '../../components/CodeBlock';

export default function InstallationPage() {
  return (
    <>
      <h1>Installation</h1>
      <p className="docs-lead">
        Get swarming installed in your project in under a minute.
      </p>

      <h2 id="prerequisites">Prerequisites</h2>
      <ul>
        <li>Node.js 18 or later</li>
        <li>React 18 or later</li>
        <li>A package manager (npm, yarn, or pnpm)</li>
      </ul>

      <h2 id="install-packages">Install packages</h2>
      <p>
        Install the core packages and their peer dependencies:
      </p>
      <CodeBlock
        language="bash"
        code={`npm install @web3viz/core @web3viz/react-graph @web3viz/providers @web3viz/ui`}
      />

      <h3>Peer dependencies</h3>
      <p>
        swarming requires React, Three.js, and React Three Fiber. If you don&apos;t already have them:
      </p>
      <CodeBlock
        language="bash"
        code={`npm install react react-dom three @react-three/fiber @react-three/drei d3-force`}
      />

      <h2 id="package-overview">Package overview</h2>
      <table className="docs-table">
        <thead>
          <tr>
            <th>Package</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>@web3viz/core</code></td>
            <td>Types, simulation engine, category system, provider interface</td>
          </tr>
          <tr>
            <td><code>@web3viz/react-graph</code></td>
            <td>React Three Fiber 3D force graph component</td>
          </tr>
          <tr>
            <td><code>@web3viz/providers</code></td>
            <td>Data providers (PumpFun, Mock, unified data layer)</td>
          </tr>
          <tr>
            <td><code>@web3viz/ui</code></td>
            <td>Design system — themes, primitives, composed components</td>
          </tr>
          <tr>
            <td><code>@web3viz/utils</code></td>
            <td>Utilities — screenshots, share URLs, formatters</td>
          </tr>
        </tbody>
      </table>

      <h2 id="verify">Verify installation</h2>
      <p>
        Create a simple test to make sure everything is wired up:
      </p>
      <CodeBlock
        language="typescript"
        filename="test-import.ts"
        code={`import { ForceGraphSimulation } from '@web3viz/core';
import { ForceGraph } from '@web3viz/react-graph';
import { MockProvider } from '@web3viz/providers';

console.log('All packages imported successfully!');`}
      />
      <p>
        If this compiles without errors, you&apos;re ready. Head to the{' '}
        <a href="/docs/getting-started/quick-start">Quick Start</a> to build your first visualization.
      </p>
    </>
  );
}
