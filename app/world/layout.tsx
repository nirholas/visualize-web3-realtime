import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Real-time Network Visualization — Force Directed Graph React',
  description:
    'Interactive 3D force-directed graph visualizing live blockchain activity across Solana, Ethereum, and Base. 5,000+ nodes at 60fps with WebSocket streaming.',
  alternates: { canonical: '/world' },
  openGraph: {
    title: 'Real-time Network Visualization — Swarming',
    description:
      'Watch tokens, traders, and protocols swarm in a live 3D force-directed graph. WebSocket-powered, 60fps.',
    images: [{ url: '/og-preview.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Real-time Network Visualization',
    description: 'Live 3D force-directed graph of blockchain activity. 5,000+ nodes at 60fps.',
  },
};

export default function WorldLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
