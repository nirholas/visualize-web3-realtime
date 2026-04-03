import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web3 Realtime Visualizer",
  description: "Real-time 3D visualization of PumpFun token activity",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
