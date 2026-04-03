# index.ts - Executor Entry Point

**File Path:** `packages/executor/src/index.ts`

**Purpose:** Application entry point for the executor service. Reads configuration from environment variables, instantiates the `ExecutorServer`, registers OS signal handlers for graceful shutdown, and starts the server.

---

## Module Dependencies

| Import | Source | Description |
|--------|--------|-------------|
| `ExecutorServer` | `./ExecutorServer.js` | Main server class that orchestrates all executor subsystems |

---

## Line-by-Line Documentation

### Lines 1: Import

```typescript
import { ExecutorServer } from './ExecutorServer.js';
```

Imports the `ExecutorServer` class, which is the top-level orchestrator for the executor service. Uses `.js` extension for ESM compatibility.

### Lines 3-11: Configuration Object

```typescript
const config = {
  port: parseInt(process.env['EXECUTOR_PORT'] ?? '8765', 10),
  speraxosUrl: process.env['SPERAXOS_URL'] ?? 'https://api.speraxos.io',
  speraxosApiKey: process.env['SPERAXOS_API_KEY'] ?? '',
  maxAgents: parseInt(process.env['MAX_AGENTS'] ?? '5', 10),
  taskPollInterval: 1000,
  heartbeatInterval: 30_000,
  statePath: process.env['STATE_PATH'] ?? './data/executor.db',
};
```

Constructs an `ExecutorConfig` object by reading from environment variables with sensible defaults:

| Property | Env Variable | Default | Type | Description |
|----------|-------------|---------|------|-------------|
| `port` | `EXECUTOR_PORT` | `8765` | `number` | Port for HTTP/WebSocket server |
| `speraxosUrl` | `SPERAXOS_URL` | `https://api.speraxos.io` | `string` | SperaxOS API base URL |
| `speraxosApiKey` | `SPERAXOS_API_KEY` | `''` (empty, triggers mock mode) | `string` | API key for SperaxOS authentication |
| `maxAgents` | `MAX_AGENTS` | `5` | `number` | Maximum number of concurrent agents |
| `taskPollInterval` | N/A | `1000` | `number` | Milliseconds between task processing cycles |
| `heartbeatInterval` | N/A | `30_000` | `number` | Milliseconds between heartbeat broadcasts |
| `statePath` | `STATE_PATH` | `./data/executor.db` | `string` | File path for SQLite persistent state database |

### Line 13: Server Instantiation

```typescript
const executor = new ExecutorServer(config);
```

Creates a new `ExecutorServer` instance. This triggers construction of all subsystems (SperaxOSClient, TaskQueue, AgentManager, EventBroadcaster, HealthMonitor, StateStore) but does not start any of them.

### Lines 15-19: SIGINT Handler

```typescript
process.on('SIGINT', async () => {
  console.log('Shutting down executor...');
  await executor.stop();
  process.exit(0);
});
```

Registers a handler for `SIGINT` (Ctrl+C). Logs a shutdown message, gracefully stops the executor (clearing timers, closing WebSocket, closing database), then exits with code 0.

### Lines 21-24: SIGTERM Handler

```typescript
process.on('SIGTERM', async () => {
  await executor.stop();
  process.exit(0);
});
```

Registers a handler for `SIGTERM` (container/process manager shutdown signal). Performs the same graceful shutdown without the log message.

### Lines 26-31: Server Startup

```typescript
executor.start().then(() => {
  console.log(`Executor running on ws://localhost:${config.port}`);
}).catch((err) => {
  console.error('Executor failed to start:', err);
  process.exit(1);
});
```

Calls `executor.start()` which is an async method that:
1. Initializes the state store
2. Creates the HTTP server
3. Starts the WebSocket broadcaster on the same HTTP server
4. Spawns initial agents
5. Begins the task polling loop and heartbeat timer
6. Starts health monitoring

On success, logs the WebSocket URL. On failure, logs the error and exits with code 1.

---

## Exported Members

This module does not export any members. It is the application entry point.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXECUTOR_PORT` | No | `8765` | Server listen port |
| `SPERAXOS_URL` | No | `https://api.speraxos.io` | SperaxOS API endpoint |
| `SPERAXOS_API_KEY` | No | `''` | API key; empty triggers mock mode |
| `MAX_AGENTS` | No | `5` | Max concurrent agents |
| `STATE_PATH` | No | `./data/executor.db` | SQLite database path |

---

## Usage Example

```bash
# Start with defaults (mock mode, port 8765)
npx tsx packages/executor/src/index.ts

# Start with custom configuration
EXECUTOR_PORT=9000 \
SPERAXOS_URL=https://custom.api.io \
SPERAXOS_API_KEY=sk-abc123 \
MAX_AGENTS=10 \
STATE_PATH=/tmp/executor.db \
npx tsx packages/executor/src/index.ts
```
