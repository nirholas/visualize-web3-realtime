import type { DemoHub, DemoParticle, DemoDataset } from './useDemoSimulation';

// ---------------------------------------------------------------------------
// Social Network Graph — mock data
// Hub nodes = top accounts, Particle nodes = interactions
// ---------------------------------------------------------------------------

const INTERACTION_TYPES = ['like', 'repost', 'follow', 'reply'] as const;

export const SOCIAL_HUBS: DemoHub[] = [
  { id: 'acc_vitalik', label: 'vitalik', name: 'Vitalik Buterin', group: 'tech', weight: 520, metric: 3200, unit: 'interactions', source: 'social' },
  { id: 'acc_elonmusk', label: 'elon', name: 'Elon Musk', group: 'tech', weight: 890, metric: 8400, unit: 'interactions', source: 'social' },
  { id: 'acc_naval', label: 'naval', name: 'Naval Ravikant', group: 'vc', weight: 340, metric: 1800, unit: 'interactions', source: 'social' },
  { id: 'acc_pmarca', label: 'pmarca', name: 'Marc Andreessen', group: 'vc', weight: 280, metric: 1400, unit: 'interactions', source: 'social' },
  { id: 'acc_karpathy', label: 'karpathy', name: 'Andrej Karpathy', group: 'ai', weight: 420, metric: 2600, unit: 'interactions', source: 'social' },
  { id: 'acc_sama', label: 'sama', name: 'Sam Altman', group: 'ai', weight: 380, metric: 2200, unit: 'interactions', source: 'social' },
  { id: 'acc_dwr', label: 'dwr', name: 'Dan Romero', group: 'social', weight: 160, metric: 900, unit: 'interactions', source: 'social' },
  { id: 'acc_balajis', label: 'balajis', name: 'Balaji Srinivasan', group: 'tech', weight: 240, metric: 1200, unit: 'interactions', source: 'social' },
];

function generateBaseInteractions(): DemoParticle[] {
  const particles: DemoParticle[] = [];
  const users = Array.from({ length: 20 }, (_, i) => `user_${i}`);

  const connections: [number, number[], number][] = [
    [0, [0, 1], 0], [1, [1, 4], 1], [2, [0, 2], 2], [3, [3, 5], 0],
    [4, [4, 5], 1], [5, [2, 6], 3], [6, [1, 3], 2], [7, [6, 7], 0],
    [8, [0, 7], 1], [9, [5, 6], 3], [10, [1, 2], 0], [11, [3, 4], 2],
    [12, [0, 5], 1], [13, [7, 1], 3], [14, [2, 4], 0], [15, [6, 3], 1],
    [16, [5, 7], 2], [17, [0, 4], 3], [18, [1, 6], 0], [19, [3, 7], 2],
  ];

  for (const [userIdx, accIndices, typeIdx] of connections) {
    const interaction = INTERACTION_TYPES[typeIdx % INTERACTION_TYPES.length];
    for (const accIdx of accIndices) {
      particles.push({
        id: `${users[userIdx]}_${SOCIAL_HUBS[accIdx].id}_${interaction}`,
        hubIds: [SOCIAL_HUBS[accIdx].id],
        group: interaction,
        weight: 1 + Math.floor(Math.random() * 4),
        metric: Math.random() * 8,
        source: 'social',
      });
    }
  }
  return particles;
}

export const SOCIAL_DATASET: DemoDataset = {
  hubs: SOCIAL_HUBS,
  particles: generateBaseInteractions(),
};

let interactionCounter = 0;
export function generateSocialInteraction(hubs: DemoHub[]): DemoParticle {
  interactionCounter++;
  const hub = hubs[Math.floor(Math.random() * hubs.length)];
  const interaction = INTERACTION_TYPES[Math.floor(Math.random() * INTERACTION_TYPES.length)];
  return {
    id: `social_live_${interactionCounter}`,
    hubIds: [hub.id],
    group: interaction,
    weight: 1 + Math.floor(Math.random() * 3),
    metric: Math.random() * 5,
    source: 'social',
  };
}
