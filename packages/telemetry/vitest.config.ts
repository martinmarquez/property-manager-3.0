import { defineConfig } from 'vitest/config';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const otelApiPath = require.resolve('@opentelemetry/api');

export default defineConfig({
  resolve: {
    alias: {
      // @opentelemetry/api doesn't include 'import' condition for Vite/vitest.
      // Resolve to the absolute CJS build path to avoid dual-package hazard.
      '@opentelemetry/api': otelApiPath,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/browser.ts',
        'src/sentry-browser.ts',
        'src/posthog.ts',
        '**/*.d.ts',
      ],
    },
  },
});
