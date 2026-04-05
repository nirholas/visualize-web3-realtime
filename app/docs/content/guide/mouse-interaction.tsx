import { CodeBlock } from '../../components/CodeBlock';

export default function MouseInteractionPage() {
  return (
    <>
      <h1>Mouse Interaction</h1>
      <p className="docs-lead">
        Configure mouse repulsion, drag behavior, and pointer events on the 3D canvas.
      </p>

      <h2 id="mouse-repulsion">Mouse repulsion</h2>
      <p>
        By default, nodes are gently pushed away from the cursor, creating an organic,
        responsive feel. This uses raycasting to project the 2D mouse position into 3D space.
      </p>

      <h2 id="cursor-states">Cursor states</h2>
      <p>
        The canvas automatically shows <code>grab</code> on hover and <code>grabbing</code>
        when dragging, providing clear visual feedback.
      </p>

      <h2 id="configuration">Configuration</h2>
      <CodeBlock
        language="tsx"
        code={`<ForceGraph
  nodes={nodes}
  edges={edges}
  mouseRepulsion={true}         // Enable/disable repulsion
  mouseRepulsionRadius={50}     // Radius of effect
  mouseRepulsionStrength={0.5}  // How hard nodes push away
/>`}
      />
    </>
  );
}
