/**
 * Global Vitest setup — mocks heavyweight infrastructure packages that aren't
 * available in the unit-test environment (no real Postgres, Redis, or OTel
 * collector). All tests in apps/api inherit these mocks via vitest.config.ts
 * `setupFiles`.
 */
import { vi } from 'vitest';

// @opentelemetry/api — used by packages/core/src/workers/base.ts.
// Not resolvable by Vite in this monorepo without installing the full SDK,
// so we stub the trace API with no-op implementations.
vi.mock('@opentelemetry/api', () => {
  const noopSpan = {
    setAttribute: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
  };
  return {
    trace: {
      getTracer: vi.fn(() => ({
        startActiveSpan: vi.fn((_name: string, fn: (span: typeof noopSpan) => unknown) =>
          fn(noopSpan),
        ),
      })),
    },
    SpanStatusCode: { OK: 'OK', ERROR: 'ERROR', UNSET: 'UNSET' },
  };
});

// bullmq — also pulled in by workers/base.ts; not needed in unit tests.
vi.mock('bullmq', () => ({
  Worker: vi.fn(),
}));
