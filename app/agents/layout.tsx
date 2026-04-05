import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Agents — swarming.world',
  description:
    'Monitor autonomous AI agents analyzing DeFi protocols, executing tasks, and generating STARK proofs in real time.',
  openGraph: {
    title: 'AI Agents — swarming.world',
    description: 'Watch AI agents autonomously analyze, trade, and verify across DeFi protocols.',
    images: [{ url: '/og-preview.png', width: 1200, height: 630 }],
  },
};

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
