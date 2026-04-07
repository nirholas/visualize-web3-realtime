'use client';

import { usePumpFunSocket } from './usePumpFunSocket';

export default function PumpFunPage() {
  const { graphData, connected } = usePumpFunSocket();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#050505]">
      {/* Connection status badge */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            connected ? 'bg-green-400' : 'bg-red-500'
          }`}
        />
        {connected ? 'Live' : 'Connecting…'}
      </div>

      {/* Node / link count (dev HUD) */}
      <div className="absolute right-4 top-4 z-10 rounded-full bg-black/60 px-3 py-1.5 text-xs tabular-nums text-white/50 backdrop-blur">
        {graphData.nodes.length} nodes · {graphData.links.length} links
      </div>

      {/* 3D canvas placeholder — Epic 2 will mount the force graph here */}
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-white/20">
          3D canvas will render here
        </p>
      </div>
    </div>
  );
}
