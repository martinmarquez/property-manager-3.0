import { defineConfig } from 'vitest/config';

/** Base vitest config — extend in each package */
export function baseVitestConfig(options = {}) {
  return defineConfig({
    test: {
      globals: true,
      environment: 'node',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.*'],
      },
      ...options,
    },
  });
}

/** Web vitest config (jsdom environment) */
export function webVitestConfig(options = {}) {
  return baseVitestConfig({
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    ...options,
  });
}
