# Web3 Realtime Visualizer

Real-time 3D visualization of PumpFun token activity on Solana.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3100/world](http://localhost:3100/world) to see the live visualizer.

## What it does

- Connects to PumpFun WebSocket (`wss://pumpportal.fun/api/data`)
- Subscribes to new token creates and all trades
- Renders a 3D particle network using Three.js / React Three Fiber
- Shows live trade feed with animated cards

## Stack

- Next.js 14 + React 18
- Three.js + @react-three/fiber + @react-three/drei
- Framer Motion
- Tailwind CSS
