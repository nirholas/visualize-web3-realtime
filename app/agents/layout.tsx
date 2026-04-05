import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Agent Visualization — Monitor Autonomous Agents in Real Time',
  description:
    'Real-time 3D visualization of autonomous AI agents analyzing DeFi protocols, executing tasks, and generating STARK proofs. Force-directed graph at 60fps.',
  alternates: { canonical: '/agents' },
  openGraph: {
    title: 'AI Agent Visualization — Swarming',
    description:
      'Watch AI agents autonomously analyze, trade, and verify across DeFi protocols in a live 3D force graph.',
    images: [{ url: '/og-preview.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Visualization',
    description: 'Monitor autonomous AI agents in real-time 3D force-directed graphs.',
  },
};

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
