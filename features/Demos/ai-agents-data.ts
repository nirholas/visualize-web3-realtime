import type { DemoHub, DemoParticle, DemoDataset } from './useDemoSimulation';

// ---------------------------------------------------------------------------
// AI Agent Swarm — mock data
// Hub nodes = agent types, Particle nodes = tasks/messages
// ---------------------------------------------------------------------------

const TASK_TYPES = ['research', 'code', 'review', 'plan', 'execute'] as const;

export const AGENT_HUBS: DemoHub[] = [
  { id: 'agent_planner', label: 'Planner', name: 'Planning Agent', group: 'orchestrator', weight: 45, metric: 120, unit: 'tasks', source: 'agents' },
  { id: 'agent_researcher', label: 'Researcher', name: 'Research Agent', group: 'knowledge', weight: 82, metric: 240, unit: 'tasks', source: 'agents' },
  { id: 'agent_coder', label: 'Coder', name: 'Coding Agent', group: 'builder', weight: 98, metric: 310, unit: 'tasks', source: 'agents' },
  { id: 'agent_reviewer', label: 'Reviewer', name: 'Code Review Agent', group: 'quality', weight: 64, metric: 180, unit: 'tasks', source: 'agents' },
  { id: 'agent_tester', label: 'Tester', name: 'Test Agent', group: 'quality', weight: 56, metric: 160, unit: 'tasks', source: 'agents' },
  { id: 'agent_deployer', label: 'Deployer', name: 'Deployment Agent', group: 'ops', weight: 28, metric: 80, unit: 'tasks', source: 'agents' },
  { id: 'agent_monitor', label: 'Monitor', name: 'Monitoring Agent', group: 'ops', weight: 120, metric: 400, unit: 'tasks', source: 'agents' },
  { id: 'agent_writer', label: 'Writer', name: 'Documentation Agent', group: 'knowledge', weight: 38, metric: 100, unit: 'tasks', source: 'agents' },
];

function generateBaseTasks(): DemoParticle[] {
  const particles: DemoParticle[] = [];
  // Agent-to-agent communication patterns
  const flows: [number, number[], number][] = [
    // Planner delegates to researcher & coder
    [0, [0, 1], 3], [1, [0, 2], 0], [2, [0, 3], 3],
    // Researcher feeds coder & writer
    [3, [1, 2], 0], [4, [1, 7], 0],
    // Coder sends to reviewer & tester
    [5, [2, 3], 1], [6, [2, 4], 1],
    // Reviewer loops back to coder
    [7, [3, 2], 2],
    // Tester reports to monitor
    [8, [4, 6], 4],
    // Deployer + monitor loop
    [9, [5, 6], 4], [10, [6, 0], 3],
    // Cross-cutting flows
    [11, [1, 4], 0], [12, [3, 7], 2], [13, [5, 2], 1], [14, [7, 0], 3],
  ];

  for (const [idx, hubIndices, typeIdx] of flows) {
    const taskType = TASK_TYPES[typeIdx % TASK_TYPES.length];
    for (let i = 0; i < 3; i++) {
      particles.push({
        id: `task_${idx}_${i}`,
        hubIds: hubIndices.map((h) => AGENT_HUBS[h].id),
        group: taskType,
        weight: 1 + Math.floor(Math.random() * 3),
        metric: 1 + Math.random() * 10, // complexity
        source: 'agents',
      });
    }
  }
  return particles;
}

export const AGENT_DATASET: DemoDataset = {
  hubs: AGENT_HUBS,
  particles: generateBaseTasks(),
};

let taskCounter = 0;
export function generateAgentTask(hubs: DemoHub[]): DemoParticle {
  taskCounter++;
  // Pick two random agents for inter-agent communication
  const fromIdx = Math.floor(Math.random() * hubs.length);
  let toIdx = Math.floor(Math.random() * hubs.length);
  if (toIdx === fromIdx) toIdx = (toIdx + 1) % hubs.length;
  const taskType = TASK_TYPES[Math.floor(Math.random() * TASK_TYPES.length)];
  return {
    id: `agent_live_${taskCounter}`,
    hubIds: [hubs[fromIdx].id, hubs[toIdx].id],
    group: taskType,
    weight: 1 + Math.floor(Math.random() * 3),
    metric: 1 + Math.random() * 10,
    source: 'agents',
  };
}
