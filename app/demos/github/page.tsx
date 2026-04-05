'use client';

import DemoPageShell from '@/features/Demos/DemoPageShell';
import { DemoGraph } from '@/features/Demos/DemoGraph';
import { GITHUB_DATASET, generateGitHubParticle } from '@/features/Demos/github-data';

const LEGEND: Record<string, string> = {
  'Push': '#22c55e',
  'Pull Request': '#a855f7',
  'Issue': '#eab308',
  'Star': '#3b82f6',
  'Fork': '#f97316',
};

export default function GitHubDemoPage() {
  return (
    <DemoPageShell
      title="GitHub Activity"
      description="Real-time repository event visualization"
      audience="Developers"
      color="#22c55e"
    >
      {() => (
        <DemoGraph
          dataset={GITHUB_DATASET}
          generateParticle={generateGitHubParticle}
          particleInterval={300}
          legend={LEGEND}
        />
      )}
    </DemoPageShell>
  );
}
