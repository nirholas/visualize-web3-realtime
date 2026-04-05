import { defineConfig } from 'tsup';

export default defineConfig([
  // UMD bundle — exposes window.Swarming, includes React/Three/R3F
  {
    entry: { swarming: 'src/umd.ts' },
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
      options.footer = {
        js: `if(typeof Swarming!=="undefined"&&Swarming.default){Object.assign(Swarming,Swarming.default)}`,
      };
    },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  },
  // ESM bundle — for <script type="module"> and bundler consumers
  {
    entry: { swarming: 'src/umd.ts' },
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
    bundle: true,
    sourcemap: true,
    dts: true,
    treeshake: true,
    esbuildOptions(options) {
      options.jsx = 'automatic';
    },
  },
]);
