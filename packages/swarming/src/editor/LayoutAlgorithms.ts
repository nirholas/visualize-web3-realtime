// ============================================================================
// LayoutAlgorithms — Auto-arrange nodes in various patterns
// ============================================================================

import type { EditorNode, EditorEdge, EditorGraph, LayoutType } from './types';

export function applyLayout(graph: EditorGraph, layout: LayoutType): EditorNode[] {
  switch (layout) {
    case 'force':
      return forceLayout(graph);
    case 'hierarchical':
      return hierarchicalLayout(graph);
    case 'circular':
      return circularLayout(graph);
    case 'grid':
      return gridLayout(graph);
    case 'radial':
      return radialLayout(graph);
  }
}

// ---------------------------------------------------------------------------
// Force-directed (simple spring simulation)
// ---------------------------------------------------------------------------

function forceLayout(graph: EditorGraph): EditorNode[] {
  const nodes = graph.nodes.map((n) => ({ ...n }));
  if (nodes.length === 0) return nodes;

  const adjacency = buildAdjacency(graph);
  const iterations = 100;
  const repulsion = 5000;
  const attraction = 0.01;
  const damping = 0.9;

  const vx = new Float64Array(nodes.length);
  const vy = new Float64Array(nodes.length);

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsive forces between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        vx[i] -= fx;
        vy[i] -= fy;
        vx[j] += fx;
        vy[j] += fy;
      }
    }

    // Attractive forces along edges
    for (const edge of graph.edges) {
      const si = nodes.findIndex((n) => n.id === edge.source);
      const ti = nodes.findIndex((n) => n.id === edge.target);
      if (si < 0 || ti < 0) continue;
      const dx = nodes[ti].x - nodes[si].x;
      const dy = nodes[ti].y - nodes[si].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      vx[si] += fx;
      vy[si] += fy;
      vx[ti] -= fx;
      vy[ti] -= fy;
    }

    // Apply velocities
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].x += vx[i];
      nodes[i].y += vy[i];
      vx[i] *= damping;
      vy[i] *= damping;
    }
  }

  // Center the layout
  return centerNodes(nodes);
}

// ---------------------------------------------------------------------------
// Hierarchical (top-to-bottom tree)
// ---------------------------------------------------------------------------

function hierarchicalLayout(graph: EditorGraph): EditorNode[] {
  const nodes = graph.nodes.map((n) => ({ ...n }));
  if (nodes.length === 0) return nodes;

  const adjacency = buildAdjacency(graph);
  const visited = new Set<string>();
  const levels = new Map<string, number>();

  // BFS from roots (nodes with no incoming edges)
  const incoming = new Set<string>();
  for (const edge of graph.edges) {
    incoming.add(edge.target);
  }
  const roots = nodes.filter((n) => !incoming.has(n.id));
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0]);
  }

  const queue: Array<{ id: string; level: number }> = roots.map((r) => ({ id: r.id, level: 0 }));
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    levels.set(id, level);
    const neighbors = adjacency.get(id) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push({ id: neighbor, level: level + 1 });
      }
    }
  }

  // Assign unvisited nodes
  for (const node of nodes) {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  }

  // Group by level
  const byLevel = new Map<number, EditorNode[]>();
  for (const node of nodes) {
    const level = levels.get(node.id) ?? 0;
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push(node);
  }

  const levelGap = 120;
  const nodeGap = 150;

  for (const [level, levelNodes] of byLevel) {
    const totalWidth = levelNodes.length * nodeGap;
    const startX = -totalWidth / 2 + nodeGap / 2;
    for (let i = 0; i < levelNodes.length; i++) {
      levelNodes[i].x = startX + i * nodeGap;
      levelNodes[i].y = level * levelGap;
    }
  }

  return centerNodes(nodes);
}

// ---------------------------------------------------------------------------
// Circular
// ---------------------------------------------------------------------------

function circularLayout(graph: EditorGraph): EditorNode[] {
  const nodes = graph.nodes.map((n) => ({ ...n }));
  if (nodes.length === 0) return nodes;

  const radius = Math.max(100, nodes.length * 30);
  const angleStep = (2 * Math.PI) / nodes.length;

  for (let i = 0; i < nodes.length; i++) {
    nodes[i].x = Math.cos(i * angleStep) * radius;
    nodes[i].y = Math.sin(i * angleStep) * radius;
  }

  return centerNodes(nodes);
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

function gridLayout(graph: EditorGraph): EditorNode[] {
  const nodes = graph.nodes.map((n) => ({ ...n }));
  if (nodes.length === 0) return nodes;

  const cols = Math.ceil(Math.sqrt(nodes.length));
  const gap = 150;

  for (let i = 0; i < nodes.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    nodes[i].x = col * gap;
    nodes[i].y = row * gap;
  }

  return centerNodes(nodes);
}

// ---------------------------------------------------------------------------
// Radial (concentric circles from center)
// ---------------------------------------------------------------------------

function radialLayout(graph: EditorGraph): EditorNode[] {
  const nodes = graph.nodes.map((n) => ({ ...n }));
  if (nodes.length === 0) return nodes;

  const adjacency = buildAdjacency(graph);

  // BFS from center node (most connected)
  const connectionCounts = new Map<string, number>();
  for (const node of nodes) {
    connectionCounts.set(node.id, (adjacency.get(node.id) ?? []).length);
  }
  const center = [...connectionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? nodes[0].id;

  const visited = new Set<string>();
  const levels = new Map<string, number>();
  const queue: Array<{ id: string; level: number }> = [{ id: center, level: 0 }];

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    levels.set(id, level);
    const neighbors = adjacency.get(id) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push({ id: neighbor, level: level + 1 });
      }
    }
  }

  // Assign unvisited
  for (const node of nodes) {
    if (!levels.has(node.id)) levels.set(node.id, 0);
  }

  // Group by ring
  const byRing = new Map<number, EditorNode[]>();
  for (const node of nodes) {
    const ring = levels.get(node.id) ?? 0;
    if (!byRing.has(ring)) byRing.set(ring, []);
    byRing.get(ring)!.push(node);
  }

  const ringGap = 120;
  for (const [ring, ringNodes] of byRing) {
    if (ring === 0) {
      ringNodes[0].x = 0;
      ringNodes[0].y = 0;
      continue;
    }
    const radius = ring * ringGap;
    const angleStep = (2 * Math.PI) / ringNodes.length;
    for (let i = 0; i < ringNodes.length; i++) {
      ringNodes[i].x = Math.cos(i * angleStep) * radius;
      ringNodes[i].y = Math.sin(i * angleStep) * radius;
    }
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAdjacency(graph: EditorGraph): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target);
    adj.get(edge.target)?.push(edge.source);
  }
  return adj;
}

function centerNodes(nodes: EditorNode[]): EditorNode[] {
  if (nodes.length === 0) return nodes;
  let sumX = 0;
  let sumY = 0;
  for (const n of nodes) {
    sumX += n.x;
    sumY += n.y;
  }
  const cx = sumX / nodes.length;
  const cy = sumY / nodes.length;
  for (const n of nodes) {
    n.x -= cx;
    n.y -= cy;
  }
  return nodes;
}
