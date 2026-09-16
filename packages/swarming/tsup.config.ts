import { defineConfig } from 'tsup';

export default defineConfig([
  // UMD bundle — exposes window.Swarming, includes React/Three/R3F
  {
    entry: { swarming: 'src/global.ts' },
    format: ['iife'],
    globalName: 'Swarming',
    outDir: 'dist',
    outExtension: () => ({ js: '.umd.js' }),
    platform: 'browser',
    target: 'es2020',
    noExternal: [/.*/],
    bundle: true,
    clean: true,
    minify: true,
    sourcemap: true,
    treeshake: true,
    esbuildOptions(options) {
      options.jsx = 'automatic';
    },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  },
  // ESM bundle — for <script type="module"> and bundler consumers
  {
    entry: { swarming: 'src/index.ts' },
    format: ['esm'],
    outDir: 'dist',
    outExtension: () => ({ js: '.mjs' }),
    platform: 'browser',
    target: 'es2020',
    external: [
      'react',
      'react-dom',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'postprocessing',
    ],
    // @web3viz/* are private workspace packages that are never published, so
    // they are compiled into the bundle and its type declarations.
    noExternal: [/^@web3viz\//],
    bundle: true,
    sourcemap: true,
    dts: { resolve: [/^@web3viz\//], compilerOptions: { rootDir: '../..', composite: false } },
    treeshake: true,
    esbuildOptions(options) {
      options.jsx = 'automatic';
    },
  },
]);
