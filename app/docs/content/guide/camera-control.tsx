import { CodeBlock } from '../../components/CodeBlock';

export default function CameraControlPage() {
  return (
    <>
      <h1>Camera Control</h1>
      <p className="docs-lead">
        Control camera position, orbit behavior, zoom limits, and fly-to animations.
      </p>

      <h2 id="orbit-controls">Orbit controls</h2>
      <p>
        The default camera uses <code>OrbitControls</code> from Three.js, which provides:
      </p>
      <ul>
        <li><strong>Left-click + drag:</strong> Orbit around the scene</li>
        <li><strong>Right-click + drag:</strong> Pan</li>
        <li><strong>Scroll:</strong> Zoom in/out</li>
      </ul>

      <h2 id="programmatic-control">Programmatic control</h2>
      <CodeBlock
        language="tsx"
        code={`import { useRef } from 'react';
import type { GraphHandle } from '@web3viz/core';

function MyGraph() {
  const graphRef = useRef<GraphHandle>(null);

  const focusOnNode = (nodeId: string) => {
    graphRef.current?.focusNode(nodeId);
  };

  const resetView = () => {
    graphRef.current?.resetCamera();
  };

  return (
    <>
      <ForceGraph ref={graphRef} nodes={nodes} edges={edges} />
      <button onClick={() => focusOnNode('abc')}>Focus Node</button>
      <button onClick={resetView}>Reset Camera</button>
    </>
  );
}`}
      />

      <h2 id="graph-handle">GraphHandle API</h2>
      <table className="docs-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>focusNode(id)</code></td>
            <td>Smoothly animate the camera to center on a specific node</td>
          </tr>
          <tr>
            <td><code>resetCamera()</code></td>
            <td>Return to the default camera position</td>
          </tr>
          <tr>
            <td><code>getCanvas()</code></td>
            <td>Get the underlying canvas element for screenshots</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
