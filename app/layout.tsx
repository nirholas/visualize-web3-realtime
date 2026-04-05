import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL('https://swarming.world'),
  title: "swarming.world",
  description: "Real-time 3D visualization of streaming data — blockchain, AI agents, and beyond.",
  openGraph: {
    title: "swarming.world",
    description: "Explore a living, breathing network in real time.",
    type: "website",
    siteName: "swarming.world",
    images: [
      {
        url: "/og-preview.png",
        width: 1200,
        height: 630,
        alt: "swarming.world — a living network in real time",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "swarming.world",
    description: "Explore a living, breathing network in real time.",
    images: ["/og-preview.png"],
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
      <body>
        {children}
      </body>
    </html>
  );
}
