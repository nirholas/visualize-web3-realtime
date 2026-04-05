import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Documentation',
    template: '%s | swarming.docs',
  },
  description: 'swarming SDK documentation — real-time 3D visualization of streaming data.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
