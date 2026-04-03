import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web3 Realtime Visualizer",
  description: "Real-time 3D visualization of PumpFun token activity",
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
