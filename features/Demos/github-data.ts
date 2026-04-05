import type { DemoHub, DemoParticle, DemoDataset } from './useDemoSimulation';

// ---------------------------------------------------------------------------
// GitHub Activity Visualizer — mock data
// Hub nodes = repositories, Particle nodes = events
// ---------------------------------------------------------------------------

const EVENT_TYPES = ['push', 'pr', 'issue', 'star', 'fork'] as const;
type EventType = (typeof EVENT_TYPES)[number];

const EVENT_GROUPS: Record<EventType, string> = {
  push: 'push',
  pr: 'pr',
  issue: 'issue',
  star: 'star',
  fork: 'fork',
};

export const GITHUB_HUBS: DemoHub[] = [
  { id: 'repo_react', label: 'React', name: 'facebook/react', group: 'typescript', weight: 240, metric: 1200, unit: 'events', source: 'github' },
  { id: 'repo_next', label: 'Next.js', name: 'vercel/next.js', group: 'typescript', weight: 185, metric: 980, unit: 'events', source: 'github' },
  { id: 'repo_rust', label: 'Rust', name: 'rust-lang/rust', group: 'rust', weight: 162, metric: 870, unit: 'events', source: 'github' },
  { id: 'repo_linux', label: 'Linux', name: 'torvalds/linux', group: 'c', weight: 310, metric: 1500, unit: 'events', source: 'github' },
  { id: 'repo_vscode', label: 'VS Code', name: 'microsoft/vscode', group: 'typescript', weight: 198, metric: 1050, unit: 'events', source: 'github' },
  { id: 'repo_pytorch', label: 'PyTorch', name: 'pytorch/pytorch', group: 'python', weight: 145, metric: 720, unit: 'events', source: 'github' },
  { id: 'repo_deno', label: 'Deno', name: 'denoland/deno', group: 'rust', weight: 88, metric: 420, unit: 'events', source: 'github' },
  { id: 'repo_svelte', label: 'Svelte', name: 'sveltejs/svelte', group: 'typescript', weight: 72, metric: 340, unit: 'events', source: 'github' },
];

function generateBaseParticles(): DemoParticle[] {
  const particles: DemoParticle[] = [];
  const developers = [
    'dev_alice', 'dev_bob', 'dev_carol', 'dev_dan', 'dev_eve',
    'dev_frank', 'dev_grace', 'dev_hank', 'dev_iris', 'dev_jack',
    'dev_kate', 'dev_leon', 'dev_maya', 'dev_noah', 'dev_olga',
  ];

  const connections: [number, number[]][] = [
    [0, [0, 1]], [1, [0, 4]], [2, [1, 7]], [3, [2, 6]],
    [4, [3, 2]], [5, [5, 4]], [6, [0, 5]], [7, [1, 3]],
    [8, [6, 7]], [9, [4, 5]], [10, [0, 2]], [11, [3, 6]],
    [12, [1, 5]], [13, [2, 7]], [14, [4, 6]],
  ];

  for (const [devIdx, repoIndices] of connections) {
    const eventType = EVENT_TYPES[devIdx % EVENT_TYPES.length];
    for (const repoIdx of repoIndices) {
      particles.push({
        id: `${developers[devIdx]}_${GITHUB_HUBS[repoIdx].id}_${eventType}`,
        hubIds: [GITHUB_HUBS[repoIdx].id],
        group: EVENT_GROUPS[eventType],
        weight: 1 + Math.floor(Math.random() * 5),
        metric: Math.random() * 10,
        source: 'github',
      });
    }
  }
  return particles;
}

export const GITHUB_DATASET: DemoDataset = {
  hubs: GITHUB_HUBS,
  particles: generateBaseParticles(),
};

let particleCounter = 0;
export function generateGitHubParticle(hubs: DemoHub[]): DemoParticle {
  particleCounter++;
  const hub = hubs[Math.floor(Math.random() * hubs.length)];
  const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
  return {
    id: `gh_live_${particleCounter}`,
    hubIds: [hub.id],
    group: EVENT_GROUPS[eventType],
    weight: 1 + Math.floor(Math.random() * 3),
    metric: Math.random() * 5,
    source: 'github',
  };
}
