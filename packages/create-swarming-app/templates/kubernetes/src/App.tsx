import { useState, useMemo } from "react";
import { SwarmGraph } from "@swarming-vis/react-graph";
import { useK8sPods } from "./K8sProvider";
import { POD_STATUS_COLORS, getNamespaceColor } from "./pod-colors";

function App() {
  const { nodes, edges, namespaces, loading } = useK8sPods();
  const [selectedNamespace, setSelectedNamespace] = useState<string>("all");

  const filteredNodes = useMemo(() => {
    if (selectedNamespace === "all") return nodes;
    return nodes.filter((n) => n.group === selectedNamespace);
  }, [nodes, selectedNamespace]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes]
  );

  const filteredEdges = useMemo(
    () =>
      edges.filter(
        (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
      ),
    [edges, filteredNodeIds]
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0a0a0f",
        position: "relative",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#ffffff",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          zIndex: 10,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Kubernetes Cluster
        </h1>
        <p style={{ fontSize: 14, color: "#9ca3af", marginTop: 4 }}>
          {loading
            ? "Connecting..."
            : `${filteredNodes.length} pods across ${namespaces.length} namespaces`}
        </p>
      </div>

      {/* Namespace filter */}
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          zIndex: 10,
        }}
      >
        <select
          value={selectedNamespace}
          onChange={(e) => setSelectedNamespace(e.target.value)}
          style={{
            background: "#1f2937",
            color: "#ffffff",
            border: "1px solid #374151",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 14,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="all">All Namespaces</option>
          {namespaces.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>
      </div>

      {/* Status color legend */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 24,
          zIndex: 10,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {Object.entries(POD_STATUS_COLORS).map(([status, color]) => (
          <div
            key={status}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: color,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{status}</span>
          </div>
        ))}
      </div>

      {/* Namespace color legend */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          zIndex: 10,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {namespaces.map((ns) => (
          <div
            key={ns}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: getNamespaceColor(ns),
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{ns}</span>
          </div>
        ))}
      </div>

      {/* Graph */}
      <SwarmGraph nodes={filteredNodes} edges={filteredEdges} />
    </div>
  );
}

export default App;
