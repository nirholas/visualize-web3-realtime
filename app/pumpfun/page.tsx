import dynamic from 'next/dynamic';

// Dynamically import the graph with SSR strictly disabled
const PumpFunGraph = dynamic(() => import('@/components/PumpFunGraph'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen bg-[#050505] flex items-center justify-center text-white/60 font-mono text-sm">
      Loading WebGL Engine...
    </div>
  ),
});

export default function PumpFunPage() {
  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#050505]">
      <PumpFunGraph />
    </main>
  );
}
