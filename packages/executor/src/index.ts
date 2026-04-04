import { ExecutorServer } from './ExecutorServer.js';

const config = {
  port: parseInt(process.env['EXECUTOR_PORT'] ?? '8765', 10),
  speraxosUrl: process.env['SPERAXOS_URL'] ?? '',
  speraxosApiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
  maxAgents: parseInt(process.env['MAX_AGENTS'] ?? '5', 10),
  taskPollInterval: 1000,
  heartbeatInterval: 30_000,
  statePath: process.env['STATE_PATH'] ?? './data/executor.db',
};

const executor = new ExecutorServer(config);

process.on('SIGINT', async () => {
  console.log('Shutting down executor...');
  await executor.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await executor.stop();
  process.exit(0);
});

executor.start().then(() => {
  console.log(`Executor running on ws://localhost:${config.port}`);
}).catch((err) => {
  console.error('Executor failed to start:', err);
  process.exit(1);
});
