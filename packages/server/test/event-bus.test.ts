import { describe, it, expect, vi } from "vitest";
import { createEventBus, createWebhookDispatcher, signPayload } from "../src/events/index.js";
import type { DomainEvent } from "@koe/core";

describe("in-process event bus", () => {
  it("delivers an envelope with id, type, occurredAt and data", () => {
    const bus = createEventBus();
    const received: DomainEvent[] = [];
    bus.on((event) => received.push(event));

    bus.emit("comment.created", { comment: { id: "c1" } });

    expect(received).toHaveLength(1);
    expect(received[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(received[0].type).toBe("comment.created");
    expect(new Date(received[0].occurredAt).toString()).not.toBe("Invalid Date");
    expect(received[0].data).toEqual({ comment: { id: "c1" } });
  });

  it("fans out to every listener", () => {
    const bus = createEventBus();
    const first = vi.fn();
    const second = vi.fn();
    bus.on(first);
    bus.on(second);

    bus.emit("vote.created", { vote: { id: "v1" } });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("stops delivery after unsubscribing", () => {
    const bus = createEventBus();
    const listener = vi.fn();
    const off = bus.on(listener);

    off();
    bus.emit("reaction.created", { reaction: { id: "r1" } });

    expect(listener).not.toHaveBeenCalled();
  });

  it("isolates a throwing listener and reports it via onError", () => {
    const onError = vi.fn();
    const bus = createEventBus({ onError });
    const healthy = vi.fn();
    bus.on(() => {
      throw new Error("boom");
    });
    bus.on(healthy);

    bus.emit("report.created", { report: { id: "r1" } });

    expect(healthy).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("routes a rejected async listener to onError instead of unhandled rejection", async () => {
    const onError = vi.fn();
    const bus = createEventBus({ onError });
    bus.on(async () => {
      throw new Error("async boom");
    });

    bus.emit("user.banned", { user: { id: "u1" } });
    await new Promise((resolve) => setImmediate(resolve));

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("does not replay events emitted before a listener subscribes", () => {
    const bus = createEventBus();
    const listener = vi.fn();

    bus.emit("comment.created", { comment: { id: "c1" } });
    bus.on(listener);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("webhook dispatcher", () => {
  it("dispatches only to subscriptions whose event list matches", async () => {
    const bus = createEventBus();
    const delivered: string[] = [];
    const fetchImpl = async (url: string) => {
      delivered.push(url);
      return { ok: true, status: 200 };
    };
    const dispatcher = createWebhookDispatcher(
      bus,
      [
        { url: "https://example.test/comments", secret: "s1", events: ["comment.created"], active: true },
        { url: "https://example.test/reactions", secret: "s2", events: ["reaction.created"], active: true },
      ],
      { fetchImpl }
    );

    bus.emit("comment.created", { comment: { id: "c1" } });
    await dispatcher.flush();

    expect(delivered).toEqual(["https://example.test/comments"]);
  });

  it("skips inactive subscriptions", async () => {
    const bus = createEventBus();
    const fetchImpl = async () => ({ ok: true, status: 200 });
    let calls = 0;
    const dispatcher = createWebhookDispatcher(
      bus,
      [{ url: "https://example.test/off", secret: "s", events: ["comment.created"], active: false }],
      { fetchImpl: async () => { calls += 1; return fetchImpl(); } }
    );

    bus.emit("comment.created", { comment: { id: "c1" } });
    await dispatcher.flush();

    expect(calls).toBe(0);
  });

  it("reports a failed delivery via onError without rejecting flush", async () => {
    const bus = createEventBus();
    const onError = vi.fn();
    const dispatcher = createWebhookDispatcher(
      bus,
      [{ url: "https://example.test/fail", secret: "s", events: ["comment.created"], active: true }],
      { fetchImpl: async () => ({ ok: false, status: 500 }), onError }
    );

    bus.emit("comment.created", { comment: { id: "c1" } });
    await dispatcher.flush();

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("signs the raw body with HMAC SHA-256", () => {
    const signature = signPayload("top-secret", '{"hello":"world"}');
    expect(signature).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(signPayload("top-secret", '{"hello":"world"}')).toBe(signature);
    expect(signPayload("other", '{"hello":"world"}')).not.toBe(signature);
  });
});
