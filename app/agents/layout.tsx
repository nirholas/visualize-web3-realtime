import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent World — Visualize AI Agents in Real-Time',
  description: 'Watch autonomous AI agents complete tasks, call tools, and coordinate in real-time.',
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
