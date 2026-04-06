'use client'

import { PopOutElement } from './PopOutElement'

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {/* Radial glow behind headline */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <PopOutElement delay={0.1} from="bottom" distance={40}>
        <h1 className="relative z-10 max-w-4xl text-5xl font-semibold leading-tight tracking-tight text-white sm:text-7xl">
          See your data{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            swarm.
          </span>
        </h1>
      </PopOutElement>

      <PopOutElement delay={0.3} from="bottom" distance={30}>
        <p className="relative z-10 mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
          Real-time multi-chain transaction visualizer. Watch Pump.fun, Raydium,
          and Uniswap trades as physics-based particle nodes on a dark canvas.
        </p>
      </PopOutElement>

      <PopOutElement delay={0.55} from="bottom" distance={20}>
        <div className="relative z-10 mt-10 flex items-center gap-4">
          <a
            href="https://github.com/nirholas/visualize-web3-realtime"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:scale-105"
          >
            View GitHub
          </a>
          <a
            href="/docs"
            className="rounded-lg border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            Read Docs
          </a>
        </div>
      </PopOutElement>

      {/* Scroll indicator */}
      <PopOutElement delay={1} from="bottom" distance={10} fromScale={0.9}>
        <div className="absolute bottom-10 flex flex-col items-center gap-2 text-slate-600">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <svg
            className="h-5 w-5 animate-bounce"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
          </svg>
        </div>
      </PopOutElement>
    </section>
  )
}
