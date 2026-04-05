import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visualization Tools — swarming.world',
  description: 'Standalone visualization experiments: GPU graphs, procedural worlds, blockchain network simulations, and creative coding.',
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
