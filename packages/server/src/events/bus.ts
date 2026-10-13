import { randomUUID } from "node:crypto";
import type { DomainEvent, EventBus, EventListener, EventName } from "@koe/core";

export interface EventBusOptions {
  /** Invoked when a listener throws or rejects, so a bad subscriber can't take down the request path. */
  onError?: (error: unknown, event: DomainEvent) => void;
}

/**
 * Minimal in-process event emitter. `emit` is synchronous and fire-and-forget:
 * listener rejections are surfaced through `onError` rather than propagating
 * back into the domain service that emitted the event.
 */
export function createEventBus(options: EventBusOptions = {}): EventBus {
  const listeners = new Set<EventListener>();

  return {
    emit(type: EventName, data: Record<string, unknown>) {
      const event: DomainEvent = {
        id: randomUUID(),
        type,
        occurredAt: new Date().toISOString(),
        data,
      };

      for (const listener of [...listeners]) {
        try {
          const result = listener(event);
          if (result && typeof (result as Promise<void>).then === "function") {
            (result as Promise<void>).catch((error) =>
              options.onError?.(error, event)
            );
          }
        } catch (error) {
          options.onError?.(error, event);
        }
      }
    },

    on(listener: EventListener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
