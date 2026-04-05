/**
 * Generate a random graph for benchmarking.
 * Usage: const { nodes, edges } = generateGraph(nodeCount);
 * Each node: { id, x, y }
 * Each edge: { source, target }
 */
function generateGraph(n) {
  const nodes = [];
  const edges = [];
  for (let i = 0; i < n; i++) {
    nodes.push({
      id: 'n' + i,
      x: (Math.random() - 0.5) * 1000,
      y: (Math.random() - 0.5) * 1000,
      z: (Math.random() - 0.5) * 1000,
    });
  }
  // ~2 edges per node on average (scale-free-ish via preferential attachment)
  const edgeCount = Math.min(n * 2, n * (n - 1) / 2);
  const seen = new Set();
  for (let i = 0; i < edgeCount; i++) {
    let a, b, key;
    let tries = 0;
    do {
      a = Math.floor(Math.random() * n);
      b = Math.floor(Math.random() * n);
      key = a < b ? a + '-' + b : b + '-' + a;
      tries++;
    } while ((a === b || seen.has(key)) && tries < 20);
    if (a !== b && !seen.has(key)) {
      seen.add(key);
      edges.push({ source: 'n' + a, target: 'n' + b });
    }
  }
  return { nodes, edges };
}
