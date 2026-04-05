#!/usr/bin/env tsx
/**
 * Benchmark runner — uses Playwright to open each library's test page,
 * wait for steady state, and collect metrics from window.__BENCH.
 *
 * Usage:
 *   tsx runner.ts                              # all libs, default node counts
 *   tsx runner.ts --lib swarming --nodes 5000  # single run
 *   tsx runner.ts --output results/latest.json # custom output path
 */

import { chromium, type Browser, type Page } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, extname, join } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LIBS = [
  { name: 'swarming', file: 'swarming.html', renderer: 'Three.js WebGL' },
  { name: 'd3-svg', file: 'd3-svg.html', renderer: 'SVG' },
  { name: 'd3-canvas', file: 'd3-canvas.html', renderer: 'Canvas 2D' },
  { name: 'sigma', file: 'sigma.html', renderer: 'WebGL (Sigma)' },
  { name: 'cytoscape', file: 'cytoscape.html', renderer: 'Canvas 2D' },
  { name: 'vis-network', file: 'vis-network.html', renderer: 'Canvas 2D' },
  { name: 'force-graph', file: 'force-graph.html', renderer: 'Three.js WebGL' },
  { name: 'ngraph', file: 'ngraph.html', renderer: 'Canvas 2D' },
] as const;

const DEFAULT_NODE_COUNTS = [500, 1000, 2000, 5000, 10000, 20000];
const WARMUP_MS = 3000; // let simulation settle
const MEASURE_MS = 5000; // measure for 5s after warmup
const PAGE_TIMEOUT_MS = 60000;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let lib: string | null = null;
  let nodes: number[] | null = null;
  let output = resolve(import.meta.dirname || '.', 'results/latest.json');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lib' && args[i + 1]) lib = args[++i];
    else if (args[i] === '--nodes' && args[i + 1]) nodes = [parseInt(args[++i])];
    else if (args[i] === '--output' && args[i + 1]) output = resolve(args[++i]);
  }

  return {
    libs: lib ? LIBS.filter((l) => l.name === lib) : [...LIBS],
    nodeCounts: nodes || DEFAULT_NODE_COUNTS,
    output,
  };
}

// ---------------------------------------------------------------------------
// Static file server for benchmark HTML pages
// ---------------------------------------------------------------------------

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

function startServer(dir: string): Promise<{ url: string; close: () => void }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const filePath = join(dir, req.url?.split('?')[0] || '/');
      try {
        const data = readFileSync(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' ? addr?.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => server.close(),
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Machine info
// ---------------------------------------------------------------------------

function getMachineInfo() {
  const run = (cmd: string) => {
    try {
      return execSync(cmd, { encoding: 'utf-8' }).trim();
    } catch {
      return 'unknown';
    }
  };
  return {
    cpu: run("cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d: -f2").trim() || run('uname -m'),
    ram: run("free -h | awk '/Mem:/ {print $2}'"),
    os: run('uname -srm'),
    node: process.version,
  };
}

// ---------------------------------------------------------------------------
// Single benchmark run
// ---------------------------------------------------------------------------

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
  status: 'ok' | 'timeout' | 'crash';
  error?: string;
}

async function runBenchmark(
  browser: Browser,
  baseUrl: string,
  lib: (typeof LIBS)[number],
  nodeCount: number,
): Promise<BenchResult> {
  const result: BenchResult = {
    library: lib.name,
    renderer: lib.renderer,
    nodes: nodeCount,
    avgFps: 0,
    timeToFirstFrameMs: null,
    startupTimeMs: null,
    physicsTickMs: null,
    renderFrameMs: null,
    memoryMb: null,
    status: 'ok',
  };

  let page: Page | null = null;
  try {
    page = await browser.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);

    // Navigate
    const url = `${baseUrl}/${lib.file}?nodes=${nodeCount}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Warmup
    await page.waitForTimeout(WARMUP_MS);

    // Measure
    await page.waitForTimeout(MEASURE_MS);

    // Collect
    const bench = await page.evaluate(() => (window as any).__BENCH);
    if (bench) {
      result.avgFps = bench.avgFps ?? 0;
      result.timeToFirstFrameMs = bench.timeToFirstFrame;
      result.startupTimeMs = bench.startupTime;
      result.physicsTickMs = bench.physicsTickMs;
      result.renderFrameMs = bench.renderFrameMs;
      result.memoryMb = bench.memory
        ? Math.round(bench.memory.usedJSHeapSize / 1024 / 1024)
        : null;
    }
  } catch (err: any) {
    result.status = err.message?.includes('timeout') ? 'timeout' : 'crash';
    result.error = err.message?.slice(0, 200);
  } finally {
    if (page) await page.close().catch(() => {});
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { libs, nodeCounts, output } = parseArgs();

  console.log('=== Swarming Benchmark Suite ===');
  console.log(`Libraries: ${libs.map((l) => l.name).join(', ')}`);
  console.log(`Node counts: ${nodeCounts.join(', ')}`);
  console.log();

  const libsDir = resolve(import.meta.dirname || '.', 'libs');
  const { url, close } = await startServer(libsDir);
  console.log(`Static server at ${url}`);

  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu-sandbox',
      '--enable-webgl',
      // Enable performance.memory
      '--enable-precise-memory-info',
    ],
  });

  const results: BenchResult[] = [];
  const total = libs.length * nodeCounts.length;
  let done = 0;

  for (const lib of libs) {
    for (const nodeCount of nodeCounts) {
      done++;
      const tag = `[${done}/${total}] ${lib.name} @ ${nodeCount} nodes`;
      process.stdout.write(`${tag}... `);

      const result = await runBenchmark(browser, url, lib, nodeCount);
      results.push(result);

      if (result.status === 'ok') {
        console.log(`${result.avgFps} fps, ${result.memoryMb ?? '?'} MB`);
      } else {
        console.log(`${result.status}: ${result.error || ''}`);
      }
    }
  }

  await browser.close();
  close();

  // Write results
  const outputData = {
    timestamp: new Date().toISOString(),
    machine: getMachineInfo(),
    config: {
      warmupMs: WARMUP_MS,
      measureMs: MEASURE_MS,
      nodeCounts,
    },
    results,
  };

  const outDir = resolve(output, '..');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(output, JSON.stringify(outputData, null, 2));
  console.log(`\nResults written to ${output}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
