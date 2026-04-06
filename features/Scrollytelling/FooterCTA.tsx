'use client'

import { PopOutElement } from './PopOutElement'

export function FooterCTA() {
  return (
    <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[400px] rounded-full bg-purple-500/8 blur-[100px]" />
      </div>

      <PopOutElement from="bottom" distance={30}>
        <h2 className="relative z-10 max-w-3xl text-3xl font-semibold text-white sm:text-5xl">
          Build Your Own Provider.
        </h2>
      </PopOutElement>

      <PopOutElement from="bottom" distance={20} delay={0.15}>
        <p className="relative z-10 mt-4 text-lg text-slate-500">
          Open source and ready to deploy.
        </p>
      </PopOutElement>

      <PopOutElement from="bottom" distance={20} delay={0.3}>
        <div className="relative z-10 mt-10 w-full max-w-lg overflow-hidden rounded-xl border border-slate-800 bg-slate-950/90 text-left font-mono text-sm">
          {/* Terminal title bar */}
          <div className="flex items-center gap-2 border-b border-slate-800/60 px-4 py-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
            <span className="ml-2 text-[10px] text-slate-600">terminal</span>
          </div>
          <div className="p-5">
            <div className="text-slate-500">
              <span className="text-green-400">$</span> npm install @swarming/core
            </div>
            <div className="mt-3 text-slate-600">
              added 12 packages in 2.4s
            </div>
            <div className="mt-4 text-slate-500">
              <span className="text-green-400">$</span> npm install @swarming/providers
            </div>
            <div className="mt-3 text-slate-600">
              added 8 packages in 1.8s
            </div>
            <div className="mt-4">
              <span className="animate-pulse text-green-400">$</span>
              <span className="ml-1 animate-pulse text-slate-400">_</span>
            </div>
          </div>
        </div>
      </PopOutElement>

      <PopOutElement from="bottom" distance={15} delay={0.5}>
        <div className="relative z-10 mt-8 flex items-center gap-4">
          <a
            href="https://github.com/nicholasgriffintn/visualize-web3-realtime"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:scale-105"
          >
            Star on GitHub
          </a>
          <a
            href="/docs"
            className="rounded-lg border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            Read the Docs
          </a>
        </div>
      </PopOutElement>

      {/* Bottom branding */}
      <div className="absolute bottom-8 font-mono text-[10px] uppercase tracking-widest text-slate-700">
        swarming &middot; open source &middot; MIT license
      </div>
    </section>
  )
}
