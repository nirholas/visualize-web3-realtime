import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web3 Realtime Visualizer — See the Blockchain Breathe",
  description:
    "Real-time 3D visualization of tokens, traders, and protocols across Solana, Ethereum, and Base. 5,000 nodes at 60fps.",
  openGraph: {
    title: "Web3 Realtime Visualizer",
    description: "See the blockchain breathe. A living, breathing financial network in real time.",
    type: "website",
    images: [{ url: "/og-preview.png", width: 1200, height: 630 }],
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Immediately dismiss the root boot-loader since this page has no WebGL */}
      <style dangerouslySetInnerHTML={{ __html: `#boot-loader { display: none !important; }` }} />
      {children}
    </>
  );
}
