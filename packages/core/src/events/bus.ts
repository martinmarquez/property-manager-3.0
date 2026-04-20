/**
 * Domain event bus with at-least-once delivery via Redis Streams.
 *
 * Delivery guarantee:
 *   1. Event is persisted to a Redis Stream (XADD) before any handler runs.
 *   2. Handlers are invoked; each handler ACKs (XACK) its own consumer group
 *      entry after successful completion.
 *   3. If the process crashes between XADD and XACK the stream retains the
 *      entry and a recovery sweep can replay it.
 *
 * In-process subscriptions are registered per event type. This supports the
 * pattern where workers subscribe via the event bus rather than polling queues
 * directly (AI chunk upsert, portal sync triggers, SLA timer updates).
 */

import type { Redis } from "ioredis";
import type {
  DomainEvent,
  DomainEventByType,
  DomainEventType,
} from "./types.js";

export type EventHandler<T extends DomainEventType> = (
  event: DomainEventByType<T>
) => Promise<void>;

interface Subscription<T extends DomainEventType> {
  type: T;
  handler: EventHandler<T>;
}

/** Redis stream key prefix for domain events. */
const STREAM_PREFIX = "events:";

/** Consumer group used by all in-process subscribers for replay / ACK. */
const CONSUMER_GROUP = "corredor-handlers";

export interface EventBusOptions {
  /** ioredis client. Required for at-least-once delivery. */
  redis: Redis;
  /**
   * Maximum number of events to keep per stream (approximate MAXLEN cap).
   * @default 10_000
   */
  streamMaxLen?: number;
  /**
   * When true the bus emits events in-process only and does NOT persist to
   * Redis. Useful for unit tests where a live Redis is not available.
   * @default false
   */
  inMemoryOnly?: boolean;
}

export class EventBus {
  private readonly redis: Redis;
  private readonly streamMaxLen: number;
  private readonly inMemoryOnly: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly subscriptions = new Map<DomainEventType, Array<Subscription<any>>>();

  constructor(opts: EventBusOptions) {
    this.redis = opts.redis;
    this.streamMaxLen = opts.streamMaxLen ?? 10_000;
    this.inMemoryOnly = opts.inMemoryOnly ?? false;
  }

  /**
   * Subscribe to a specific event type. Multiple handlers per type are
   * supported — all are invoked (sequentially) on each emit.
   */
  subscribe<T extends DomainEventType>(
    type: T,
    handler: EventHandler<T>
  ): () => void {
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, []);
    }
    const sub: Subscription<T> = { type, handler };
    this.subscriptions.get(type)!.push(sub);

    // Return an unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(type);
      if (handlers) {
        const idx = handlers.indexOf(sub);
        if (idx !== -1) handlers.splice(idx, 1);
      }
    };
  }

  /**
   * Emit a domain event.
   *
   * Steps:
   *   1. Persist to Redis Stream (at-least-once guarantee).
   *   2. Invoke all registered in-process handlers.
   *   3. ACK the stream entry after all handlers complete successfully.
   *
   * If a handler throws the error is re-thrown after all other handlers have
   * been given a chance to run. The stream entry is NOT acked on failure so
   * a recovery sweep can replay it.
   */
  async emit(event: DomainEvent): Promise<void> {
    const streamKey = `${STREAM_PREFIX}${event.type}`;
    let streamId: string | undefined;

    if (!this.inMemoryOnly) {
      // 1. Persist to Redis Stream before invoking handlers
      streamId = await this.redis.xadd(
        streamKey,
        "MAXLEN",
        "~",
        String(this.streamMaxLen),
        "*", // auto-ID
        "type",
        event.type,
        "payload",
        JSON.stringify(event.payload),
        "emittedAt",
        new Date().toISOString()
      ) as string;
    }

    // 2. Invoke in-process handlers
    const handlers = this.subscriptions.get(event.type) ?? [];
    const errors: Error[] = [];

    for (const sub of handlers) {
      try {
        await sub.handler(event as DomainEventByType<typeof event.type>);
      } catch (err) {
        errors.push(err instanceof Error ? err : new Error(String(err)));
      }
    }

    // 3. ACK the stream entry if all handlers succeeded
    if (!this.inMemoryOnly && streamId && errors.length === 0) {
      try {
        // Ensure consumer group exists (idempotent)
        await this.ensureConsumerGroup(streamKey);
        await this.redis.xack(streamKey, CONSUMER_GROUP, streamId);
      } catch {
        // ACK failure is non-fatal — the stream entry will be replayed
      }
    }

    if (errors.length > 0) {
      // Re-throw first error; others are logged inline in production via Sentry
      throw errors[0];
    }
  }

  private async ensureConsumerGroup(streamKey: string): Promise<void> {
    try {
      await this.redis.xgroup(
        "CREATE",
        streamKey,
        CONSUMER_GROUP,
        "0",
        "MKSTREAM"
      );
    } catch (err) {
      // BUSYGROUP means the group already exists — that's fine
      if (!(err instanceof Error && err.message.includes("BUSYGROUP"))) {
        throw err;
      }
    }
  }

  /** Returns the number of registered handlers for a given event type. */
  handlerCount(type: DomainEventType): number {
    return this.subscriptions.get(type)?.length ?? 0;
  }
}
