'use client';

import DemoPageShell from '@/features/Demos/DemoPageShell';
import { DemoGraph } from '@/features/Demos/DemoGraph';
import { K8S_DATASET, generateK8sPod } from '@/features/Demos/kubernetes-data';

const LEGEND: Record<string, string> = {
  'Running': '#22c55e',
  'Pending': '#eab308',
  'Error': '#ef4444',
  'Terminated': '#6b7280',
};

export default function KubernetesDemoPage() {
  return (
    <DemoPageShell
      title="Kubernetes Cluster"
      description="Pod lifecycle and namespace activity monitor"
      audience="DevOps Engineers"
      color="#3b82f6"
    >
      {() => (
        <DemoGraph
          dataset={K8S_DATASET}
          generateParticle={generateK8sPod}
          particleInterval={500}
          legend={LEGEND}
        />
      )}
    </DemoPageShell>
  );
}
