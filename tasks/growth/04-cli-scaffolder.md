# Task 04: CLI Scaffolder — `npx create-swarming-app`

## Goal
Build a CLI tool that scaffolds a working swarming visualization project in under 30 seconds. This is the "instant gratification" moment that converts a curious developer into a star.

## Context
The fastest-growing tools (Vite, Next.js, shadcn) all have CLI scaffolders. The first experience must be: run one command, see something incredible, start customizing.

## Requirements

### 1. Usage
```bash
# Interactive mode
npx create-swarming-app

# Direct mode
npx create-swarming-app my-viz --template websocket --framework next

# Minimal mode
npx create-swarming-app my-viz --template static
```

### 2. Interactive Prompts
```
? Project name: my-visualization
? Template:
  ❯ Static data (fastest start)
    WebSocket stream
    Blockchain (Solana)
    Blockchain (Ethereum/Base)
    Kubernetes monitoring
    Custom provider
? Framework:
  ❯ Next.js
    Vite + React
    Vanilla (CDN script tag)
? Include example data? (Y/n)
? Initialize git? (Y/n)
```

### 3. Templates

#### `static` — Zero dependencies beyond swarming
```
my-viz/
├── src/
│   ├── App.tsx
│   └── data.json          # 50-node sample dataset
├── package.json
├── vite.config.ts
└── README.md
```

#### `websocket` — Generic WebSocket consumer
```
my-viz/
├── src/
│   ├── App.tsx
│   ├── provider.ts         # WebSocket provider skeleton
│   └── server.ts           # Mock WebSocket server (for dev)
├── package.json
└── README.md
```

#### `blockchain-solana` — PumpFun live demo
```
my-viz/
├── src/
│   ├── App.tsx
│   ├── SolanaProvider.ts
│   └── config.ts
├── package.json
└── README.md
```

#### `blockchain-evm` — Ethereum/Base live demo
Same structure with EVM provider.

#### `kubernetes` — K8s pod visualization
```
my-viz/
├── src/
│   ├── App.tsx
│   ├── K8sProvider.ts      # kubectl proxy consumer
│   └── pod-colors.ts       # Color by namespace/status
├── package.json
└── README.md
```

### 4. Post-Scaffold Experience
After scaffolding, print:
```
✔ Created my-viz

  cd my-viz
  npm install
  npm run dev

  Open http://localhost:3000 to see your visualization.

  Next steps:
  → Edit src/App.tsx to customize
  → Read the docs: https://swarming.dev/docs
  → Join Discord: https://discord.gg/swarming

  ⭐ Star us on GitHub: https://github.com/swarming-vis/swarming
```

### 5. Technical Implementation
- Use `prompts` or `clack` for interactive CLI (clack is prettier)
- Use `degit` or inline template copying (no git clone)
- Templates stored in `packages/create-swarming-app/templates/`
- Replace placeholders (`{{PROJECT_NAME}}`, `{{PACKAGE_VERSION}}`) at scaffold time
- Detect package manager (npm/yarn/pnpm/bun) and use appropriate commands
- Total CLI package size: <2MB (fast npx execution)

### 6. Package
- Publish as `create-swarming-app` on npm
- `bin` field in package.json points to built CLI
- Bundle with `tsup` to single file

## Files to Create
```
packages/create-swarming-app/
├── src/
│   ├── index.ts            # CLI entry point
│   ├── prompts.ts          # Interactive prompts
│   ├── scaffold.ts         # File creation logic
│   └── utils.ts            # Package manager detection, etc.
├── templates/
│   ├── static/
│   ├── websocket/
│   ├── blockchain-solana/
│   ├── blockchain-evm/
│   └── kubernetes/
├── package.json
├── tsconfig.json
└── tsup.config.ts
```
