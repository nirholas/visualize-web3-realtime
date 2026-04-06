/**
 * Editorial text content for the landing page.
 */

export const HEADLINE_TEXT = 'SEE YOUR DATA SWARM'

export const BODY_TEXT = `Your systems produce millions of events every day. Network requests, agent orchestrations, sensor readings, trading signals, social interactions — all reduced to rows in a database or numbers on a dashboard. The most dynamic systems ever built, rendered as static text. What if you could actually see them?

This is not a dashboard. This is a living, breathing network. Every node is an entity in your data. Every connection is a relationship between them. The graph grows, contracts, and reorganizes in real time as your data evolves — thousands of nodes rendered at sixty frames per second in a three-dimensional force-directed simulation.

Connect any streaming data source and watch nodes bloom into existence, attracting related entities like gravity. See clusters form as communities emerge around shared connections. Watch traffic migrate across services as load shifts. The patterns that are invisible in spreadsheets become unmistakable when the data breathes.

The engine processes real-time WebSocket streams, REST APIs, and custom data providers. Every event is projected into the graph the moment it happens. No polling. No refresh buttons. The network is always live.

An operating system for exploration sits on top. Draggable windows for filters, live event feeds, animated statistics, AI-powered chat, timeline scrubbing, and one-click sharing. Power without complexity — a desktop metaphor for navigating complex networks.

Search for any entity and watch the graph reorganize around it. Toggle data sources on and off. Scrub backward through time. Ask the AI what happened. Screenshot and share. Embed it in your own site. The visualization is not just something to look at — it is an instrument for understanding.

Every node. Every edge. Every second. The network is live.`

export const PULLQUOTE_TEXTS: string[] = []

export type PullquotePlacement = {
  colIdx: number
  yFrac: number
  wFrac: number
  side: 'left' | 'right'
}

export const PULLQUOTE_PLACEMENTS: PullquotePlacement[] = []
