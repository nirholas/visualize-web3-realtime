/** Data source metadata for the landing page visualization */

export interface ProtocolNode {
  id: string
  name: string
  color: string
  radius: number // relative size
  position: [number, number, number]
}

export const PROTOCOLS: ProtocolNode[] = [
  { id: 'api-gateway', name: 'API Gateway', color: '#3d63ff', radius: 1.8, position: [0, 0, 0] },
  { id: 'agents', name: 'AI Agents', color: '#b6509e', radius: 2.2, position: [3.5, 1.2, -1] },
  { id: 'sensors', name: 'IoT Sensors', color: '#00d395', radius: 1.5, position: [-3, -0.8, 1.5] },
  { id: 'social', name: 'Social Graph', color: '#2f6bff', radius: 1.2, position: [-1.5, 2.5, -2] },
  { id: 'trading', name: 'Trading', color: '#00b88d', radius: 1.0, position: [2, -2, 2.5] },
  { id: 'cicd', name: 'CI/CD', color: '#00b3ff', radius: 1.3, position: [-3.5, 1.8, -1.5] },
  { id: 'blockchain', name: 'Blockchain', color: '#ff007a', radius: 2.0, position: [1, 3, -2.5] },
  { id: 'logs', name: 'Log Streams', color: '#00a3ff', radius: 1.6, position: [-2, -2.5, -1] },
]

/** Landing page copy for the editorial text overlay */
export const LANDING_COPY = `Your systems are alive. Thousands of events per second — API calls, agent decisions, sensor readings, trades, deploys, messages — flowing through networks too complex for dashboards. What if you could see the whole system breathe?

Every node you see represents an entity in your data. Watch as events flow between services, agents, devices, and users. See traffic patterns emerge like a pulse through interconnected systems.

This is not a dashboard. This is your system made visible. Network traffic, agent orchestration, device telemetry, social interactions — all mapped in three dimensions without skipping a frame.

Built for engineers, researchers, and the curious. Explore service dependencies, trace anomalies, and discover patterns invisible to traditional interfaces. The engine processes thousands of real-time events, projecting them into a force-directed graph that breathes with the rhythm of your data.

Each connection tells a story. Each cluster reveals a relationship. Each pulse is an event that just happened — in your infrastructure, your network, your world. The visualization adapts, grows, and evolves as the system itself does.

Plug in any data stream. Watch the universe come alive.`

/** Headline text */
export const HEADLINE = 'Real-time Network Visualization'
export const SUBHEAD = 'GPU-accelerated force-directed graphs for any streaming data source'
