import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Performance Benchmarks — Swarming',
  description:
    'Reproducible performance benchmarks comparing swarming against d3-force, Sigma.js, Cytoscape.js, vis-network, force-graph, and ngraph. Real FPS at 500-20k nodes.',
  alternates: { canonical: '/benchmarks' },
};

export default function BenchmarksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
