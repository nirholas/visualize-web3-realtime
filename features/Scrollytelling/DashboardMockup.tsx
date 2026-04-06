'use client'

import { type MotionValue, motion, useTransform } from 'framer-motion'

/* ── Dashboard state content ──────────────────────────────────────────────── */

function StateData() {
  return (
    <div className="flex h-full flex-col gap-3 p-5 font-mono text-xs">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
        <span className="text-green-400">ws://connected</span>
        <span className="ml-auto text-slate-600">ping 12ms</span>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        {[
          '{"type":"swap","dex":"pump.fun","token":"$SWARMAI","amount":2.4,"sol":0.012}',
          '{"type":"swap","dex":"raydium","pair":"SOL/USDC","amount":148.2,"price":172.44}',
          '{"type":"liquidity","dex":"uniswap","pool":"ETH/USDT","tvl":"$2.1M"}',
          '{"type":"swap","dex":"pump.fun","token":"$PEPE2","amount":50000,"sol":0.8}',
          '{"type":"swap","dex":"raydium","pair":"JUP/SOL","amount":320,"price":0.89}',
          '{"type":"trade","dex":"uniswap","pair":"WBTC/ETH","size":"0.5 BTC"}',
        ].map((line, i) => (
          <div
            key={i}
            className="truncate rounded bg-slate-800/60 px-3 py-1.5 text-slate-400"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            {line}
          </div>
        ))}
      </div>
      <div className="border-t border-slate-800 pt-2 text-slate-600">
        384 events/sec &middot; 3 providers active
      </div>
    </div>
  )
}

function StatePhysics() {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden">
      {/* Simulated particle field */}
      <div className="absolute inset-0">
        {Array.from({ length: 30 }, (_, i) => {
          const x = 10 + Math.random() * 80
          const y = 10 + Math.random() * 80
          const size = 4 + Math.random() * 8
          const hue = 230 + Math.random() * 60
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                background: `hsl(${hue}, 70%, 65%)`,
                boxShadow: `0 0 ${size * 2}px hsl(${hue}, 70%, 50%)`,
                opacity: 0.6 + Math.random() * 0.4,
                animation: `float ${2 + Math.random() * 3}s ease-in-out infinite alternate`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          )
        })}
      </div>
      {/* Connection lines */}
      <svg className="absolute inset-0 h-full w-full opacity-20">
        {Array.from({ length: 15 }, (_, i) => (
          <line
            key={i}
            x1={`${10 + Math.random() * 80}%`}
            y1={`${10 + Math.random() * 80}%`}
            x2={`${10 + Math.random() * 80}%`}
            y2={`${10 + Math.random() * 80}%`}
            stroke="#6366f1"
            strokeWidth={0.5}
          />
        ))}
      </svg>
      {/* Center stat */}
      <div className="relative z-10 text-center">
        <div className="text-5xl font-bold text-white">60 fps</div>
        <div className="mt-1 text-sm text-slate-500">5,000+ nodes</div>
      </div>
    </div>
  )
}

function StateInteractivity() {
  return (
    <div className="relative flex h-full items-center justify-center">
      {/* Simulated node with hover state */}
      <div className="relative">
        {/* Ripple rings */}
        <div className="absolute -inset-8 animate-ping rounded-full border border-indigo-500/20" />
        <div
          className="absolute -inset-16 rounded-full border border-indigo-500/10"
          style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s' }}
        />

        {/* Central node */}
        <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_40px_rgba(99,102,241,0.5)]" />

        {/* Fake cursor */}
        <svg
          className="absolute -bottom-2 -right-2"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="white"
        >
          <path d="M5 3l14 8-6.5 2L9 19.5z" />
        </svg>

        {/* Tooltip */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm">
          <div className="font-medium text-white">$SWARMAI</div>
          <div className="text-xs text-slate-400">Vol: $240K &middot; Pump.fun</div>
          {/* Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-slate-700 bg-slate-900" />
        </div>
      </div>
    </div>
  )
}

/* ── Main Dashboard Component ─────────────────────────────────────────────── */

interface DashboardMockupProps {
  scrollProgress: MotionValue<number>
}

export function DashboardMockup({ scrollProgress }: DashboardMockupProps) {
  // Map scroll 0-1 to active state index (0, 1, 2)
  const stateIndex = useTransform(scrollProgress, [0, 0.33, 0.34, 0.66, 0.67, 1], [0, 0, 1, 1, 2, 2])

  return (
    <div className="relative mx-auto aspect-[16/10] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/80 shadow-2xl shadow-indigo-500/5 backdrop-blur-xl">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-slate-800/60 px-4 py-2.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
        <span className="ml-3 font-mono text-[10px] uppercase tracking-wider text-slate-600">
          swarming engine
        </span>
      </div>

      {/* Content area — crossfade between states */}
      <div className="relative h-[calc(100%-36px)]">
        <motion.div
          className="absolute inset-0"
          style={{ opacity: useTransform(stateIndex, (v) => (v < 0.5 ? 1 : 0)) }}
        >
          <StateData />
        </motion.div>
        <motion.div
          className="absolute inset-0"
          style={{ opacity: useTransform(stateIndex, (v) => (v >= 0.5 && v < 1.5 ? 1 : 0)) }}
        >
          <StatePhysics />
        </motion.div>
        <motion.div
          className="absolute inset-0"
          style={{ opacity: useTransform(stateIndex, (v) => (v >= 1.5 ? 1 : 0)) }}
        >
          <StateInteractivity />
        </motion.div>
      </div>
    </div>
  )
}
