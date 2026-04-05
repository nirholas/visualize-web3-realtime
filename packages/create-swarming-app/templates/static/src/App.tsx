import { SwarmGraph } from "@swarming-vis/react-graph";
import data from "./data.json";

function App() {
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
      </div>
      <SwarmGraph nodes={data.nodes} edges={data.edges} />
    </div>
  );
}

export default App;
