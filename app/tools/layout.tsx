import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visualization Tools — GPU Graphs, WebGL Experiments & Network Simulations',
  description:
    'Standalone visualization experiments: GPU-accelerated graphs, Three.js network graphs, blockchain simulations, procedural 3D worlds, and creative WebGL coding.',
  alternates: { canonical: '/tools' },
  openGraph: {
    title: 'Visualization Tools — Swarming',
    description: 'GPU graphs, Three.js network visualization, blockchain simulations, and creative WebGL experiments.',
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
