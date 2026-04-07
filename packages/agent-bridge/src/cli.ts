#!/usr/bin/env npx tsx
// ---------------------------------------------------------------------------
// @web3viz/agent-bridge CLI
//
// Starts a local WebSocket bridge that connects AI agent frameworks
// to the Swarming /agents 3D visualization.
//
// Usage:
//   npx tsx packages/agent-bridge/src/cli.ts claude -- -p "refactor auth"
//   npx tsx packages/agent-bridge/src/cli.ts openclaw -- run task.yaml
//   npx tsx packages/agent-bridge/src/cli.ts hermes -- --task "research"
//   some-agent --json | npx tsx packages/agent-bridge/src/cli.ts --stdin generic
//   npx tsx packages/agent-bridge/src/cli.ts serve   # server only, POST to /events
// ---------------------------------------------------------------------------

import { BridgeServer } from './server.js';
import { claudeAdapter } from './adapters/claude.js';
import { openclawAdapter } from './adapters/openclaw.js';
import { hermesAdapter } from './adapters/hermes.js';
import { genericAdapter } from './adapters/generic.js';
import type { AdapterFn } from './types.js';

const ADAPTERS: Record<string, AdapterFn> = {
  claude: claudeAdapter,
  openclaw: openclawAdapter,
  hermes: hermesAdapter,
  generic: genericAdapter,
};

function printHelp(): void {
  console.log(`
  @web3viz/agent-bridge — Connect AI agents to 3D visualization

  Usage:
    agent-bridge <adapter> [options] [-- agent-args...]
    agent-bridge serve [options]

  Adapters:
    claude     Claude Code CLI (auto-adds --output-format stream-json)
    openclaw   OpenClaw agent framework (https://github.com/openclaw/openclaw)
    hermes     Hermes agent (https://github.com/nousresearch/hermes-agent)
    generic    Accept any JSONL from stdin

  Commands:
    serve      Start bridge server only (POST events to http://localhost:<port>/events)

  Options:
    --port <n>   WebSocket server port (default: 9222)
    --stdin      Read agent output from stdin instead of spawning a process
    --open       Open the visualization in the default browser
    --help       Show this help message

  Examples:
    # Visualize a Claude Code session
    agent-bridge claude -- -p "refactor the auth module"

    # Pipe Claude output
    claude -p --output-format stream-json "fix tests" | agent-bridge --stdin claude

    # OpenClaw agent
    agent-bridge openclaw -- run task.yaml

    # Hermes agent
    agent-bridge hermes -- --task "research quantum computing"

    # Any agent that outputs JSONL
    my-agent --json | agent-bridge --stdin generic

    # Server only — POST events via HTTP
    agent-bridge serve --port 9222
    curl -X POST http://localhost:9222/events -H 'Content-Type: application/json' \\
      -d '{"type":"tool:started","agentId":"my-agent","payload":{"toolName":"read_file"}}'

  Then open:
    http://localhost:3100/agents?source=local
`);
}

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------

interface CliArgs {
  adapter: string | null;
  port: number;
  stdin: boolean;
  open: boolean;
  help: boolean;
  agentArgs: string[];
}

function parseArgs(argv: string[]): CliArgs {
  const result: CliArgs = {
    adapter: null,
    port: 9222,
    stdin: false,
    open: false,
    help: false,
    agentArgs: [],
  };

  const args = argv.slice(2); // skip node + script
  let i = 0;
  let pastSeparator = false;

  while (i < args.length) {
    if (pastSeparator) {
      result.agentArgs.push(args[i]);
      i++;
      continue;
    }

    const arg = args[i];
    if (arg === '--') {
      pastSeparator = true;
      i++;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      result.help = true;
      i++;
      continue;
    }
    if (arg === '--stdin') {
      result.stdin = true;
      i++;
      continue;
    }
    if (arg === '--open') {
      result.open = true;
      i++;
      continue;
    }
    if (arg === '--port' && i + 1 < args.length) {
      result.port = parseInt(args[i + 1], 10) || 9222;
      i += 2;
      continue;
    }
    // First positional arg = adapter name
    if (!result.adapter && !arg.startsWith('-')) {
      result.adapter = arg.toLowerCase();
      i++;
      continue;
    }
    // Unknown flag — pass to agent
    result.agentArgs.push(arg);
    i++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const cli = parseArgs(process.argv);

  if (cli.help || (!cli.adapter && !cli.stdin)) {
    printHelp();
    process.exit(cli.help ? 0 : 1);
  }

  const server = new BridgeServer();

  // Graceful shutdown
  const shutdown = () => {
    console.error('\n[bridge] Shutting down...');
    server.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start server
  await server.start(cli.port);
  console.error(`[bridge] WebSocket server listening on ws://localhost:${cli.port}`);
  console.error(`[bridge] Open visualization: http://localhost:3100/agents?source=local`);

  if (cli.open) {
    const { exec } = await import('node:child_process');
    const url = `http://localhost:3100/agents?source=local`;
    // Cross-platform open
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} ${url}`);
  }

  // Server-only mode
  if (cli.adapter === 'serve') {
    console.error(`[bridge] Server-only mode. POST events to http://localhost:${cli.port}/events`);
    // Keep process alive
    await new Promise(() => {});
    return;
  }

  // Run the adapter
  const adapterName = cli.adapter || 'generic';
  const adapterFn = ADAPTERS[adapterName];
  if (!adapterFn) {
    console.error(`[bridge] Unknown adapter: ${adapterName}`);
    console.error(`[bridge] Available: ${Object.keys(ADAPTERS).join(', ')}, serve`);
    process.exit(1);
  }

  console.error(`[bridge] Starting ${adapterName} adapter...`);

  try {
    await adapterFn({
      broadcast: server.broadcast,
      args: cli.agentArgs,
      stdin: cli.stdin,
    });
  } catch (err) {
    console.error(`[bridge] Adapter error:`, err);
    process.exit(1);
  }

  // Adapter finished (agent process exited) — keep server alive briefly
  // so the visualization can show the final state
  console.error('[bridge] Agent process finished. Server still running (Ctrl+C to quit).');
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('[bridge] Fatal error:', err);
  process.exit(1);
});
