import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'World — swarming.world',
  description:
    'Real-time 3D force-directed graph of blockchain activity across Solana, Ethereum, and Base. 5,000+ nodes at 60fps.',
  openGraph: {
    title: 'World — swarming.world',
    description: 'A living, breathing network. Watch tokens, traders, and protocols swarm in real time.',
    images: [{ url: '/og-preview.png', width: 1200, height: 630 }],
  },
};

export default function WorldLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
