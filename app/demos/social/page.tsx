'use client';

import DemoPageShell from '@/features/Demos/DemoPageShell';
import { DemoGraph } from '@/features/Demos/DemoGraph';
import { SOCIAL_DATASET, generateSocialInteraction } from '@/features/Demos/social-data';

const LEGEND: Record<string, string> = {
  'Like': '#ef4444',
  'Repost': '#22c55e',
  'Follow': '#3b82f6',
  'Reply': '#a855f7',
};

export default function SocialDemoPage() {
  return (
    <DemoPageShell
      title="Social Network"
      description="Real-time social interaction graph"
      audience="Data Scientists"
      color="#a855f7"
    >
      {() => (
        <DemoGraph
          dataset={SOCIAL_DATASET}
          generateParticle={generateSocialInteraction}
          particleInterval={250}
          legend={LEGEND}
        />
      )}
    </DemoPageShell>
  );
}
