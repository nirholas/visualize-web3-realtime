import { CodeBlock } from '../../components/CodeBlock';

export default function NodeRenderingPage() {
  return (
    <>
      <h1>Node Rendering</h1>
      <p className="docs-lead">
        Customize how nodes appear in the visualization.
      </p>

      <h2 id="default-rendering">Default rendering</h2>
      <p>
        Nodes are rendered as instanced spheres using Three.js{' '}
        <code>InstancedMesh</code> for optimal performance. Color and size are
        derived from node category.
      </p>

      <h2 id="custom-colors">Custom colors</h2>
      <CodeBlock
        language="tsx"
        code={`<Swarming
  provider={provider}
  nodeColor={(node) => node.category === 'swap' ? '#ff6600' : '#0066ff'}
/>`}
      />

      <h2 id="custom-size">Custom size</h2>
      <CodeBlock
        language="tsx"
        code={`<Swarming
  provider={provider}
  nodeSize={(node) => Math.log(node.value + 1) * 2}
/>`}
      />
    </>
  );
}
