import React from "react";
import { ForceGraph } from "@swarming-vis/react-graph";
import { useSolanaStream } from "./SolanaProvider";
import { MAX_NODES } from "./config";
import type { SwapNode, SwapEdge } from "./SolanaProvider";

// ---------------------------------------------------------------------------
// Map Solana stream data into the shape expected by <ForceGraph />
// ---------------------------------------------------------------------------

function toTopTokens(nodes: SwapNode[]) {
  return nodes.map((n) => ({
    tokenAddress: n.tokenAddress,
    symbol: n.symbol,
    name: n.name,
    chain: n.chain,
    trades: n.trades,
    volume: n.volume,
    nativeSymbol: n.nativeSymbol,
    source: n.source,
  }));
}

function toTraderEdges(edges: SwapEdge[]) {
  return edges.map((e) => ({
    trader: e.trader,
    tokenAddress: e.tokenAddress,
    chain: e.chain,
    trades: e.trades,
    volume: e.volume,
    source: e.source,
  }));
}

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------

function StatsBar({
  connected,
  nodeCount,
  edgeCount,
  txCount,
}: {
  connected: boolean;
  nodeCount: number;
  edgeCount: number;
  txCount: number;
}) {
  return (
    <div style={statsBarStyle}>
      <span style={badgeStyle}>
        <span
          style={{
            ...dotStyle,
            backgroundColor: connected ? "#00ff88" : "#ff4444",
          }}
        />
        {connected ? "Solana Live" : "Demo Mode"}
      </span>
      <span style={statStyle}>
        Nodes: <strong>{nodeCount}</strong> / {MAX_NODES}
      </span>
      <span style={statStyle}>
        Edges: <strong>{edgeCount}</strong>
      </span>
      <span style={statStyle}>
        Txns: <strong>{txCount}</strong>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  const { nodes, edges, connected, stats } = useSolanaStream();

  return (
    <div style={rootStyle}>
      <StatsBar
        connected={connected}
        nodeCount={stats.nodeCount}
        edgeCount={edges.length}
        txCount={stats.txCount}
      />
      <ForceGraph
        topTokens={toTopTokens(nodes)}
        traderEdges={toTraderEdges(edges)}
        height="100%"
        background="#0a0a0f"
        showLabels
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------

const rootStyle: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  background: "#0a0a0f",
  position: "relative",
  overflow: "hidden",
};

const statsBarStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  gap: "1.5rem",
  padding: "0.75rem 1.25rem",
  background: "rgba(10, 10, 15, 0.85)",
  backdropFilter: "blur(8px)",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: "0.85rem",
  color: "#ccc",
};

const badgeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  fontWeight: 600,
  color: "#fff",
  letterSpacing: "0.02em",
};

const dotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
};

const statStyle: React.CSSProperties = {
  color: "#999",
};
