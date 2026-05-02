import { defineConfig } from 'vitest/config';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const otelApiPath = require.resolve('@opentelemetry/api');

export default defineConfig({
  resolve: {
    alias: {
      // @opentelemetry/api exports don't include 'import' condition for Vite
      // Resolve to the absolute CJS build path
      '@opentelemetry/api': otelApiPath,
    },
  },
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        '**/index.ts',
        '**/*.d.ts',
        '**/types.ts',
        '**/*.test.ts',
        'src/analytics/**',
        'src/rag/embedder.ts',
        'src/rag/retrieve.ts',
        'src/contacts/dsr.ts',
        'src/contacts/csv-parser.ts',
        'src/middleware/**',
        'src/inbox/**',
        'src/inquiries/**',
      ],
    },
  },
});
