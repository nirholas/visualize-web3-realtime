/** Protocol metadata for the landing page visualization */

export interface ProtocolNode {
  id: string
  name: string
  color: string
  radius: number // relative size
  position: [number, number, number]
}

export const PROTOCOLS: ProtocolNode[] = [
  { id: 'morpho', name: 'Morpho', color: '#3d63ff', radius: 1.8, position: [0, 0, 0] },
  { id: 'aave', name: 'Aave', color: '#b6509e', radius: 2.2, position: [3.5, 1.2, -1] },
  { id: 'compound', name: 'Compound', color: '#00d395', radius: 1.5, position: [-3, -0.8, 1.5] },
  { id: 'moonwell', name: 'Moonwell', color: '#2f6bff', radius: 1.2, position: [-1.5, 2.5, -2] },
  { id: 'euler', name: 'Euler', color: '#00b88d', radius: 1.0, position: [2, -2, 2.5] },
  { id: 'fluid', name: 'Fluid', color: '#00b3ff', radius: 1.3, position: [-3.5, 1.8, -1.5] },
  { id: 'uniswap', name: 'Uniswap', color: '#ff007a', radius: 2.0, position: [1, 3, -2.5] },
  { id: 'lido', name: 'Lido', color: '#00a3ff', radius: 1.6, position: [-2, -2.5, -1] },
]

/** Landing page copy for the editorial text overlay */
export const LANDING_COPY = `Welcome to the neural network of Web3. A living, breathing visualization of the decentralized financial system — rendered in real time.

Every node you see represents an autonomous agent or protocol actively managing capital across the open internet. Watch as transactions flow between Aave, Morpho, Compound, and dozens of other protocols. See liquidity move like a pulse through interconnected markets.

This is not a dashboard. This is the financial system made visible. Cross-chain liquidity, agent behaviors, token launches, and DeFi interactions — all mapped in three dimensions without skipping a frame.

Built for researchers, traders, and the curious. Explore protocol relationships, trace whale movements, and discover patterns invisible to traditional interfaces. The engine processes thousands of real-time WebSocket events, projecting them into a force-directed graph that breathes with the rhythm of the blockchain.

Each connection tells a story. Each cluster reveals a community. Each pulse is a transaction that just happened — somewhere on Ethereum, Solana, Base, or Arbitrum. The visualization adapts, grows, and evolves as the network itself does.

Enter the world. Start a data stream. Watch the universe come alive.`

/** Headline text */
export const HEADLINE = 'Visualize the Pulse of Decentralized Finance'
export const SUBHEAD = 'Real-time 3D visualization of AI agents, protocols, and cross-chain liquidity'
