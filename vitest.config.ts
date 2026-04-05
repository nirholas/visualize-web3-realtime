import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@web3viz/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@web3viz/providers': path.resolve(__dirname, 'packages/providers/src/index.ts'),
      '@web3viz/react-graph': path.resolve(__dirname, 'packages/react-graph/src/index.ts'),
      '@web3viz/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
      '@web3viz/utils': path.resolve(__dirname, 'packages/utils/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'packages/*/src/**/*.test.{ts,tsx}',
      'features/**/*.test.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: [
        'packages/core/src/**',
        'packages/providers/src/**',
        'packages/utils/src/**',
        'features/World/utils/**',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/index.ts',
      ],
    },
  },
});
