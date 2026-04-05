import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swarming — Real-time Data Visualization Library for React & Three.js",
  description:
    "GPU-accelerated 3D graph visualization library. Render 5,000+ nodes at 60fps with React, Three.js, and D3-force. Open source alternative to D3, Sigma, and Cytoscape.",
  alternates: { canonical: '/landing' },
  openGraph: {
    title: "Swarming — Real-time Data Visualization",
    description: "GPU-accelerated 3D graph visualization. 5,000+ nodes at 60fps. Open source React component.",
    type: "website",
    images: [{ url: "/og-preview.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Swarming — Real-time Data Visualization Library',
    description: 'GPU-accelerated 3D graph visualization. Open source React + Three.js component.',
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
