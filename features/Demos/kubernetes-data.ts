import type { DemoHub, DemoParticle, DemoDataset } from './useDemoSimulation';

// ---------------------------------------------------------------------------
// Kubernetes Cluster Monitor — mock data
// Hub nodes = namespaces, Particle nodes = pods
// ---------------------------------------------------------------------------

const POD_STATES = ['running', 'pending', 'error', 'terminated'] as const;

export const K8S_HUBS: DemoHub[] = [
  { id: 'ns_default', label: 'default', name: 'default namespace', group: 'system', weight: 24, metric: 48, unit: 'pods', source: 'k8s' },
  { id: 'ns_production', label: 'production', name: 'production namespace', group: 'prod', weight: 86, metric: 172, unit: 'pods', source: 'k8s' },
  { id: 'ns_staging', label: 'staging', name: 'staging namespace', group: 'staging', weight: 32, metric: 64, unit: 'pods', source: 'k8s' },
  { id: 'ns_monitoring', label: 'monitoring', name: 'monitoring namespace', group: 'infra', weight: 18, metric: 36, unit: 'pods', source: 'k8s' },
  { id: 'ns_ingress', label: 'ingress', name: 'ingress-nginx namespace', group: 'infra', weight: 6, metric: 12, unit: 'pods', source: 'k8s' },
  { id: 'ns_databases', label: 'databases', name: 'databases namespace', group: 'data', weight: 14, metric: 28, unit: 'pods', source: 'k8s' },
  { id: 'ns_ml', label: 'ml-pipeline', name: 'ML pipeline namespace', group: 'compute', weight: 22, metric: 44, unit: 'pods', source: 'k8s' },
  { id: 'ns_cicd', label: 'ci-cd', name: 'CI/CD namespace', group: 'infra', weight: 10, metric: 20, unit: 'pods', source: 'k8s' },
];

function generateBasePods(): DemoParticle[] {
  const pods: DemoParticle[] = [];
  const services = [
    { name: 'api-gateway', ns: [1, 2], replicas: 4 },
    { name: 'auth-service', ns: [1, 2], replicas: 3 },
    { name: 'user-service', ns: [1], replicas: 3 },
    { name: 'order-service', ns: [1], replicas: 2 },
    { name: 'payment-service', ns: [1], replicas: 2 },
    { name: 'prometheus', ns: [3], replicas: 2 },
    { name: 'grafana', ns: [3], replicas: 1 },
    { name: 'nginx-ingress', ns: [4], replicas: 3 },
    { name: 'postgres', ns: [5], replicas: 2 },
    { name: 'redis', ns: [5], replicas: 3 },
    { name: 'ml-trainer', ns: [6], replicas: 4 },
    { name: 'ml-inference', ns: [6], replicas: 3 },
    { name: 'jenkins-agent', ns: [7], replicas: 2 },
    { name: 'argocd', ns: [7], replicas: 1 },
  ];

  for (const svc of services) {
    for (let i = 0; i < svc.replicas; i++) {
      const state = Math.random() > 0.9
        ? (Math.random() > 0.5 ? 'pending' : 'error')
        : 'running';
      for (const nsIdx of svc.ns) {
        pods.push({
          id: `pod_${svc.name}_${nsIdx}_${i}`,
          hubIds: [K8S_HUBS[nsIdx].id],
          group: state,
          weight: 1,
          metric: state === 'running' ? 0.5 + Math.random() * 2 : 0.1,
          source: 'k8s',
        });
      }
    }
  }
  return pods;
}

export const K8S_DATASET: DemoDataset = {
  hubs: K8S_HUBS,
  particles: generateBasePods(),
};

let podCounter = 0;
export function generateK8sPod(hubs: DemoHub[]): DemoParticle {
  podCounter++;
  const hub = hubs[Math.floor(Math.random() * hubs.length)];
  const states: (typeof POD_STATES)[number][] = ['running', 'running', 'running', 'running', 'pending', 'error'];
  const state = states[Math.floor(Math.random() * states.length)];
  return {
    id: `k8s_live_${podCounter}`,
    hubIds: [hub.id],
    group: state,
    weight: 1,
    metric: state === 'running' ? 0.5 + Math.random() * 2 : 0.1,
    source: 'k8s',
  };
}
