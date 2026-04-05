#!/usr/bin/env node

// ============================================================================
// create-swarming-plugin — Plugin scaffolder
//
// Usage: npx create-swarming-plugin my-plugin
// ============================================================================

import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PLUGIN_TYPES = ['source', 'theme', 'renderer'] as const;

function main() {
  const args = process.argv.slice(2);
  const name = args[0];

  if (!name || name.startsWith('-')) {
    console.log(`
  Usage: npx create-swarming-plugin <name> [--type source|theme|renderer]

  Options:
    --type    Plugin type (default: source)

  Examples:
    npx create-swarming-plugin my-data-source
    npx create-swarming-plugin my-theme --type theme
    npx create-swarming-plugin my-renderer --type renderer
`);
    process.exit(name === '--help' || name === '-h' ? 0 : 1);
  }

  const typeIdx = args.indexOf('--type');
  const type = typeIdx !== -1 ? args[typeIdx + 1] : 'source';
  if (!PLUGIN_TYPES.includes(type as typeof PLUGIN_TYPES[number])) {
    console.error(`Invalid plugin type: ${type}. Must be one of: ${PLUGIN_TYPES.join(', ')}`);
    process.exit(1);
  }

  const dir = resolve(process.cwd(), name);

  if (existsSync(dir)) {
    console.error(`Directory "${name}" already exists.`);
    process.exit(1);
  }

  console.log(`\n  Creating swarming ${type} plugin: ${name}\n`);

  // Create directory structure
  mkdirSync(join(dir, 'src'), { recursive: true });
  mkdirSync(join(dir, 'dev'), { recursive: true });

  // Determine npm keyword
  const keyword = type === 'theme' ? 'swarming-theme' : type === 'renderer' ? 'swarming-renderer' : 'swarming-plugin';
  const packageName = name.startsWith('swarming-') ? name : `swarming-${type === 'source' ? 'plugin' : type}-${name}`;

  // package.json
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: packageName,
        version: '0.1.0',
        description: `Swarming ${type} plugin`,
        main: './src/index.ts',
        types: './src/index.ts',
        keywords: ['swarming', keyword, type],
        license: 'MIT',
        peerDependencies: {
          '@web3viz/core': '>=0.1.0',
        },
        devDependencies: {
          '@web3viz/core': '*',
          typescript: '^5.5.0',
        },
      },
      null,
      2,
    ) + '\n',
  );

  // tsconfig.json
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          esModuleInterop: true,
          jsx: 'react-jsx',
          declaration: true,
          outDir: 'dist',
          rootDir: 'src',
        },
        include: ['src'],
      },
      null,
      2,
    ) + '\n',
  );

  // Source plugin template
  if (type === 'source') {
    writeFileSync(
      join(dir, 'src', 'index.ts'),
      `import { definePlugin } from '@web3viz/core/plugin';

export interface ${toPascal(name)}Config {
  /** WebSocket or API URL */
  url: string;
}

export const ${toCamel(name)} = definePlugin<${toPascal(name)}Config>({
  name: '${packageName}',
  type: 'source',
  meta: {
    description: 'TODO: describe your plugin',
    author: 'TODO: your name',
    tags: [],
  },
  config: {
    url: { type: 'string', label: 'API URL', required: true },
  },
  sourceConfig: {
    id: '${name}',
    label: '${toPascal(name)}',
    color: '#60a5fa',
    icon: '\\u26A1',
    description: 'TODO: short description',
  },
  categories: [
    { id: '${name}Events', label: '${toPascal(name)} Events', icon: '\\u26A1', color: '#60a5fa', sourceId: '${name}' },
  ],
  createProvider: {
    connect(config, emit) {
      // TODO: implement your data source connection
      // Use config.url to connect, call emit() for each event
      console.log('Connecting to', config.url);

      const interval = setInterval(() => {
        emit({
          id: \`\${name}-\${Date.now()}\`,
          providerId: '${name}',
          category: '${name}Events',
          chain: '${name}',
          timestamp: Date.now(),
          label: 'Sample event',
          address: '0x0000000000000000000000000000000000000000',
        });
      }, 1000);

      return () => clearInterval(interval);
    },
  },
});

export default ${toCamel(name)};
`,
    );
  } else if (type === 'theme') {
    writeFileSync(
      join(dir, 'src', 'index.ts'),
      `import { definePlugin } from '@web3viz/core/plugin';

export const ${toCamel(name)} = definePlugin({
  name: '${packageName}',
  type: 'theme',
  meta: {
    description: 'TODO: describe your theme',
    author: 'TODO: your name',
    tags: ['theme'],
  },
  theme: {
    background: '#0a0a0f',
    nodeColors: ['#818cf8', '#b6509e', '#00d395', '#00b3ff'],
    edgeColor: 'rgba(129, 140, 248, 0.12)',
    agentColor: '#7dd3fc',
    bloomStrength: 1.2,
    bloomRadius: 0.75,
    fontFamily: 'monospace',
  },
});

export default ${toCamel(name)};
`,
    );
  } else {
    writeFileSync(
      join(dir, 'src', 'index.ts'),
      `import { definePlugin } from '@web3viz/core/plugin';

export const ${toCamel(name)} = definePlugin({
  name: '${packageName}',
  type: 'renderer',
  meta: {
    description: 'TODO: describe your renderer',
    author: 'TODO: your name',
    tags: ['renderer'],
  },
  renderer: {
    renderNode(node, ctx) {
      // Return a React element to replace the default node rendering
      // Return null to use the default
      return null;
    },
    renderEdge(edge, ctx) {
      // Return a React element to replace the default edge rendering
      // Return null to use the default
      return null;
    },
  },
});

export default ${toCamel(name)};
`,
    );
  }

  // Dev playground
  writeFileSync(
    join(dir, 'dev', 'playground.tsx'),
    `/**
 * Local development playground.
 *
 * This file is NOT shipped with the published package.
 * Use it to test your plugin during development.
 */

// import { SwarmingProvider } from '@web3viz/react-graph';
// import { ${toCamel(name)} } from '../src';
//
// export default function Playground() {
//   return (
//     <SwarmingProvider plugins={[${toCamel(name)}(${type === 'source' ? "{ url: 'ws://localhost:8080' }" : ''})]}>
//       {/* Your visualization component here */}
//     </SwarmingProvider>
//   );
// }
`,
  );

  console.log(`  Created ${dir}/`);
  console.log(`    src/index.ts        Plugin definition`);
  console.log(`    dev/playground.tsx   Local dev harness`);
  console.log(`    package.json`);
  console.log(`    tsconfig.json`);
  console.log(`\n  Next steps:`);
  console.log(`    cd ${name}`);
  console.log(`    npm install`);
  console.log(`    # Edit src/index.ts to implement your plugin`);
  console.log(`    npm publish  # When ready to share\n`);
}

function toPascal(s: string): string {
  return s
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, '');
}

function toCamel(s: string): string {
  const p = toPascal(s);
  return p[0].toLowerCase() + p.slice(1);
}

main();
