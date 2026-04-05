import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: true,
  external: ['react', 'react-dom', 'three', '@swarming/engine'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
