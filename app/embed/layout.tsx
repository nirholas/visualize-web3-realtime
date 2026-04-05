import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Embed — swarming.world',
  description: 'Embeddable real-time blockchain visualization widget.',
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      {children}
    </div>
  );
}
