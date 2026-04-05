import { CodeBlock } from '../../components/CodeBlock';

export default function CustomShadersPage() {
  return (
    <>
      <h1>Custom Shaders</h1>
      <p className="docs-lead">
        Write custom GLSL shaders for unique visual effects like glow, particle trails,
        and custom post-processing.
      </p>

      <h2 id="shader-material">Custom ShaderMaterial</h2>
      <CodeBlock
        language="tsx"
        filename="shaders/glow-node.tsx"
        showLineNumbers
        code={`import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

const GlowMaterial = shaderMaterial(
  { color: [1, 0.5, 1], time: 0 },
  // Vertex shader
  \`
    varying vec3 vPosition;
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  \`,
  // Fragment shader
  \`
    uniform vec3 color;
    uniform float time;
    varying vec3 vPosition;
    void main() {
      float glow = 0.5 + 0.5 * sin(time + length(vPosition) * 3.0);
      gl_FragColor = vec4(color * glow, 0.8);
    }
  \`
);

extend({ GlowMaterial });`}
      />

      <h2 id="post-processing">Post-processing</h2>
      <p>
        swarming uses <code>@react-three/postprocessing</code> for effects like bloom:
      </p>
      <CodeBlock
        language="tsx"
        code={`import { EffectComposer, Bloom } from '@react-three/postprocessing';

<EffectComposer>
  <Bloom
    luminanceThreshold={0.2}
    luminanceSmoothing={0.9}
    intensity={0.5}
  />
</EffectComposer>`}
      />

      <div className="docs-callout">
        <strong>Performance note:</strong> Post-processing effects add a full-screen pass.
        Each effect roughly doubles the GPU work. Use sparingly and profile on target devices.
      </div>
    </>
  );
}
