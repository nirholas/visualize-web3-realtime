'use client';

import DemoPageShell from '@/features/Demos/DemoPageShell';
import { DemoGraph } from '@/features/Demos/DemoGraph';
import { API_DATASET, generateApiRequest } from '@/features/Demos/api-traffic-data';

const LEGEND: Record<string, string> = {
  '2xx Success': '#22c55e',
  '3xx Redirect': '#eab308',
  '4xx Client Error': '#f97316',
  '5xx Server Error': '#ef4444',
};

export default function ApiTrafficDemoPage() {
  return (
    <DemoPageShell
      title="API Traffic"
      description="Real-time HTTP request flow visualization"
      audience="Backend Engineers"
      color="#f97316"
    >
      {() => (
        <DemoGraph
          dataset={API_DATASET}
          generateParticle={generateApiRequest}
          particleInterval={200}
          legend={LEGEND}
        />
      )}
    </DemoPageShell>
  );
}
