// ============================================================================
// ImportExport — JSON, Mermaid, CSV import/export for editor graphs
// ============================================================================

import type { EditorGraph, EditorNode, EditorEdge } from './types';

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

export function exportJSON(graph: EditorGraph): string {
  return JSON.stringify(graph, null, 2);
}

export function importJSON(json: string): EditorGraph {
  const parsed = JSON.parse(json);
  if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
    throw new Error('Invalid graph JSON: missing nodes array');
  }
  return {
    nodes: parsed.nodes.map(validateNode),
    edges: (parsed.edges ?? []).map(validateEdge),
  };
}

// ---------------------------------------------------------------------------
// Mermaid
// ---------------------------------------------------------------------------

export function exportMermaid(graph: EditorGraph): string {
  const lines: string[] = ['graph TD'];

  for (const node of graph.nodes) {
    const label = node.label || node.id;
    lines.push(`    ${sanitizeMermaidId(node.id)}["${escapeMermaid(label)}"]`);
  }

  for (const edge of graph.edges) {
    const src = sanitizeMermaidId(edge.source);
    const tgt = sanitizeMermaidId(edge.target);
    const arrow = edge.direction === 'both' ? '<-->' :
                  edge.direction === 'backward' ? '<---' : '--->';
    const lineStyle = edge.style === 'dotted' ? '-.->' :
                      edge.style === 'dashed' ? '-.->': arrow;
    const label = edge.label ? `|"${escapeMermaid(edge.label)}"|` : '';
    lines.push(`    ${src} ${lineStyle}${label} ${tgt}`);
  }

  return lines.join('\n');
}

export function importMermaid(mermaid: string): EditorGraph {
  const nodes: EditorNode[] = [];
  const edges: EditorEdge[] = [];
  const nodeIds = new Set<string>();

  const lines = mermaid.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Skip graph declaration
    if (/^(graph|flowchart)\s+(TD|TB|LR|RL|BT)/i.test(line)) continue;
    if (line.startsWith('%%')) continue; // comments

    // Node definition: A["Label"]
    const nodeDef = line.match(/^(\w+)\s*\[\s*"?([^"\]]*)"?\s*\]/);
    if (nodeDef && !line.includes('-->') && !line.includes('---')) {
      const id = nodeDef[1];
      const label = nodeDef[2] || id;
      if (!nodeIds.has(id)) {
        nodeIds.add(id);
        nodes.push(makeNode(id, label, nodes.length));
      }
      continue;
    }

    // Edge: A --> B  or  A -->|label| B  or  A -.-> B
    const edgeMatch = line.match(
      /(\w+)\s*(<?)(-{1,3}|\.{1,3})(-?>)\s*(?:\|"?([^"|]*)"?\|)?\s*(\w+)/,
    );
    if (edgeMatch) {
      const sourceId = edgeMatch[1];
      const leftArrow = edgeMatch[2] === '<';
      const lineChars = edgeMatch[3];
      const rightArrow = edgeMatch[4] === '>';
      const label = edgeMatch[5] || undefined;
      const targetId = edgeMatch[6];

      // Ensure nodes exist
      for (const id of [sourceId, targetId]) {
        if (!nodeIds.has(id)) {
          nodeIds.add(id);
          nodes.push(makeNode(id, id, nodes.length));
        }
      }

      const style = lineChars.includes('.') ? 'dotted' as const : 'solid' as const;
      const direction = leftArrow && rightArrow ? 'both' as const :
                        leftArrow ? 'backward' as const :
                        rightArrow ? 'forward' as const : 'none' as const;

      edges.push({
        id: `e_${sourceId}_${targetId}_${edges.length}`,
        source: sourceId,
        target: targetId,
        label,
        style,
        direction,
        color: '#888888',
      });
    }
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// CSV (adjacency list)
// ---------------------------------------------------------------------------

export function importCSV(csv: string): EditorGraph {
  const nodes: EditorNode[] = [];
  const edges: EditorEdge[] = [];
  const nodeIds = new Set<string>();

  const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Skip header
    if (line.toLowerCase().startsWith('source') || line.startsWith('#')) continue;

    const parts = line.split(',').map((s) => s.trim());
    if (parts.length < 2) continue;

    const [source, target, label] = parts;

    for (const id of [source, target]) {
      if (!nodeIds.has(id)) {
        nodeIds.add(id);
        nodes.push(makeNode(id, id, nodes.length));
      }
    }

    edges.push({
      id: `e_${source}_${target}_${edges.length}`,
      source,
      target,
      label: label || undefined,
      style: 'solid',
      direction: 'forward',
      color: '#888888',
    });
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// SVG export (2D only)
// ---------------------------------------------------------------------------

export function exportSVG(graph: EditorGraph): string {
  if (graph.nodes.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>';
  }

  // Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of graph.nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }

  const pad = 40;
  const vx = minX - pad;
  const vy = minY - pad;
  const vw = maxX - minX + pad * 2;
  const vh = maxY - minY + pad * 2;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}">`);

  // Edges
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const edge of graph.edges) {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) continue;
    const x1 = src.x + src.width / 2;
    const y1 = src.y + src.height / 2;
    const x2 = tgt.x + tgt.width / 2;
    const y2 = tgt.y + tgt.height / 2;
    const dashArray = edge.style === 'dashed' ? ' stroke-dasharray="8,4"' :
                      edge.style === 'dotted' ? ' stroke-dasharray="2,4"' : '';
    parts.push(`  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${edge.color}" stroke-width="2"${dashArray}/>`);
    if (edge.label) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      parts.push(`  <text x="${mx}" y="${my - 6}" text-anchor="middle" font-size="12" fill="${edge.color}">${escapeXml(edge.label)}</text>`);
    }
  }

  // Nodes
  for (const node of graph.nodes) {
    parts.push(`  <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="6" fill="${node.color}" opacity="0.9"/>`);
    parts.push(`  <text x="${node.x + node.width / 2}" y="${node.y + node.height / 2 + 5}" text-anchor="middle" font-size="14" font-family="monospace" fill="white">${escapeXml(node.label)}</text>`);
  }

  parts.push('</svg>');
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, label: string, index: number): EditorNode {
  // Spread nodes in a grid initially
  const cols = Math.ceil(Math.sqrt(index + 1));
  return {
    id,
    label,
    x: (index % cols) * 150,
    y: Math.floor(index / cols) * 120,
    width: 120,
    height: 60,
    color: '#6366f1',
  };
}

function validateNode(raw: Record<string, unknown>): EditorNode {
  return {
    id: String(raw.id ?? ''),
    label: String(raw.label ?? raw.id ?? ''),
    x: Number(raw.x ?? 0),
    y: Number(raw.y ?? 0),
    width: Number(raw.width ?? 120),
    height: Number(raw.height ?? 60),
    color: String(raw.color ?? '#6366f1'),
    group: raw.group ? String(raw.group) : undefined,
    meta: (raw.meta ?? undefined) as Record<string, unknown> | undefined,
  };
}

function validateEdge(raw: Record<string, unknown>): EditorEdge {
  return {
    id: String(raw.id ?? ''),
    source: String(raw.source ?? ''),
    target: String(raw.target ?? ''),
    label: raw.label ? String(raw.label) : undefined,
    style: (['solid', 'dashed', 'dotted'].includes(String(raw.style)) ? raw.style : 'solid') as EditorEdge['style'],
    direction: (['none', 'forward', 'backward', 'both'].includes(String(raw.direction)) ? raw.direction : 'forward') as EditorEdge['direction'],
    color: String(raw.color ?? '#888888'),
  };
}

function sanitizeMermaidId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeMermaid(text: string): string {
  return text.replace(/"/g, '\\"');
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
