import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Web3 Viz Playground',
  description: 'Interactive playground for the @web3viz SDK',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
