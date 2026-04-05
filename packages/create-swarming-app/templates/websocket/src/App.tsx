import { SwarmGraph } from "@swarming-vis/react-graph";
import { useSwarmSocket } from "./provider";

function App() {
  const { nodes, edges, connected } = useSwarmSocket();

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0a0a0f",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          zIndex: 10,
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>
          Swarming Visualization
        </h1>
        <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
          {nodes.length} nodes &middot; {edges.length} edges
        </p>
      </div>

      {/* Connection status indicator */}
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 13,
          color: "#888",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: connected ? "#22c55e" : "#ef4444",
            display: "inline-block",
            boxShadow: connected
              ? "0 0 6px #22c55e80"
              : "0 0 6px #ef444480",
          }}
        />
        {connected ? "Connected" : "Disconnected"}
      </div>

      <SwarmGraph nodes={nodes} edges={edges} />
    </div>
  );
}

export default App;
