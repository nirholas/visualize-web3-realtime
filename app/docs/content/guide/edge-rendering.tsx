import { CodeBlock } from '../../components/CodeBlock';

export default function EdgeRenderingPage() {
  return (
    <>
      <h1>Edge Rendering</h1>
      <p className="docs-lead">
        Customize edge styles, colors, and animations.
      </p>

      <h2 id="default-edges">Default edges</h2>
      <p>
        Edges are rendered as <code>LineSegments</code> for performance. Each
        edge connects two nodes and inherits color from the source node by
        default.
      </p>

      <h2 id="custom-colors">Custom colors</h2>
      <CodeBlock
        language="tsx"
        code={`<Swarming
  provider={provider}
  edgeColor={(edge) => edge.type === 'transfer' ? '#00ff88' : '#444444'}
/>`}
      />

      <h2 id="custom-width">Custom width</h2>
      <CodeBlock
        language="tsx"
        code={`<Swarming
  provider={provider}
  edgeWidth={(edge) => edge.weight * 2}
/>`}
      />

      <h2 id="animations">Animations</h2>
      <p>
        Directional arrows and animated dashes can be enabled to indicate data
        flow direction.
      </p>
    </>
  );
}
