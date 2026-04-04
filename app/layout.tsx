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
    images: [
      {
        url: "/og-preview.png",
        width: 1200,
        height: 630,
        alt: "PumpFun World — a living financial network in real time",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Web3 Realtime Visualizer",
    description: "Explore a living, breathing financial network in real time.",
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
        {/* Inline boot loader — masks WebGL compilation with a CSS-only spinner.
            Rendered server-side so it appears instantly before any JS executes.
            The React LoadingScreen component hides this via #boot-loader { display:none }
            once the Canvas is ready. */}
        <style dangerouslySetInnerHTML={{ __html: `
          #boot-loader {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
            background: #0a0a12;
            transition: opacity 300ms ease;
          }
          #boot-loader.hide {
            opacity: 0;
            pointer-events: none;
          }
          #boot-loader .spinner {
            width: 36px;
            height: 36px;
            border: 2px solid #1e293b;
            border-top-color: #60a5fa;
            border-radius: 50%;
            animation: boot-spin 0.8s linear infinite;
          }
          #boot-loader .label {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 10px;
            font-weight: 400;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #555;
          }
          @keyframes boot-spin {
            to { transform: rotate(360deg); }
          }
        `}} />
      </head>
      <body>
        {/* Hardcoded boot loader — visible before React hydrates */}
        <div id="boot-loader">
          <div className="spinner" />
          <span className="label">Initializing</span>
        </div>
        {children}
        {/* Remove boot loader once React has hydrated and painted */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            // Hide the boot loader after a short delay to allow React to paint
            var el = document.getElementById('boot-loader');
            if (!el) return;
            // Listen for the custom event dispatched by LoadingScreen
            window.addEventListener('webgl-ready', function() {
              el.classList.add('hide');
              setTimeout(function() { el.remove(); }, 400);
            });
            // Safety: force-remove after 8s even if event never fires
            setTimeout(function() {
              if (el && el.parentNode) {
                el.classList.add('hide');
                setTimeout(function() { el.remove(); }, 400);
              }
            }, 8000);
          })();
        `}} />
      </body>
    </html>
  );
}
