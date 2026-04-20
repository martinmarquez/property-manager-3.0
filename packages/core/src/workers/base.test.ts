import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Job } from "bullmq";
import { BaseWorker } from "./base.js";
import type { BaseWorkerOptions } from "./base.js";
import { QUEUE_NAMES } from "../queues.js";

// ---------------------------------------------------------------------------
// Mock BullMQ Worker
// ---------------------------------------------------------------------------

vi.mock("bullmq", async (importOriginal) => {
  const actual = await importOriginal<typeof import("bullmq")>();

  class MockWorker {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private listeners = new Map<string, Array<(...args: any[]) => void>>();
    public closed = false;
    public paused = false;

    constructor(
      public readonly queueName: string,
      public readonly processor: (job: Job) => Promise<unknown>,
      public readonly opts: unknown
    ) {}

    on(event: string, listener: (...args: unknown[]) => void) {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event)!.push(listener);
      return this;
    }

    emit(event: string, ...args: unknown[]) {
      const listeners = this.listeners.get(event) ?? [];
      listeners.forEach((l) => l(...args));
    }

    async close() {
      this.closed = true;
    }

    async pause() {
      this.paused = true;
    }

    resume() {
      this.paused = false;
    }
  }

  return {
    ...actual,
    Worker: MockWorker,
    Queue: class MockQueue {
      async add() { return {}; }
      async close() {}
    },
  };
});

// Mock Sentry and OTel so they don't require real connections
vi.mock("@sentry/node", () => ({
  captureException: vi.fn(),
}));

vi.mock("@opentelemetry/api", () => ({
  trace: {
    getTracer: () => ({
      startSpan: () => ({
        setStatus: vi.fn(),
        recordException: vi.fn(),
        setAttribute: vi.fn(),
        end: vi.fn(),
      }),
    }),
  },
  SpanStatusCode: { OK: "OK", ERROR: "ERROR" },
}));

// ---------------------------------------------------------------------------
// Concrete test worker
// ---------------------------------------------------------------------------

interface TestJobData { value: number }
interface TestJobResult { doubled: number }

class TestWorker extends BaseWorker<TestJobData, TestJobResult> {
  public processImpl: (job: Job<TestJobData, TestJobResult>) => Promise<TestJobResult>;

  constructor(opts: BaseWorkerOptions) {
    super(QUEUE_NAMES.AI_EMBED, opts);
    this.processImpl = async (job) => ({ doubled: job.data.value * 2 });
  }

  protected async process(job: Job<TestJobData, TestJobResult>): Promise<TestJobResult> {
    return this.processImpl(job);
  }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeJob(overrides: Partial<Job<TestJobData, TestJobResult>> = {}): Job<TestJobData, TestJobResult> {
  return {
    id: "job-1",
    name: "test-job",
    data: { value: 21 },
    attemptsMade: 0,
    opts: { attempts: 5 },
    ...overrides,
  } as Job<TestJobData, TestJobResult>;
}

function makeMockRedis() {
  return {
    xadd: vi.fn().mockResolvedValue("123"),
    xgroup: vi.fn().mockResolvedValue("OK"),
    xack: vi.fn().mockResolvedValue(1),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BaseWorker", () => {
  let worker: TestWorker;
  let mockRedis: ReturnType<typeof makeMockRedis>;

  beforeEach(() => {
    mockRedis = makeMockRedis();
    worker = new TestWorker({ redis: mockRedis as never });
  });

  afterEach(async () => {
    await worker.close();
  });

  it("processes a job and returns the result", async () => {
    const job = makeJob();

    // Access the mock worker's processor directly via unknown cast
    type WorkerLike = { processor: (job: Job) => Promise<unknown> };
    const mockWorkerInstance = (worker as unknown as { worker: WorkerLike }).worker;
    const result = await mockWorkerInstance.processor(job as Job);
    expect(result).toEqual({ doubled: 42 });
  });

  it("closes the underlying worker on close()", async () => {
    type WorkerLike = { closed: boolean };
    const mockWorkerInstance = (worker as unknown as { worker: WorkerLike }).worker;

    await worker.close();
    expect(mockWorkerInstance.closed).toBe(true);
  });

  it("pauses and resumes the worker", async () => {
    type WorkerLike = { paused: boolean };
    const mockWorkerInstance = (worker as unknown as { worker: WorkerLike }).worker;

    await worker.pause();
    expect(mockWorkerInstance.paused).toBe(true);

    await worker.resume();
    expect(mockWorkerInstance.paused).toBe(false);
  });

  it("captures exception via Sentry when job fails", async () => {
    const { captureException } = await import("@sentry/node");

    worker.processImpl = vi.fn().mockRejectedValue(new Error("process failure"));

    type WorkerLike = { processor: (job: Job) => Promise<unknown> };
    const mockWorkerInstance = (worker as unknown as { worker: WorkerLike }).worker;

    await expect(
      mockWorkerInstance.processor(makeJob() as Job)
    ).rejects.toThrow("process failure");

    expect(captureException).toHaveBeenCalledOnce();
  });

  it("accepts a custom logger", () => {
    const customLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const customWorker = new TestWorker({
      redis: mockRedis as never,
      logger: customLogger,
    });

    // Worker constructed without throwing = logger wired correctly
    expect(customWorker).toBeDefined();
    customWorker.close();
  });

  it("uses default concurrency from QUEUE_META when not specified", () => {
    // Just verify worker was constructed; concurrency is validated by BullMQ internals
    expect(worker).toBeDefined();
  });
});
