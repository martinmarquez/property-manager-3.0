import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventBus } from "./bus.js";
import type { DomainEvent } from "./types.js";

// ---------------------------------------------------------------------------
// Mock Redis
// ---------------------------------------------------------------------------

function makeMockRedis() {
  return {
    xadd: vi.fn().mockResolvedValue("1234567890-0"),
    xgroup: vi.fn().mockResolvedValue("OK"),
    xack: vi.fn().mockResolvedValue(1),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EventBus", () => {
  let mockRedis: ReturnType<typeof makeMockRedis>;

  beforeEach(() => {
    mockRedis = makeMockRedis();
  });

  describe("subscribe + emit (in-memory mode)", () => {
    it("invokes a registered handler when event is emitted", async () => {
      const bus = new EventBus({ redis: mockRedis as never, inMemoryOnly: true });
      const handler = vi.fn().mockResolvedValue(undefined);

      bus.subscribe("property.created", handler);

      const event: DomainEvent = {
        type: "property.created",
        payload: { tenantId: "t1", propertyId: "p1", userId: "u1" },
      };

      await bus.emit(event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it("invokes multiple handlers for the same event type", async () => {
      const bus = new EventBus({ redis: mockRedis as never, inMemoryOnly: true });
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      bus.subscribe("lead.created", handler1);
      bus.subscribe("lead.created", handler2);

      const event: DomainEvent = {
        type: "lead.created",
        payload: { tenantId: "t1", leadId: "l1", userId: "u1" },
      };

      await bus.emit(event);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it("does NOT invoke handler for a different event type", async () => {
      const bus = new EventBus({ redis: mockRedis as never, inMemoryOnly: true });
      const handler = vi.fn().mockResolvedValue(undefined);

      bus.subscribe("contact.created", handler);

      await bus.emit({
        type: "property.created",
        payload: { tenantId: "t1", propertyId: "p1", userId: "u1" },
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("unsubscribe removes the handler", async () => {
      const bus = new EventBus({ redis: mockRedis as never, inMemoryOnly: true });
      const handler = vi.fn().mockResolvedValue(undefined);

      const unsubscribe = bus.subscribe("user.created", handler);
      unsubscribe();

      await bus.emit({
        type: "user.created",
        payload: { tenantId: "t1", userId: "u1" },
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("handlerCount reflects subscription state", () => {
      const bus = new EventBus({ redis: mockRedis as never, inMemoryOnly: true });

      expect(bus.handlerCount("listing.published")).toBe(0);

      const unsub = bus.subscribe("listing.published", vi.fn().mockResolvedValue(undefined));
      expect(bus.handlerCount("listing.published")).toBe(1);

      unsub();
      expect(bus.handlerCount("listing.published")).toBe(0);
    });

    it("re-throws first error when a handler fails", async () => {
      const bus = new EventBus({ redis: mockRedis as never, inMemoryOnly: true });
      const error = new Error("handler exploded");
      const failingHandler = vi.fn().mockRejectedValue(error);

      bus.subscribe("inbox.message_received", failingHandler);

      await expect(
        bus.emit({
          type: "inbox.message_received",
          payload: { tenantId: "t1", threadId: "th1", messageId: "m1", channel: "email" },
        })
      ).rejects.toThrow("handler exploded");
    });

    it("invokes all handlers even if the first one fails", async () => {
      const bus = new EventBus({ redis: mockRedis as never, inMemoryOnly: true });
      const failingHandler = vi.fn().mockRejectedValue(new Error("fail"));
      const successHandler = vi.fn().mockResolvedValue(undefined);

      bus.subscribe("document.signed", failingHandler);
      bus.subscribe("document.signed", successHandler);

      const event: DomainEvent = {
        type: "document.signed",
        payload: { tenantId: "t1", documentId: "d1", signerId: "s1", signedAt: "2026-04-20T00:00:00Z" },
      };

      await expect(bus.emit(event)).rejects.toThrow();
      expect(successHandler).toHaveBeenCalledOnce();
    });
  });

  describe("at-least-once delivery (Redis mode)", () => {
    it("persists event to Redis stream before invoking handlers", async () => {
      const bus = new EventBus({ redis: mockRedis as never, inMemoryOnly: false });
      const handler = vi.fn().mockResolvedValue(undefined);

      bus.subscribe("property.created", handler);

      const event: DomainEvent = {
        type: "property.created",
        payload: { tenantId: "t1", propertyId: "p1", userId: "u1" },
      };

      await bus.emit(event);

      // xadd should have been called before handler
      expect(mockRedis.xadd).toHaveBeenCalledOnce();
      const xaddOrder = mockRedis.xadd.mock.invocationCallOrder[0];
      const handlerOrder = handler.mock.invocationCallOrder[0];
      expect(xaddOrder).toBeDefined();
      expect(handlerOrder).toBeDefined();
      expect(xaddOrder!).toBeLessThan(handlerOrder!);
    });

    it("ACKs the stream entry after successful handler execution", async () => {
      const bus = new EventBus({ redis: mockRedis as never, inMemoryOnly: false });
      bus.subscribe("property.created", vi.fn().mockResolvedValue(undefined));

      await bus.emit({
        type: "property.created",
        payload: { tenantId: "t1", propertyId: "p1", userId: "u1" },
      });

      expect(mockRedis.xack).toHaveBeenCalledOnce();
      expect(mockRedis.xack).toHaveBeenCalledWith(
        "events:property.created",
        "corredor-handlers",
        "1234567890-0"
      );
    });

    it("does NOT ACK if handler fails (for replay recovery)", async () => {
      const bus = new EventBus({ redis: mockRedis as never, inMemoryOnly: false });
      bus.subscribe("property.created", vi.fn().mockRejectedValue(new Error("fail")));

      await expect(
        bus.emit({
          type: "property.created",
          payload: { tenantId: "t1", propertyId: "p1", userId: "u1" },
        })
      ).rejects.toThrow();

      expect(mockRedis.xack).not.toHaveBeenCalled();
    });

    it("persists event to Redis even when there are no handlers", async () => {
      const bus = new EventBus({ redis: mockRedis as never, inMemoryOnly: false });

      await bus.emit({
        type: "contact.deleted",
        payload: { tenantId: "t1", contactId: "c1", userId: "u1" },
      });

      expect(mockRedis.xadd).toHaveBeenCalledOnce();
    });
  });
});
