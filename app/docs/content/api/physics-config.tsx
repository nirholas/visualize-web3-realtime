import { APITable } from '../../components/APITable';
import { CodeBlock } from '../../components/CodeBlock';

export default function PhysicsConfigPage() {
  return (
    <>
      <h1>Physics Configuration</h1>
      <p className="docs-lead">
        Complete API reference for the d3-force simulation parameters.
      </p>

      <h2 id="simulation-config">SimulationConfig</h2>
      <APITable
        properties={[
          { name: 'alphaDecay', type: 'number', default: '0.0228', description: 'Rate of cooling. Lower = longer simulation lifetime.' },
          { name: 'alphaMin', type: 'number', default: '0.001', description: 'Minimum alpha. Simulation stops when alpha drops below this.' },
          { name: 'alphaTarget', type: 'number', default: '0', description: 'Target alpha. Set > 0 for continuous motion.' },
          { name: 'velocityDecay', type: 'number', default: '0.4', description: 'Friction. Range: 0 (no friction) to 1 (no movement).' },
          { name: 'chargeStrength', type: 'number', default: '-30', description: 'Many-body force. Negative = repulsion, positive = attraction.' },
          { name: 'chargeDistanceMax', type: 'number', default: 'Infinity', description: 'Max distance for charge force to apply.' },
          { name: 'linkDistance', type: 'number', default: '30', description: 'Target distance between linked nodes.' },
          { name: 'linkStrength', type: 'number', description: 'Override link force strength (auto-computed by default).' },
          { name: 'centerStrength', type: 'number', default: '0.05', description: 'Strength of centering force.' },
          { name: 'collisionRadius', type: 'number', default: '5', description: 'Node collision radius.' },
          { name: 'collisionStrength', type: 'number', default: '0.7', description: 'Collision resolution strength.' },
        ]}
      />

      <h2 id="usage">Usage</h2>
      <CodeBlock
        language="tsx"
        code={`<ForceGraph
  simulationConfig={{
    alphaDecay: 0.01,
    velocityDecay: 0.3,
    chargeStrength: -50,
    linkDistance: 60,
    centerStrength: 0.02,
    collisionRadius: 8,
  }}
/>`}
      />

      <h2 id="force-graph-simulation">ForceGraphSimulation class</h2>
      <p>
        For headless or custom usage, instantiate the simulation directly:
      </p>
      <CodeBlock
        language="typescript"
        code={`import { ForceGraphSimulation } from '@web3viz/core';

const sim = new ForceGraphSimulation(config);

sim.addNode({ id: 'a', x: 0, y: 0, z: 0 });
sim.addEdge({ source: 'a', target: 'b' });
sim.on('tick', (nodes) => { /* update rendering */ });
sim.start();`}
      />
    </>
  );
}
