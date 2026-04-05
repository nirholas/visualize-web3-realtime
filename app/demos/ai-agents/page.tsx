'use client';

import DemoPageShell from '@/features/Demos/DemoPageShell';
import { DemoGraph } from '@/features/Demos/DemoGraph';
import { AGENT_DATASET, generateAgentTask } from '@/features/Demos/ai-agents-data';

const LEGEND: Record<string, string> = {
  'Research': '#3b82f6',
  'Code': '#22c55e',
  'Review': '#a855f7',
  'Plan': '#eab308',
  'Execute': '#f97316',
};

export default function AgentSwarmDemoPage() {
  return (
    <DemoPageShell
      title="AI Agent Swarm"
      description="Multi-agent task orchestration visualization"
      audience="AI Engineers"
      color="#eab308"
    >
      {() => (
        <DemoGraph
          dataset={AGENT_DATASET}
          generateParticle={generateAgentTask}
          particleInterval={400}
          legend={LEGEND}
        />
      )}
    </DemoPageShell>
  );
}
