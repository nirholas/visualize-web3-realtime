import lzString from 'lz-string';

export interface PlaygroundState {
  code: string;
  preset: string;
  controls: ControlValues;
}

export interface ControlValues {
  maxNodes: number;
  chargeStrength: number;
  linkDistance: number;
  centerPull: number;
  bloom: boolean;
  background: string;
}

export const defaultControls: ControlValues = {
  maxNodes: 5000,
  chargeStrength: -200,
  linkDistance: 25,
  centerPull: 0.03,
  bloom: false,
  background: '#0a0a12',
};

export function encodeState(state: PlaygroundState): string {
  const json = JSON.stringify(state);
  return lzString.compressToEncodedURIComponent(json);
}

export function decodeState(hash: string): PlaygroundState | null {
  try {
    const json = lzString.decompressFromEncodedURIComponent(hash);
    if (!json) return null;
    return JSON.parse(json) as PlaygroundState;
  } catch {
    return null;
  }
}

export function buildShareUrl(state: PlaygroundState): string {
  const encoded = encodeState(state);
  return `${window.location.origin}/playground#${encoded}`;
}

export function readStateFromUrl(): PlaygroundState | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  return decodeState(hash);
}

export function generateStandaloneHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Swarming Visualization</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { width: 100%; height: 100%; background: #0a0a12; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // This is a standalone export from swarming.world playground
    // To run: npm create vite@latest my-viz -- --template react-ts
    // Then: npm install @web3viz/react-graph @web3viz/core
    // Copy this code into src/App.tsx
    console.log("Standalone HTML export — see source for setup instructions");
  </script>
  <pre style="color:#94a3b8;padding:2rem;font-family:monospace;font-size:14px;white-space:pre-wrap;">
Swarming Visualization — Standalone Export

To run this visualization:

1. Create a new project:
   npm create vite@latest my-viz -- --template react-ts

2. Install dependencies:
   cd my-viz
   npm install @web3viz/react-graph @web3viz/core @react-three/fiber @react-three/drei three

3. Replace src/App.tsx with:

${code}

4. Start the dev server:
   npm run dev
  </pre>
</body>
</html>`;
}
