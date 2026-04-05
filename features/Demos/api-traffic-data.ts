import type { DemoHub, DemoParticle, DemoDataset } from './useDemoSimulation';

// ---------------------------------------------------------------------------
// API Traffic Monitor — mock data
// Hub nodes = API endpoints, Particle nodes = requests
// ---------------------------------------------------------------------------

const STATUS_GROUPS = ['2xx', '3xx', '4xx', '5xx'] as const;

export const API_HUBS: DemoHub[] = [
  { id: 'ep_users', label: '/api/users', name: 'User Service', group: 'core', weight: 340, metric: 1800, unit: 'req/min', source: 'api' },
  { id: 'ep_auth', label: '/api/auth', name: 'Auth Service', group: 'core', weight: 520, metric: 2400, unit: 'req/min', source: 'api' },
  { id: 'ep_products', label: '/api/products', name: 'Product Catalog', group: 'commerce', weight: 280, metric: 1200, unit: 'req/min', source: 'api' },
  { id: 'ep_orders', label: '/api/orders', name: 'Order Service', group: 'commerce', weight: 190, metric: 800, unit: 'req/min', source: 'api' },
  { id: 'ep_search', label: '/api/search', name: 'Search Service', group: 'query', weight: 420, metric: 2100, unit: 'req/min', source: 'api' },
  { id: 'ep_webhooks', label: '/api/webhooks', name: 'Webhook Handler', group: 'integration', weight: 85, metric: 340, unit: 'req/min', source: 'api' },
  { id: 'ep_analytics', label: '/api/analytics', name: 'Analytics Ingest', group: 'data', weight: 610, metric: 3200, unit: 'req/min', source: 'api' },
  { id: 'ep_health', label: '/api/health', name: 'Health Check', group: 'infra', weight: 1200, metric: 6000, unit: 'req/min', source: 'api' },
];

function generateBaseRequests(): DemoParticle[] {
  const particles: DemoParticle[] = [];
  const clients = Array.from({ length: 16 }, (_, i) => `client_${i}`);

  const connections: [number, number[]][] = [
    [0, [0, 1]], [1, [1, 2]], [2, [2, 3]], [3, [0, 4]],
    [4, [4, 6]], [5, [1, 5]], [6, [3, 5]], [7, [6, 7]],
    [8, [0, 7]], [9, [2, 4]], [10, [1, 6]], [11, [3, 7]],
    [12, [5, 6]], [13, [0, 3]], [14, [4, 7]], [15, [1, 2]],
  ];

  for (const [clientIdx, epIndices] of connections) {
    // Most requests are 2xx
    const statusRoll = Math.random();
    const status = statusRoll < 0.8 ? '2xx' : statusRoll < 0.9 ? '3xx' : statusRoll < 0.97 ? '4xx' : '5xx';
    for (const epIdx of epIndices) {
      particles.push({
        id: `${clients[clientIdx]}_${API_HUBS[epIdx].id}_${status}`,
        hubIds: [API_HUBS[epIdx].id],
        group: status,
        weight: 1 + Math.floor(Math.random() * 10),
        metric: 10 + Math.random() * 500, // response time ms
        source: 'api',
      });
    }
  }
  return particles;
}

export const API_DATASET: DemoDataset = {
  hubs: API_HUBS,
  particles: generateBaseRequests(),
};

let requestCounter = 0;
export function generateApiRequest(hubs: DemoHub[]): DemoParticle {
  requestCounter++;
  const hub = hubs[Math.floor(Math.random() * hubs.length)];
  const roll = Math.random();
  const status = roll < 0.78 ? '2xx' : roll < 0.88 ? '3xx' : roll < 0.96 ? '4xx' : '5xx';
  return {
    id: `api_live_${requestCounter}`,
    hubIds: [hub.id],
    group: status,
    weight: 1 + Math.floor(Math.random() * 5),
    metric: 10 + Math.random() * (status === '5xx' ? 2000 : 300),
    source: 'api',
  };
}
