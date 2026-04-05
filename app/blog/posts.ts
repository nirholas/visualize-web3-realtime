import { BlogPost } from "./types";

export const posts: BlogPost[] = [
  {
    slug: "swarming-vs-alternatives",
    title:
      "Swarming vs D3 vs Sigma.js vs Cytoscape: Real-Time Graph Visualization Compared",
    description:
      "A head-to-head benchmark of the most popular graph visualization libraries, measuring frame rate, memory usage, and time-to-interactive with 1,000 to 10,000 live-updating nodes.",
    date: "2025-01-20",
    readingTime: "10 min",
    tags: ["benchmarks", "comparison", "graph-visualization"],
  },
  {
    slug: "websocket-to-3d",
    title:
      "WebSocket \u2192 3D: Visualizing Any Data Stream in 10 Lines of Code",
    description:
      "A step-by-step tutorial showing how to connect a WebSocket feed to Swarming's force graph and render live data in 3D with minimal boilerplate.",
    date: "2025-01-15",
    readingTime: "6 min",
    tags: ["tutorial", "websocket", "getting-started"],
  },
  {
    slug: "zero-dom-reads",
    title: "Zero DOM Reads: How We Built a 60fps Text Layout Engine",
    description:
      "DOM reads are the silent killer of rendering performance. Here is how we eliminated every single one and built a text layout engine that never touches the DOM.",
    date: "2025-01-10",
    readingTime: "8 min",
    tags: ["performance", "dom", "text-layout"],
  },
  {
    slug: "building-realtime-viz-engine",
    title: "Building a Real-Time Data Visualization Engine from Scratch",
    description:
      "An architectural deep-dive into Swarming's rendering pipeline: from WebSocket ingestion through D3-force simulation to React Three Fiber output at 60fps.",
    date: "2025-01-05",
    readingTime: "12 min",
    tags: ["architecture", "react", "three-js"],
  },
  {
    slug: "rendering-5000-particles",
    title: "Rendering 5,000 Particles at 60fps in the Browser",
    description:
      "The tricks, tradeoffs, and GPU techniques we used to render thousands of animated particles without dropping a single frame, including instanced meshes and buffer geometry.",
    date: "2025-01-01",
    readingTime: "14 min",
    tags: ["performance", "webgl", "three-js", "force-graph"],
  },
];
