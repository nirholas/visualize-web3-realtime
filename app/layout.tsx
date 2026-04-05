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
        {/* Boot-loader dismissal script — placed in <head> so it runs
            independently of React hydration. The body <script> approach
            doesn't work reliably in Next.js App Router because it gets
            serialized into the RSC payload instead of rendering as inline HTML. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            function dismiss() {
              var el = document.getElementById('boot-loader');
              if (!el || !el.parentNode) return;
              el.classList.add('hide');
              setTimeout(function() { if (el.parentNode) el.remove(); }, 400);
            }
            window.addEventListener('webgl-ready', dismiss);
            // Safety: force-remove after 4s even if React never hydrates
            setTimeout(dismiss, 4000);
          })();
        `}} />
      </head>
      <body>
        {/* Hardcoded boot loader — visible before React hydrates */}
        <div id="boot-loader">
          <div className="spinner" />
          <span className="label">Initializing</span>
        </div>
        {children}
      </body>
    </html>
  );
}
