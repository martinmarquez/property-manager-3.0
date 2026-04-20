import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    // Integration tests hit a real DB — give them room to breathe
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Load env vars before tests run
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    // Run integration tests serially to avoid RLS context collisions
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    // Coverage: collect but no hard thresholds — these are integration tests
    // that require a real DB; thresholds are enforced on unit-only packages.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/seed/**', 'src/migrations/**', '**/*.d.ts'],
    },
  },
});
