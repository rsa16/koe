import { createHmac } from "node:crypto";
import type { DomainEvent, EventBus, WebhookSubscription } from "@koe/core";

export const WEBHOOK_SIGNATURE_HEADER = "x-koe-signature";
export const WEBHOOK_EVENT_HEADER = "x-koe-event";
export const WEBHOOK_DELIVERY_HEADER = "x-koe-delivery";
export const DEFAULT_WEBHOOK_TIMEOUT_MS = 10_000;

/** Structural subset of `fetch` so delivery can be injected in tests. */
export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  }
) => Promise<{ ok: boolean; status: number }>;

export interface WebhookDispatcherOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  onError?: (
    error: unknown,
    subscription: WebhookSubscription,
    event: DomainEvent
  ) => void;
}

export interface WebhookDispatcher {
  /** Test/instrumentation helper: resolves once every in-flight delivery settles. */
  flush(): Promise<void>;
  /** Detaches the dispatcher from the bus. */
  stop(): void;
}

/** Computes the `sha256=<hex>` HMAC signature over a raw webhook body. */
export function signPayload(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

async function deliver(
  fetchImpl: FetchLike,
  subscription: WebhookSubscription,
  event: DomainEvent,
  timeoutMs: number
): Promise<void> {
  const body = JSON.stringify(event);
  const response = await fetchImpl(subscription.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "koe-webhooks/0.1",
      [WEBHOOK_EVENT_HEADER]: event.type,
      [WEBHOOK_DELIVERY_HEADER]: event.id,
      [WEBHOOK_SIGNATURE_HEADER]: signPayload(subscription.secret, body),
    },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(
      `Webhook delivery to ${subscription.url} failed with status ${response.status}`
    );
  }
}

/**
 * Listens on the event bus and POSTs HMAC-signed payloads to every active
 * subscription that names the emitted event. Deliveries are fire-and-forget so
 * a slow or failing subscriber never blocks the originating request.
 */
export function createWebhookDispatcher(
  bus: EventBus,
  subscriptions: WebhookSubscription[],
  options: WebhookDispatcherOptions = {}
): WebhookDispatcher {
  const fetchImpl: FetchLike = options.fetchImpl ?? (fetch as FetchLike);
  const timeoutMs = options.timeoutMs ?? DEFAULT_WEBHOOK_TIMEOUT_MS;
  const inflight = new Set<Promise<void>>();

  const off = bus.on((event) => {
    for (const subscription of subscriptions) {
      if (!subscription.active || !subscription.events.includes(event.type)) {
        continue;
      }

      const delivery = deliver(fetchImpl, subscription, event, timeoutMs).catch(
        (error) => options.onError?.(error, subscription, event)
      );
      const tracked = delivery.finally(() => inflight.delete(tracked));
      inflight.add(tracked);
    }
  });

  return {
    async flush() {
      while (inflight.size > 0) {
        await Promise.allSettled([...inflight]);
      }
    },
    stop() {
      off();
    },
  };
}
