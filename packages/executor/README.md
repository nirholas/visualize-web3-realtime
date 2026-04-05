# @web3viz/executor

> **⚠️ BROKEN BUILD** — This package has a missing `ws` dependency and is excluded from `npm run build` / `tsc --noEmit`. Do **not** include it in turbo build pipelines.

Agent execution layer using `ClaudeAgentClient`. Connects to the main app via WebSocket proxy at `/api/executor/`.

## Status

- Missing `ws` peer dependency — `npm install` in root doesn't install it
- Excluded from root `tsconfig.json`
- Use `npm run dev:executor` to run standalone (requires manual `npm install` in this directory first)

## To Fix

```bash
cd packages/executor
npm install ws @types/ws
```
