import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // @opentelemetry/api is not hoisted to the workspace root — it lives in
      // packages/core/node_modules. Vite can't find it during static analysis,
      // so we point the alias directly at the CJS build that IS on disk.
      '@opentelemetry/api': resolve(
        __dirname,
        '../../packages/core/node_modules/@opentelemetry/api/build/src/index.js',
      ),
    },
  },
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    // Global stubs for bullmq and other infra deps pulled in transitively by
    // packages/core/src/workers/base.ts.
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        // Entry point wired by index.ts, covered by integration/e2e
        'src/index.ts',
        // Root router — just wires sub-routers, no testable logic
        'src/router.ts',
        // Env schema — Zod config, covered by startup smoke test
        'src/env.ts',
        // Auth router stub (login NOT_IMPLEMENTED until RENA-5)
        'src/routers/auth.ts',
        // tRPC health router — tested via Hono /health in health.test.ts;
        // tRPC-level coverage comes in Phase B e2e tests
        'src/routers/health.ts',
        // CSRF middleware covered by Phase B HTTP integration tests
        'src/middleware/csrf.ts',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
});
