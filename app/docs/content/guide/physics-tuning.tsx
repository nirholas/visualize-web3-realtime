import { CodeBlock } from '../../components/CodeBlock';
import { APITable } from '../../components/APITable';

export default function PhysicsTuningPage() {
  return (
    <>
      <h1>Physics Tuning</h1>
      <p className="docs-lead">
        Fine-tune the d3-force simulation to get the perfect layout for your data.
      </p>

      <h2 id="simulation-config">Simulation configuration</h2>
      <CodeBlock
        language="tsx"
        code={`<ForceGraph
  nodes={nodes}
  edges={edges}
  simulationConfig={{
    alphaDecay: 0.01,       // How fast the simulation cools
    velocityDecay: 0.3,     // Friction — lower = more movement
    chargeStrength: -30,    // Node repulsion strength
    linkDistance: 50,        // Target distance between linked nodes
    centerStrength: 0.05,   // Pull toward center
  }}
/>`}
      />

      <h2 id="parameters">Parameters</h2>
      <APITable
        properties={[
          { name: 'alphaDecay', type: 'number', default: '0.0228', description: 'Rate at which the simulation cools. Lower = longer animation.' },
          { name: 'velocityDecay', type: 'number', default: '0.4', description: 'Friction. Lower values = more momentum, slidier feel.' },
          { name: 'chargeStrength', type: 'number', default: '-30', description: 'Repulsive force between all nodes. More negative = more spread.' },
          { name: 'linkDistance', type: 'number', default: '30', description: 'Ideal distance between connected nodes.' },
          { name: 'centerStrength', type: 'number', default: '0.05', description: 'Gravity pulling nodes toward the origin.' },
          { name: 'collisionRadius', type: 'number', default: '5', description: 'Minimum distance between node centers (collision detection).' },
        ]}
      />

      <h2 id="presets">Tuning presets</h2>
      <CodeBlock
        language="tsx"
        code={`// Tight cluster — nodes stay close
const tight = { chargeStrength: -10, linkDistance: 20, centerStrength: 0.1 };

// Expansive — spread out, exploratory
const expansive = { chargeStrength: -80, linkDistance: 100, centerStrength: 0.01 };

// High-energy — continuous motion
const energetic = { alphaDecay: 0.001, velocityDecay: 0.1 };

// Quick settle — fast layout
const settle = { alphaDecay: 0.05, velocityDecay: 0.6 };`}
      />

      <h2 id="spatial-hashing">Spatial hashing</h2>
      <p>
        The simulation uses a <code>SpatialHash</code> for O(1) neighbor lookups,
        which makes collision detection and proximity queries fast even with thousands
        of nodes. This is especially important for mouse repulsion effects.
      </p>

      <div className="docs-callout">
        <strong>Pro tip:</strong> Start with a high <code>alphaDecay</code> (0.05) for
        quick initial layout, then lower it (0.01) once the user starts interacting
        for smooth, continuous motion.
      </div>
    </>
  );
}
