/**
 * Editorial text content for the landing page.
 */

export const HEADLINE_TEXT = 'SEE THE BLOCKCHAIN BREATHE'

export const BODY_TEXT = `Blockchains produce millions of events every day. Token launches, swaps, liquidity flows, agent trades, whale movements — all reduced to rows in a database or numbers on a dashboard. The most dynamic financial system ever built, rendered as static text. What if you could actually see it?

This is not a dashboard. This is a living, breathing network. Every node is a token or a trader. Every connection is capital flowing between them. The graph grows, contracts, and reorganizes in real time as the blockchain itself evolves — thousands of nodes rendered at sixty frames per second in a three-dimensional force-directed simulation.

Watch a new token launch on PumpFun and see its node bloom into existence, attracting traders like gravity. See clusters form as communities coalesce around shared positions. Watch liquidity migrate across protocols as yields shift. The patterns that are invisible in spreadsheets become unmistakable when the data breathes.

The engine processes real-time WebSocket streams from Solana, Ethereum, Base, and centralized exchanges. Every swap, every transfer, every agent execution is projected into the graph the moment it happens. No polling. No refresh buttons. The network is always live.

An operating system for exploration sits on top. Draggable windows for filters, live event feeds, animated statistics, AI-powered chat, timeline scrubbing, and one-click sharing. Power without complexity — a desktop metaphor for navigating the most complex financial network on earth.

Search for any address and watch the graph reorganize around it. Toggle data sources on and off. Scrub backward through time. Ask the AI what happened. Screenshot and share. Embed it in your own site. The visualization is not just something to look at — it is an instrument for understanding.

Every trader. Every token. Every second. The network is live.`

export const PULLQUOTE_TEXTS = [
  '5,000 NODES. 60 FRAMES PER SECOND. ZERO LATENCY.',
  'NOT A DASHBOARD. A LIVING NETWORK.',
]

export type PullquotePlacement = {
  colIdx: number
  yFrac: number
  wFrac: number
  side: 'left' | 'right'
}

export const PULLQUOTE_PLACEMENTS: PullquotePlacement[] = [
  { colIdx: 2, yFrac: 0.05, wFrac: 0.65, side: 'right' },
  { colIdx: 2, yFrac: 0.18, wFrac: 0.65, side: 'right' },
]
