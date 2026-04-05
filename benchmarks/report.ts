#!/usr/bin/env tsx
/**
 * Report generator — reads results/latest.json and produces:
 *   1. A Markdown comparison table (results/comparison.md)
 *   2. A JSON summary suitable for the /benchmarks page (results/summary.json)
 *
 * Usage:
 *   tsx report.ts
 *   tsx report.ts --input results/latest.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const dir = import.meta.dirname || '.';

function parseArgs() {
  const args = process.argv.slice(2);
  let input = resolve(dir, 'results/latest.json');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) input = resolve(args[++i]);
  }
  return { input };
}

interface BenchResult {
  library: string;
  renderer: string;
  nodes: number;
  avgFps: number;
  timeToFirstFrameMs: number | null;
  startupTimeMs: number | null;
  physicsTickMs: number | null;
  renderFrameMs: number | null;
  memoryMb: number | null;
  status: string;
}

interface BenchData {
  timestamp: string;
  machine: Record<string, string>;
  config: { nodeCounts: number[] };
  results: BenchResult[];
}

function fpsCell(r: BenchResult | undefined): string {
  if (!r) return '-';
  if (r.status === 'crash') return 'crash';
  if (r.status === 'timeout') return 'timeout';
  return `${r.avgFps} fps`;
}

function memCell(r: BenchResult | undefined): string {
  if (!r || r.memoryMb == null) return '-';
  return `${r.memoryMb} MB`;
}

function generateMarkdown(data: BenchData): string {
  const { results, machine, timestamp, config } = data;
  const libs = [...new Set(results.map((r) => r.library))];
  const nodeCounts = config.nodeCounts;

  // FPS comparison table
  const header = ['Library', ...nodeCounts.map((n) => `${n.toLocaleString()} nodes`)];
  const divider = header.map(() => '---');

  const rows = libs.map((lib) => {
    const libResults = results.filter((r) => r.library === lib);
    const cells = nodeCounts.map((n) => {
      const r = libResults.find((x) => x.nodes === n);
      return fpsCell(r);
    });
    return [lib, ...cells];
  });

  // Memory table at 5k nodes
  const memHeader = ['Library', 'Memory (5k nodes)', 'Physics tick (ms)', 'Render frame (ms)', 'Time to first frame (ms)'];
  const memDivider = memHeader.map(() => '---');
  const memRows = libs.map((lib) => {
    const r = results.find((x) => x.library === lib && x.nodes === 5000);
    return [
      lib,
      memCell(r),
      r?.physicsTickMs != null ? r.physicsTickMs.toFixed(2) : '-',
      r?.renderFrameMs != null ? r.renderFrameMs.toFixed(2) : '-',
      r?.timeToFirstFrameMs != null ? Math.round(r.timeToFirstFrameMs).toString() : '-',
    ];
  });

  let md = `# Benchmark Results\n\n`;
  md += `**Date:** ${new Date(timestamp).toLocaleDateString()}\n`;
  md += `**CPU:** ${machine.cpu}\n`;
  md += `**RAM:** ${machine.ram}\n`;
  md += `**OS:** ${machine.os}\n`;
  md += `**Node.js:** ${machine.node}\n\n`;

  md += `## FPS Comparison\n\n`;
  md += `| ${header.join(' | ')} |\n`;
  md += `| ${divider.join(' | ')} |\n`;
  for (const row of rows) {
    md += `| ${row.join(' | ')} |\n`;
  }

  md += `\n## Detailed Metrics (5,000 nodes)\n\n`;
  md += `| ${memHeader.join(' | ')} |\n`;
  md += `| ${memDivider.join(' | ')} |\n`;
  for (const row of memRows) {
    md += `| ${row.join(' | ')} |\n`;
  }

  md += `\n## Methodology\n\n`;
  md += `- Each library loaded in a headless Chromium browser via Playwright\n`;
  md += `- ${data.config.nodeCounts.length} node counts tested: ${nodeCounts.map((n) => n.toLocaleString()).join(', ')}\n`;
  md += `- 3-second warmup, then 5-second measurement window\n`;
  md += `- FPS measured via \`requestAnimationFrame\` counting\n`;
  md += `- Memory measured via \`performance.memory.usedJSHeapSize\`\n`;
  md += `- Physics and render timing measured with \`performance.now()\`\n`;
  md += `- Same random graph structure used across all libraries\n`;
  md += `- Each library configured with recommended settings from their docs\n`;

  return md;
}

function generateSummary(data: BenchData) {
  const libs = [...new Set(data.results.map((r) => r.library))];
  const nodeCounts = data.config.nodeCounts;

  // Pivot: { library -> { nodeCount -> metrics } }
  const byLib: Record<string, Record<number, any>> = {};
  for (const lib of libs) {
    byLib[lib] = {};
    for (const n of nodeCounts) {
      const r = data.results.find((x) => x.library === lib && x.nodes === n);
      byLib[lib][n] = r
        ? {
            fps: r.avgFps,
            memoryMb: r.memoryMb,
            physicsTickMs: r.physicsTickMs,
            renderFrameMs: r.renderFrameMs,
            timeToFirstFrameMs: r.timeToFirstFrameMs,
            startupTimeMs: r.startupTimeMs,
            status: r.status,
          }
        : null;
    }
  }

  return {
    timestamp: data.timestamp,
    machine: data.machine,
    nodeCounts,
    libraries: libs,
    results: byLib,
  };
}

function main() {
  const { input } = parseArgs();
  console.log(`Reading ${input}...`);

  const raw = readFileSync(input, 'utf-8');
  const data: BenchData = JSON.parse(raw);

  // Markdown
  const md = generateMarkdown(data);
  const mdPath = resolve(dir, 'results/comparison.md');
  writeFileSync(mdPath, md);
  console.log(`Markdown report → ${mdPath}`);

  // Summary JSON
  const summary = generateSummary(data);
  const jsonPath = resolve(dir, 'results/summary.json');
  writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  console.log(`Summary JSON → ${jsonPath}`);

  // Print table to stdout
  console.log('\n' + md);
}

main();
