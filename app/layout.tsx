import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web3 Realtime Visualizer",
  description: "Real-time 3D visualization of PumpFun token activity",
  openGraph: {
    title: "Web3 Realtime Visualizer",
    description: "Explore a living, breathing financial network in real time.",
    type: "website",
    siteName: "PumpFun World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Web3 Realtime Visualizer",
    description: "Explore a living, breathing financial network in real time.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@200;300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
